const mongoose = require('mongoose');

const TASK_TYPES = [
  'youtube_likes',
  'youtube_subscribers',
  'youtube_views',
  'instagram_followers',
  'instagram_likes',
  'twitter_followers',
  'twitter_likes',
  'website_visit',
  'telegram_join',
  'custom',
];

const completionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const campaignTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    taskType: {
      type: String,
      required: [true, 'Task type is required'],
    },
    targetUrl: {
      type: String,
      trim: true,
      default: '',
    },
    targetCount: {
      type: Number,
      required: [true, 'Target count is required'],
      min: [1, 'Target count must be at least 1'],
    },
    coinsReward: {
      type: Number,
      required: [true, 'Coins reward is required'],
      min: [1, 'Coins reward must be at least 1'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    // Array of users who completed this task
    completedBy: [completionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual: total completions count
campaignTaskSchema.virtual('completionsCount').get(function () {
  return this.completedBy ? this.completedBy.length : 0;
});

// Check if a user has already completed this task
campaignTaskSchema.methods.hasUserCompleted = function (userId) {
  return this.completedBy.some((c) => c.user.toString() === userId.toString());
};

// Check if task is expired
campaignTaskSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
};

campaignTaskSchema.set('toJSON', { virtuals: true });
campaignTaskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CampaignTask', campaignTaskSchema);
module.exports.TASK_TYPES = TASK_TYPES;
