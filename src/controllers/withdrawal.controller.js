const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');

// @desc    Create withdrawal request (user)
// @route   POST /api/withdrawals
exports.createWithdrawal = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Check profile completion
    if (!user.upiId || !user.upiQrCode) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile (add UPI ID and QR Code) before requesting a withdrawal',
      });
    }

    const { coinsAmount } = req.body;
    const coins = Number(coinsAmount);

    if (!coins || coins < 1) {
      return res.status(400).json({ success: false, message: 'Invalid coins amount' });
    }

    if (user.coins < coins) {
      return res.status(400).json({ success: false, message: 'Insufficient coins balance' });
    }

    // Get conversion rate from settings
    const coinsPerInr = await Settings.get('coins_per_inr', 100);
    const inrAmount = parseFloat((coins / coinsPerInr).toFixed(2));

    const minWithdraw = await Settings.get('min_withdrawal_coins', 100);
    if (coins < minWithdraw) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ${minWithdraw} coins`,
      });
    }

    // Deduct coins immediately (hold)
    user.coins -= coins;
    await user.save();

    const withdrawal = await Withdrawal.create({
      user: user._id,
      coinsAmount: coins,
      inrAmount,
      upiId: user.upiId,
      upiQrCode: user.upiQrCode,
    });

    // Record transaction in user's history (debit)
    await Transaction.create({
      user: user._id,
      amount: -coins,
      type: 'withdrawal',
      description: 'Withdrawal request submitted',
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal,
      remainingCoins: user.coins,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my withdrawal requests (user)
// @route   GET /api/withdrawals/my
exports.getMyWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort('-createdAt');
    res.json({ success: true, count: withdrawals.length, withdrawals });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all withdrawal requests (admin)
// @route   GET /api/withdrawals
exports.getAllWithdrawals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const withdrawals = await Withdrawal.find(filter)
      .populate('user', 'name email avatar coins')
      .populate('resolvedBy', 'name')
      .sort('-createdAt');

    res.json({ success: true, count: withdrawals.length, withdrawals });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / Reject withdrawal (admin)
// @route   PUT /api/withdrawals/:id/resolve
exports.resolveWithdrawal = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Withdrawal already resolved' });
    }

    // If rejected, refund coins
    if (status === 'rejected') {
      await User.findByIdAndUpdate(withdrawal.user._id, {
        $inc: { coins: withdrawal.coinsAmount },
      });

      // Record refund transaction in user's history
      await Transaction.create({
        user: withdrawal.user._id,
        amount: withdrawal.coinsAmount,
        type: 'withdrawal_refund',
        description: 'Refund for rejected withdrawal request',
      });
    }

    withdrawal.status = status;
    withdrawal.adminNote = adminNote || '';
    withdrawal.resolvedAt = new Date();
    withdrawal.resolvedBy = req.user._id;
    await withdrawal.save();

    res.json({
      success: true,
      message: `Withdrawal ${status}`,
      withdrawal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get withdrawal stats (admin)
// @route   GET /api/withdrawals/stats
exports.getWithdrawalStats = async (req, res, next) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      Withdrawal.countDocuments(),
      Withdrawal.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'approved' }),
      Withdrawal.countDocuments({ status: 'rejected' }),
    ]);

    const paidAgg = await Withdrawal.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, totalInr: { $sum: '$inrAmount' }, totalCoins: { $sum: '$coinsAmount' } } },
    ]);

    res.json({
      success: true,
      total, pending, approved, rejected,
      totalInrPaid: paidAgg[0]?.totalInr || 0,
      totalCoinsPaid: paidAgg[0]?.totalCoins || 0,
    });
  } catch (error) {
    next(error);
  }
};
