const express = require('express');
const {
  payMerchant,
  getMerchantByQr,
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/merchant/:qrId', getMerchantByQr);
router.post('/pay', payMerchant);

module.exports = router;
