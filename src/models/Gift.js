const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Gift name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    requiredCoins: {
      type: Number,
      required: [true, 'Required coins is required'],
      min: [1, 'Must require at least 1 coin'],
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gift', giftSchema);
