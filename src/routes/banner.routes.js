const express = require('express');
const { getBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/banner.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getBanners)
  .post(authorize('admin', 'manager'), createBanner);

router.route('/:id')
  .put(authorize('admin', 'manager'), updateBanner)
  .delete(authorize('admin', 'manager'), deleteBanner);

module.exports = router;
