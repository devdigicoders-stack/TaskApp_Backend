const User = require('../models/User');
const MerchantPayment = require('../models/MerchantPayment');
const crypto = require('crypto');

// Admin only: Get all merchants
exports.getMerchants = async (req, res) => {
  try {
    const merchants = await User.find({ role: 'merchant' }).select('-password').sort('-createdAt');
    res.status(200).json({ success: true, count: merchants.length, merchants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Admin only: Create a merchant
exports.createMerchant = async (req, res) => {
  try {
    const { name, email, password, shopName, address, addressLink } = req.body;
    
    // Check if email exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate a unique QR ID for the merchant
    const merchantQrId = `MERCH_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const merchant = await User.create({
      name,
      email,
      password,
      role: 'merchant',
      shopName,
      address: address || '',
      addressLink: addressLink || '',
      merchantQrId,
    });

    res.status(201).json({ success: true, merchant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Admin only: Update a merchant
exports.updateMerchant = async (req, res) => {
  try {
    const merchant = await User.findById(req.params.id);
    if (!merchant || merchant.role !== 'merchant') {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const { name, email, shopName, address, addressLink, isActive, password } = req.body;
    
    if (name) merchant.name = name;
    if (email) merchant.email = email;
    if (shopName !== undefined) merchant.shopName = shopName;
    if (address !== undefined) merchant.address = address;
    if (addressLink !== undefined) merchant.addressLink = addressLink;
    if (isActive !== undefined) merchant.isActive = isActive;
    if (password) merchant.password = password;

    await merchant.save();
    res.status(200).json({ success: true, merchant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Admin only: Delete a merchant
exports.deleteMerchant = async (req, res) => {
  try {
    const merchant = await User.findById(req.params.id);
    if (!merchant || merchant.role !== 'merchant') {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Merchant deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Merchant only: Get Merchant Dashboard stats and recent payments
exports.getMerchantDashboard = async (req, res) => {
  try {
    // req.user is the logged in merchant
    const merchantId = req.user._id;

    // Get payments
    const payments = await MerchantPayment.find({ merchant: merchantId })
      .populate('user', 'name email avatar mobileNumber')
      .sort('-createdAt');

    const totalCoins = payments.reduce((acc, curr) => acc + curr.coinsAmount, 0);
    
    // Get today's total
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayPayments = payments.filter(p => new Date(p.createdAt) >= startOfDay);
    const todayCoins = todayPayments.reduce((acc, curr) => acc + curr.coinsAmount, 0);

    res.status(200).json({
      success: true,
      stats: {
        totalCoins,
        todayCoins,
        paymentCount: payments.length
      },
      merchant: req.user,
      payments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Merchant only: get Merchant QR Code Data
exports.getMerchantQR = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      qrData: req.user.merchantQrId,
      shopName: req.user.shopName,
      name: req.user.name,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
