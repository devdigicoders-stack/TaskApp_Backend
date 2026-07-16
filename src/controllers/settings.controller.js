const Settings = require('../models/Settings');

// @desc    Get all settings (admin)
// @route   GET /api/settings
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find({});
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public settings (user - coin rate only)
// @route   GET /api/settings/public
exports.getPublicSettings = async (req, res, next) => {
  try {
    const coinsPerInr = await Settings.get('coins_per_inr', 100);
    const minWithdrawalCoins = await Settings.get('min_withdrawal_coins', 100);
    res.json({ success: true, coinsPerInr, minWithdrawalCoins });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a setting (admin)
// @route   PUT /api/settings/:key
exports.updateSetting = async (req, res, next) => {
  try {
    const { value, description } = req.body;
    const setting = await Settings.set(req.params.key, value, description);
    res.json({ success: true, setting });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update settings (admin)
// @route   PUT /api/settings
exports.bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body; // [{ key, value, description }]
    const results = await Promise.all(
      settings.map((s) => Settings.set(s.key, s.value, s.description || ''))
    );
    res.json({ success: true, settings: results });
  } catch (error) {
    next(error);
  }
};
