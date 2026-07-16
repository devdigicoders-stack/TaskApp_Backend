const mongoose = require('mongoose');

const taskSubmissionSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignTask',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['started', 'submitted', 'approved', 'rejected'],
      default: 'started',
    },
    note: {
      type: String,
      default: '',
    },
    adminNote: {
      type: String,
      default: '',
    },
    coinsAwarded: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// A user can only have one submission per campaign
taskSubmissionSchema.index({ campaign: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('TaskSubmission', taskSubmissionSchema);
