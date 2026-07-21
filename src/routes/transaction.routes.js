const express = require('express');
const { getMyTransactions, getAllTransactions } = require('../controllers/transaction.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', authorize('admin', 'manager'), getAllTransactions);
router.get('/my', getMyTransactions);

module.exports = router;
