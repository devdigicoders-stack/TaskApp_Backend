const Transaction = require('../models/Transaction');

// @desc    Get my transactions
// @route   GET /api/transactions/my
// @access  Private
exports.getMyTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .sort('-createdAt');

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transactions (admin only)
// @route   GET /api/transactions
// @access  Admin/Manager
exports.getAllTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'name email mobileNumber')
      .sort('-createdAt');
    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    next(error);
  }
};
