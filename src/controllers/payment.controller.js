const User = require('../models/User');
const MerchantPayment = require('../models/MerchantPayment');

// Get Merchant details by QR ID
exports.getMerchantByQr = async (req, res) => {
  try {
    const { qrId } = req.params;
    const merchant = await User.findOne({ merchantQrId: qrId, role: 'merchant' }).select('name shopName avatar');
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Invalid Merchant QR' });
    }

    res.status(200).json({ success: true, merchant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// User pays a merchant
exports.payMerchant = async (req, res) => {
  try {
    const { merchantQrId, amount } = req.body;
    const userId = req.user._id;
    const coinsAmount = parseInt(amount, 10);

    if (!merchantQrId || isNaN(coinsAmount) || coinsAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment details' });
    }

    const user = await User.findById(userId);
    if (user.coins < coinsAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient coins' });
    }

    const merchant = await User.findOne({ merchantQrId, role: 'merchant' });
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    if (!merchant.isActive) {
      return res.status(400).json({ success: false, message: 'Merchant account is not active' });
    }

    // Deduct from user
    user.coins -= coinsAmount;
    await user.save();

    // Add to merchant
    merchant.coins += coinsAmount;
    await merchant.save();

    // Create payment record
    const payment = await MerchantPayment.create({
      user: userId,
      merchant: merchant._id,
      coinsAmount,
      status: 'completed',
    });

    res.status(200).json({
      success: true,
      message: 'Payment successful',
      payment,
      remainingCoins: user.coins,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
