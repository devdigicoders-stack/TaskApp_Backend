const Redemption = require('../models/Redemption');
const Gift = require('../models/Gift');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const { messaging } = require('../config/firebase');

// @desc    Get user redemptions
// @route   GET /api/redemptions
// @access  Private
exports.getRedemptions = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'merchant') {
      const merchantGiftIds = await Gift.find({ merchant: req.user._id }).distinct('_id');
      filter = {
        $or: [
          { merchant: req.user._id },
          { gift: { $in: merchantGiftIds } },
        ],
      };
    } else if (!['admin', 'manager'].includes(req.user.role)) {
      filter = { user: req.user._id };
    }

    const redemptions = await Redemption.find(filter)
      .populate('user', 'name email mobileNumber')
      .populate({
        path: 'gift',
        select: 'name image requiredCoins merchant',
        populate: { path: 'merchant', select: 'name shopName email' },
      })
      .populate('merchant', 'name shopName email')
      .sort('-createdAt');
    res.json({ success: true, count: redemptions.length, redemptions });
  } catch (error) {
    next(error);
  }
};

// @desc    Request a redemption
// @route   POST /api/redemptions
// @access  Private
exports.createRedemption = async (req, res, next) => {
  try {
    const { giftId } = req.body;
    const gift = await Gift.findById(giftId);
    
    if (!gift || !gift.isActive) {
      return res.status(404).json({ success: false, message: 'Gift not found or inactive' });
    }

    const user = await User.findById(req.user._id);

    if (user.coins < gift.requiredCoins) {
      return res.status(400).json({ success: false, message: 'Not enough coins to redeem this gift' });
    }

    // Check per-user redemption limit (0 = unlimited)
    if (gift.maxRedemptionsPerUser > 0) {
      const userRedemptionCount = await Redemption.countDocuments({
        user: req.user._id,
        gift: giftId,
        status: { $ne: 'rejected' },
      });
      if (userRedemptionCount >= gift.maxRedemptionsPerUser) {
        return res.status(400).json({
          success: false,
          message: `You have already redeemed this gift ${gift.maxRedemptionsPerUser} time(s). Maximum limit reached.`,
        });
      }
    }

    // Deduct coins immediately
    user.coins -= gift.requiredCoins;
    await user.save();

    const redemption = await Redemption.create({
      user: req.user._id,
      gift: giftId,
      merchant: gift.merchant || null,
      status: 'pending',
    });

    // Record transaction in user's history (debit)
    await Transaction.create({
      user: req.user._id,
      amount: -gift.requiredCoins,
      type: 'gift_redemption',
      description: `Redeemed gift: ${gift.name}`,
    });

    res.status(201).json({ success: true, redemption, remainingCoins: user.coins });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject redemption (Admin)
// @route   PUT /api/redemptions/:id
// @access  Private/Admin
exports.updateRedemptionStatus = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body; // status: 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const redemption = await Redemption.findById(req.params.id)
      .populate('user')
      .populate('gift');

    if (!redemption) {
      return res.status(404).json({ success: false, message: 'Redemption request not found' });
    }

    if (req.user.role === 'merchant') {
      const isAssigned =
        (redemption.merchant && redemption.merchant.toString() === req.user._id.toString()) ||
        (redemption.gift && redemption.gift.merchant && redemption.gift.merchant.toString() === req.user._id.toString());
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'You are not authorized to update this redemption' });
      }
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Redemption is already resolved' });
    }

    redemption.status = status;
    redemption.adminNote = adminNote || '';
    redemption.resolvedAt = Date.now();
    redemption.resolvedBy = req.user._id;

    // If rejected, refund the coins
    if (status === 'rejected') {
      redemption.user.coins += redemption.gift.requiredCoins;
      await redemption.user.save();

      // Record refund transaction in user's history
      await Transaction.create({
        user: redemption.user._id,
        amount: redemption.gift.requiredCoins,
        type: 'gift_redemption_refund',
        description: `Refund for rejected redemption of ${redemption.gift.name}`,
      });
    }

    await redemption.save();

    // Send notification to user
    const title = status === 'approved' ? 'Gift Redeemed! 🎁' : 'Redemption Rejected ❌';
    const message = status === 'approved'
      ? `Your request for "${redemption.gift.name}" has been approved. Enjoy your gift!`
      : `Your request for "${redemption.gift.name}" was rejected. ${adminNote ? 'Reason: ' + adminNote : ''} Coins refunded.`;

    // Only use imageUrl in FCM if it's a real URL (not base64)
    const giftImage = redemption.gift.image || '';
    const isUrl = giftImage.startsWith('http://') || giftImage.startsWith('https://');

    await Notification.create({
      userId: redemption.user._id,
      title,
      message,
      image: isUrl ? giftImage : '',
    });

    if (redemption.user.fcmToken) {
      try {
        const fcmPayload = {
          token: redemption.user.fcmToken,
          notification: {
            title,
            body: message,
            ...(isUrl && { imageUrl: giftImage }),
          },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        };
        await messaging().send(fcmPayload);
      } catch (fcmErr) {
        console.error('FCM Error on redemption:', fcmErr.message);
      }
    }

    res.json({ success: true, redemption });
  } catch (error) {
    next(error);
  }
};
