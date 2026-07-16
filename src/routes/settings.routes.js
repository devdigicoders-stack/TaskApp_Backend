const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSettings,
  getPublicSettings,
  updateSetting,
  bulkUpdateSettings,
} = require('../controllers/settings.controller');

// Public (any logged in user can get rates)
router.get('/public', protect, getPublicSettings);

// Admin routes
router.get('/', protect, authorize('admin'), getSettings);
router.put('/', protect, authorize('admin'), bulkUpdateSettings);
router.put('/:key', protect, authorize('admin'), updateSetting);

module.exports = router;
