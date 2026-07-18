const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // If null, it's a global notification
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Please add a message'],
  },
  image: {
    type: String, // Can be base64 string or URL
    default: '',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
