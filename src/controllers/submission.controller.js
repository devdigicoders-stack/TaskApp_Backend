const TaskSubmission = require('../models/TaskSubmission');
const CampaignTask = require('../models/CampaignTask');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Start a task (user clicks "Start Task")
// @route   POST /api/submissions/start/:campaignId
exports.startTask = async (req, res, next) => {
  try {
    const campaign = await CampaignTask.findById(req.params.campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (!campaign.isActive) return res.status(400).json({ success: false, message: 'Task is not active' });
    if (campaign.isExpired()) return res.status(400).json({ success: false, message: 'Task has expired' });

    // Check existing submission
    const existing = await TaskSubmission.findOne({ campaign: campaign._id, user: req.user._id });
    if (existing) {
      return res.json({ success: true, submission: existing, message: 'Task already started' });
    }

    const submission = await TaskSubmission.create({
      campaign: campaign._id,
      user: req.user._id,
      status: 'started',
    });

    res.status(201).json({ success: true, submission });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit task completion (user clicks "Mark Complete")
// @route   POST /api/submissions/submit/:campaignId
exports.submitTask = async (req, res, next) => {
  try {
    const { note } = req.body;

    const submission = await TaskSubmission.findOne({
      campaign: req.params.campaignId,
      user: req.user._id,
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Please start the task first' });
    }

    if (['submitted', 'approved'].includes(submission.status)) {
      return res.status(400).json({ success: false, message: 'Task already submitted' });
    }

    submission.status = 'submitted';
    submission.note = note || '';
    submission.submittedAt = new Date();
    await submission.save();

    res.json({ success: true, submission, message: 'Task submitted! Waiting for admin approval.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my submissions (user)
// @route   GET /api/submissions/my
exports.getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await TaskSubmission.find({ user: req.user._id })
      .populate('campaign', 'title taskType coinsReward targetUrl description isActive')
      .sort('-updatedAt');

    res.json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending submissions (admin)
// @route   GET /api/submissions
exports.getAllSubmissions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const submissions = await TaskSubmission.find(filter)
      .populate('campaign', 'title taskType coinsReward')
      .populate('user', 'name email avatar coins')
      .populate('resolvedBy', 'name')
      .sort('-updatedAt');

    res.json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / Reject submission (admin)
// @route   PUT /api/submissions/:id/resolve
exports.resolveSubmission = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const submission = await TaskSubmission.findById(req.params.id).populate('campaign');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    if (submission.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Submission already resolved or not submitted yet' });
    }

    submission.status = status;
    submission.adminNote = adminNote || '';
    submission.resolvedAt = new Date();
    submission.resolvedBy = req.user._id;

    if (status === 'approved') {
      const coinsReward = submission.campaign.coinsReward;
      submission.coinsAwarded = coinsReward;

      // Credit coins to user
      await User.findByIdAndUpdate(submission.user, { $inc: { coins: coinsReward } });

      // Also add to campaign's completedBy for backward compat
      await CampaignTask.findByIdAndUpdate(submission.campaign._id, {
        $addToSet: { completedBy: { user: submission.user, completedAt: new Date() } },
      });

      // Notify User
      await Notification.create({
        userId: submission.user,
        title: 'Task Approved! 💰',
        message: `Your submission for "${submission.campaign.title}" has been approved. You earned ${coinsReward} coins!`,
      });
    } else if (status === 'rejected') {
      // Notify User
      await Notification.create({
        userId: submission.user,
        title: 'Task Rejected ❌',
        message: `Your submission for "${submission.campaign.title}" was rejected. ${adminNote ? 'Reason: ' + adminNote : ''}`,
      });
    }

    await submission.save();
    const populated = await submission.populate('user', 'name email coins');

    res.json({
      success: true,
      message: status === 'approved'
        ? `Approved! ${submission.coinsAwarded} coins credited to user.`
        : 'Submission rejected.',
      submission: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get submission stats (admin)
// @route   GET /api/submissions/stats
exports.getSubmissionStats = async (req, res, next) => {
  try {
    const [total, pending, approved, rejected, started] = await Promise.all([
      TaskSubmission.countDocuments(),
      TaskSubmission.countDocuments({ status: 'submitted' }),
      TaskSubmission.countDocuments({ status: 'approved' }),
      TaskSubmission.countDocuments({ status: 'rejected' }),
      TaskSubmission.countDocuments({ status: 'started' }),
    ]);

    res.json({ success: true, total, pending, approved, rejected, started });
  } catch (error) {
    next(error);
  }
};
