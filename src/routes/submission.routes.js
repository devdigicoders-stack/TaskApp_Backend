const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  startTask,
  submitTask,
  getMySubmissions,
  getAllSubmissions,
  resolveSubmission,
  getSubmissionStats,
} = require('../controllers/submission.controller');

// User routes
router.post('/start/:campaignId', protect, startTask);
router.post('/submit/:campaignId', protect, submitTask);
router.get('/my', protect, getMySubmissions);

// Admin routes
router.get('/stats', protect, authorize('admin', 'manager'), getSubmissionStats);
router.get('/', protect, authorize('admin', 'manager'), getAllSubmissions);
router.put('/:id/resolve', protect, authorize('admin', 'manager'), resolveSubmission);

module.exports = router;
