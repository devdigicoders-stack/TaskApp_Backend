const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  completeTask,
  getCampaignStats,
  getCampaignCompletions,
} = require('../controllers/campaign.controller');
const { protect, authorize } = require('../middleware/auth');

// All routes require login
router.use(protect);

// Stats — admin/manager only
router.get('/stats', authorize('admin', 'manager'), getCampaignStats);

// List & Create
router
  .route('/')
  .get(getCampaigns)
  .post(authorize('admin', 'manager'), createCampaign);

// Single campaign
router
  .route('/:id')
  .get(getCampaign)
  .put(authorize('admin', 'manager'), updateCampaign)
  .delete(authorize('admin', 'manager'), deleteCampaign);

// Complete a task (any logged-in user)
router.post('/:id/complete', completeTask);

// Get completions list (admin only)
router.get('/:id/completions', authorize('admin', 'manager'), getCampaignCompletions);

module.exports = router;
