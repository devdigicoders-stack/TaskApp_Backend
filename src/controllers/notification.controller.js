const Notification = require('../models/Notification');
const User = require('../models/User');
const { messaging } = require('../config/firebase');

// @desc    Get user notifications (including global ones)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { userId: req.user.id },
        { userId: null }
      ]
    }).sort('-createdAt').limit(50); // Get latest 50

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Since global notifications shouldn't be mutated per user here (would affect others), 
    // we only mark personal notifications as read in DB.
    // For a fully scalable app, we'd have a UserReadNotifications table, but for now this suffices.
    if (notification.userId && notification.userId.toString() === req.user.id) {
      notification.isRead = true;
      await notification.save();
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a notification (Admin only)
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, userId, image } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Please provide title and message' });
    }

    const notificationData = { title, message };
    if (userId) {
      notificationData.userId = userId;
    }
    if (image) {
      notificationData.image = image;
    }

    const notification = await Notification.create(notificationData);

    // Send push notification via FCM
    try {
      if (userId) {
        // Find specific user's FCM token
        const targetUser = await User.findById(userId);
        if (targetUser && targetUser.fcmToken) {
          await messaging().send({
            token: targetUser.fcmToken,
            notification: {
              title,
              body: message,
              ...(image && { imageUrl: image })
            },
          });
        }
      } else {
        // Send global notification via topic or find all users with fcmToken
        // Alternatively, if you want to use a topic, you would subscribe users to 'all' topic on login
        // For simplicity, assuming a topic 'all' is used for global notifications.
        await messaging().send({
          topic: 'all',
          notification: {
            title,
            body: message,
            ...(image && { imageUrl: image })
          },
        });
      }
    } catch (fcmError) {
      console.error('Error sending FCM push notification:', fcmError);
      // We don't fail the API if FCM fails
    }

    res.status(201).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};
