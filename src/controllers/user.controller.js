const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { messaging } = require('../config/firebase');

// @desc    Update own profile (upiId, upiQrCode, name)
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, upiId, upiQrCode, avatar, fcmToken, mobileNumber } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (upiId !== undefined) updateData.upiId = upiId;
    if (upiQrCode !== undefined) updateData.upiQrCode = upiQrCode;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (fcmToken !== undefined) updateData.fcmToken = fcmToken;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

    res.json({
      success: true,
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role, coins: user.coins,
        upiId: user.upiId, upiQrCode: user.upiQrCode,
        isProfileComplete: user.isProfileComplete,
        avatar: user.avatar, mobileNumber: user.mobileNumber, fcmToken: user.fcmToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort('-createdAt');
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user (admin only)
// @route   GET /api/users/:id
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (admin only)
// @route   PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, isActive, coins } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive, coins },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust user coins (admin only)
// @route   POST /api/users/:id/adjust-coins
exports.adjustCoins = async (req, res, next) => {
  try {
    const { amount, note } = req.body;
    if (typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid non-zero amount' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.coins = Math.max(0, user.coins + amount);
    await user.save();

    await Transaction.create({
      user: user._id,
      amount,
      type: 'admin_adjustment',
      description: note || (amount > 0 ? 'Admin added coins' : 'Admin deducted coins')
    });

    const title = amount > 0 ? 'Coins Added! 💰' : 'Coins Deducted';
    const message = note || `Admin has ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} coins to your account.`;
    
    await Notification.create({
      userId: user._id,
      title,
      message,
    });

    if (user.fcmToken) {
      try {
        await messaging().send({
          token: user.fcmToken,
          notification: { title, body: message },
        });
      } catch (fcmError) {
        console.error('Error sending FCM push notification in adjustCoins:', fcmError);
      }
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
