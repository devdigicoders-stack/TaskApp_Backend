const express = require('express');
const router = express.Router();
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
} = require('../controllers/project.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getProjectStats);
router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);

module.exports = router;
