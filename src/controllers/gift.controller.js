const Gift = require('../models/Gift');
const Redemption = require('../models/Redemption');

// @desc    Get all active gifts (with user's redemption count attached)
// @route   GET /api/gifts
// @access  Private (Any authenticated user)
exports.getGifts = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'manager'].includes(req.user.role);
    const filter = isAdmin ? {} : { isActive: true };
    const gifts = await Gift.find(filter).populate('merchant', 'name shopName email merchantQrId').sort('-createdAt');

    // For regular users, attach how many times they have redeemed each gift
    // (only count non-rejected redemptions)
    if (!isAdmin) {
      const userId = req.user._id;
      const userRedemptions = await Redemption.find({
        user: userId,
        status: { $ne: 'rejected' },
      }).select('gift');

      // Build a map: giftId -> count
      const countMap = {};
      for (const r of userRedemptions) {
        const gid = r.gift.toString();
        countMap[gid] = (countMap[gid] || 0) + 1;
      }

      const giftsWithCount = gifts.map((g) => ({
        ...g.toObject(),
        userRedemptionCount: countMap[g._id.toString()] || 0,
      }));

      return res.json({ success: true, count: giftsWithCount.length, gifts: giftsWithCount });
    }

    res.json({ success: true, count: gifts.length, gifts });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a gift
// @route   POST /api/gifts
// @access  Private/Admin
exports.createGift = async (req, res, next) => {
  try {
    const gift = await Gift.create(req.body);
    await gift.populate('merchant', 'name shopName email merchantQrId');
    res.status(201).json({ success: true, gift });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a gift
// @route   PUT /api/gifts/:id
// @access  Private/Admin
exports.updateGift = async (req, res, next) => {
  try {
    const gift = await Gift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('merchant', 'name shopName email merchantQrId');
    if (!gift) return res.status(404).json({ success: false, message: 'Gift not found' });
    res.json({ success: true, gift });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a gift
// @route   DELETE /api/gifts/:id
// @access  Private/Admin
exports.deleteGift = async (req, res, next) => {
  try {
    const gift = await Gift.findByIdAndDelete(req.params.id);
    if (!gift) return res.status(404).json({ success: false, message: 'Gift not found' });
    res.json({ success: true, message: 'Gift deleted successfully' });
  } catch (error) {
    next(error);
  }
};
