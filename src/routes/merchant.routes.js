const express = require('express');
const {
  getMerchants,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  getMerchantDashboard,
  getMerchantQR,
} = require('../controllers/merchant.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Merchant only routes
router.get('/dashboard', authorize('merchant'), getMerchantDashboard);
router.get('/qr', authorize('merchant'), getMerchantQR);

// Admin only routes
router.use(authorize('admin'));
router.route('/')
  .get(getMerchants)
  .post(createMerchant);

router.route('/:id')
  .put(updateMerchant)
  .delete(deleteMerchant);

module.exports = router;
