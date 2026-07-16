const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  resolveWithdrawal,
  getWithdrawalStats,
} = require('../controllers/withdrawal.controller');

// User routes
router.post('/', protect, createWithdrawal);
router.get('/my', protect, getMyWithdrawals);

// Admin routes
router.get('/stats', protect, authorize('admin', 'manager'), getWithdrawalStats);
router.get('/', protect, authorize('admin', 'manager'), getAllWithdrawals);
router.put('/:id/resolve', protect, authorize('admin', 'manager'), resolveWithdrawal);

module.exports = router;
