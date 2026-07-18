const Redemption = require('../models/Redemption');
const Gift = require('../models/Gift');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { messaging } = require('../config/firebase');

// @desc    Get user redemptions
// @route   GET /api/redemptions
// @access  Private
exports.getRedemptions = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    const redemptions = await Redemption.find(filter)
      .populate('user', 'name email mobileNumber')
      .populate('gift', 'name image requiredCoins')
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

    // Deduct coins immediately
    user.coins -= gift.requiredCoins;
    await user.save();

    const redemption = await Redemption.create({
      user: req.user._id,
      gift: giftId,
      status: 'pending',
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
    }

    await redemption.save();

    // Send notification to user
    const title = status === 'approved' ? 'Gift Redeemed!' : 'Redemption Rejected';
    const message = status === 'approved'
      ? `Your request for ${redemption.gift.name} has been approved.`
      : `Your request for ${redemption.gift.name} was rejected. ${adminNote ? 'Reason: ' + adminNote : ''} Coins refunded.`;

    await Notification.create({
      title,
      message,
      userId: redemption.user._id,
      image: redemption.gift.image,
    });

    if (redemption.user.fcmToken) {
      try {
        await messaging().send({
          token: redemption.user.fcmToken,
          notification: { title, body: message, imageUrl: redemption.gift.image || undefined },
        });
      } catch (fcmErr) {
        console.error('FCM Error on redemption:', fcmErr.message);
      }
    }

    res.json({ success: true, redemption });
  } catch (error) {
    next(error);
  }
};
