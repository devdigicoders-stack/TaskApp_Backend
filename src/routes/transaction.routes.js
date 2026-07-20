const express = require('express');
const { getMyTransactions } = require('../controllers/transaction.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/my', getMyTransactions);

module.exports = router;
