const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, fcmToken: user.fcmToken, mobileNumber: user.mobileNumber },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role, coins: user.coins,
        upiId: user.upiId, upiQrCode: user.upiQrCode,
        isProfileComplete: user.isProfileComplete,
        avatar: user.avatar, fcmToken: user.fcmToken, mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google Sign-In (Firebase token verify)
// @route   POST /api/auth/google
exports.googleLogin = async (req, res, next) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ success: false, message: 'Firebase token required' });
    }

    // Verify with Firebase Admin SDK
    const admin = require('../config/firebase');
    const decoded = await admin.auth().verifyIdToken(firebaseToken);

    const { uid, email, name, picture } = decoded;

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId: uid }, { email }] });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId: uid,
        avatar: picture || '',
        role: 'user',
      });
    } else if (!user.googleId) {
      // Link google ID to existing account
      user.googleId = uid;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role, coins: user.coins,
        upiId: user.upiId, upiQrCode: user.upiQrCode,
        isProfileComplete: user.isProfileComplete,
        avatar: user.avatar, fcmToken: user.fcmToken, mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
    }
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    success: true,
      user: {
      _id: user._id, name: user.name, email: user.email,
      role: user.role, coins: user.coins,
      upiId: user.upiId, upiQrCode: user.upiQrCode,
      isProfileComplete: user.isProfileComplete,
      avatar: user.avatar, fcmToken: user.fcmToken, mobileNumber: user.mobileNumber,
    },
  });
};
