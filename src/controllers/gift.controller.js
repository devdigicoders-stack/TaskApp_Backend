const Gift = require('../models/Gift');

// @desc    Get all active gifts
// @route   GET /api/gifts
// @access  Private (Any authenticated user)
exports.getGifts = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const gifts = await Gift.find(filter).sort('-createdAt');
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
    });
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
