const CampaignTask = require('../models/CampaignTask');
const User = require('../models/User');
const TaskSubmission = require('../models/TaskSubmission');
const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────
// @desc    Get all campaign tasks (admin sees all, users see active only)
// @route   GET /api/campaigns
// ─────────────────────────────────────────────────────────────
exports.getCampaigns = async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'manager'].includes(req.user.role);
    const filter = isAdmin ? {} : { isActive: true };

    const campaigns = await CampaignTask.find(filter)
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    // Fetch this user's submissions for all campaigns at once
    const mySubmissions = await TaskSubmission.find({ user: req.user._id })
      .select('campaign status');
    const submissionMap = {};
    mySubmissions.forEach((s) => { submissionMap[s.campaign.toString()] = s.status; });

    const result = campaigns.map((c) => {
      const obj = c.toObject();
      obj.completionsCount = c.completedBy ? c.completedBy.length : 0;
      obj.userCompleted = c.hasUserCompleted(req.user._id);
      obj.isExpired = c.isExpired();
      obj.userSubmissionStatus = submissionMap[c._id.toString()] || null;
      if (!isAdmin) {
        delete obj.completedBy;
      }
      return obj;
    });

    res.json({ success: true, count: result.length, campaigns: result });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────────────────────
// @desc    Get single campaign task
// @route   GET /api/campaigns/:id
// ─────────────────────────────────────────────────────────────
exports.getCampaign = async (req, res, next) => {
  try {
    const campaign = await CampaignTask.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('completedBy.user', 'name email');

    if (!campaign)
      return res.status(404).json({ success: false, message: 'Campaign task not found' });

    const obj = campaign.toObject();
    obj.completionsCount = campaign.completedBy ? campaign.completedBy.length : 0;
    obj.userCompleted = campaign.hasUserCompleted(req.user._id);
    obj.isExpired = campaign.isExpired();

    res.json({ success: true, campaign: obj });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Create a new campaign task (admin/manager only)
// @route   POST /api/campaigns
// ─────────────────────────────────────────────────────────────
exports.createCampaign = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;
    const campaign = await CampaignTask.create(req.body);
    const populated = await campaign.populate('createdBy', 'name email');

    const obj = populated.toObject();
    obj.completionsCount = 0;
    obj.userCompleted = false;
    obj.isExpired = campaign.isExpired();

    // Create global notification for new campaign
    await Notification.create({
      title: 'New Offer Available! 🎉',
      message: `A new task "${campaign.title}" is available. Complete it to earn ${campaign.coinsReward} coins!`,
      userId: null, // Global broadcast
    });

    res.status(201).json({ success: true, campaign: obj });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Update a campaign task (admin/manager only)
// @route   PUT /api/campaigns/:id
// ─────────────────────────────────────────────────────────────
exports.updateCampaign = async (req, res, next) => {
  try {
    // Don't allow updating completedBy via this endpoint
    delete req.body.completedBy;
    delete req.body.createdBy;

    const campaign = await CampaignTask.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!campaign)
      return res.status(404).json({ success: false, message: 'Campaign task not found' });

    const obj = campaign.toObject();
    obj.completionsCount = campaign.completedBy ? campaign.completedBy.length : 0;
    obj.isExpired = campaign.isExpired();

    res.json({ success: true, campaign: obj });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Delete a campaign task (admin only)
// @route   DELETE /api/campaigns/:id
// ─────────────────────────────────────────────────────────────
exports.deleteCampaign = async (req, res, next) => {
  try {
    const campaign = await CampaignTask.findByIdAndDelete(req.params.id);
    if (!campaign)
      return res.status(404).json({ success: false, message: 'Campaign task not found' });

    res.json({ success: true, message: 'Campaign task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    User completes a campaign task → get coins
// @route   POST /api/campaigns/:id/complete
// ─────────────────────────────────────────────────────────────
exports.completeTask = async (req, res, next) => {
  try {
    const campaign = await CampaignTask.findById(req.params.id);

    if (!campaign)
      return res.status(404).json({ success: false, message: 'Campaign task not found' });

    // Check if task is active
    if (!campaign.isActive)
      return res.status(400).json({ success: false, message: 'This task is no longer active' });

    // Check if task is expired
    if (campaign.isExpired())
      return res.status(400).json({ success: false, message: 'This task has expired' });

    // Check if user already completed this task
    if (campaign.hasUserCompleted(req.user._id))
      return res.status(400).json({
        success: false,
        message: 'You have already completed this task',
      });

    // Add user to completedBy array
    campaign.completedBy.push({
      user: req.user._id,
      completedAt: new Date(),
    });
    await campaign.save();

    // Credit coins to user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { coins: campaign.coinsReward } },
      { new: true }
    ).select('name email coins');

    res.json({
      success: true,
      message: `🎉 Task completed! You earned ${campaign.coinsReward} coins!`,
      coinsEarned: campaign.coinsReward,
      totalCoins: user.coins,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get campaign statistics (admin only)
// @route   GET /api/campaigns/stats
// ─────────────────────────────────────────────────────────────
exports.getCampaignStats = async (req, res, next) => {
  try {
    const total = await CampaignTask.countDocuments();
    const active = await CampaignTask.countDocuments({ isActive: true });
    const inactive = total - active;

    // Total completions across all campaigns
    const completionAgg = await CampaignTask.aggregate([
      {
        $project: {
          completionsCount: { $size: '$completedBy' },
          coinsDistributed: {
            $multiply: [{ $size: '$completedBy' }, '$coinsReward'],
          },
          taskType: 1,
        },
      },
      {
        $group: {
          _id: null,
          totalCompletions: { $sum: '$completionsCount' },
          totalCoinsDistributed: { $sum: '$coinsDistributed' },
        },
      },
    ]);

    // By task type
    const byType = await CampaignTask.aggregate([
      { $group: { _id: '$taskType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Top campaigns by completions
    const topCampaigns = await CampaignTask.aggregate([
      {
        $project: {
          title: 1,
          taskType: 1,
          coinsReward: 1,
          completionsCount: { $size: '$completedBy' },
        },
      },
      { $sort: { completionsCount: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      total,
      active,
      inactive,
      totalCompletions: completionAgg[0]?.totalCompletions || 0,
      totalCoinsDistributed: completionAgg[0]?.totalCoinsDistributed || 0,
      byType,
      topCampaigns,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get completions list for a specific campaign (admin)
// @route   GET /api/campaigns/:id/completions
// ─────────────────────────────────────────────────────────────
exports.getCampaignCompletions = async (req, res, next) => {
  try {
    const campaign = await CampaignTask.findById(req.params.id)
      .populate('completedBy.user', 'name email avatar');

    if (!campaign)
      return res.status(404).json({ success: false, message: 'Campaign task not found' });

    res.json({
      success: true,
      completions: campaign.completedBy,
      count: campaign.completedBy ? campaign.completedBy.length : 0,
    });
  } catch (error) {
    next(error);
  }
};
