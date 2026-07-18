const mongoose = require('mongoose');

const merchantPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Merchant is required'],
    },
    coinsAmount: {
      type: Number,
      required: [true, 'Coin amount is required'],
      min: [1, 'Must pay at least 1 coin'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MerchantPayment', merchantPaymentSchema);
