const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String, // base64 or URL
      required: [true, 'Banner image is required'],
    },
    linkUrl: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
