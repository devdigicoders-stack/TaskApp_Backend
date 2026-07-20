const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers, getUser, updateUser, deleteUser, updateProfile, adjustCoins
} = require('../controllers/user.controller');

// User updates their own profile (UPI, QR)
router.put('/profile', protect, updateProfile);

// Admin routes
router.get('/', protect, authorize('admin', 'manager'), getUsers);
router.get('/:id', protect, authorize('admin', 'manager'), getUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.post('/:id/adjust-coins', protect, authorize('admin', 'manager'), adjustCoins);

module.exports = router;
