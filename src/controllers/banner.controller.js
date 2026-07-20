const Banner = require('../models/Banner');

// @desc    Get all active banners (public) or all banners (admin)
// @route   GET /api/banners
// @access  Private
exports.getBanners = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'manager'].includes(req.user.role);
    const filter = isAdmin ? {} : { isActive: true };
    const banners = await Banner.find(filter).sort('order createdAt');
    res.json({ success: true, count: banners.length, banners });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private/Admin
exports.createBanner = async (req, res, next) => {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json({ success: true, banner });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
exports.updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.json({ success: true, banner });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    next(error);
  }
};
