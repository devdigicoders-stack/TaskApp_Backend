const express = require('express');
const {
  getGifts,
  createGift,
  updateGift,
  deleteGift,
} = require('../controllers/gift.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getGifts)
  .post(authorize('admin'), createGift);

router
  .route('/:id')
  .put(authorize('admin'), updateGift)
  .delete(authorize('admin'), deleteGift);

module.exports = router;
