const express = require('express');
const {
  getRedemptions,
  createRedemption,
  updateRedemptionStatus,
} = require('../controllers/redemption.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getRedemptions)
  .post(createRedemption);

router
  .route('/:id')
  .put(authorize('admin', 'manager'), updateRedemptionStatus);

module.exports = router;
