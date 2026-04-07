const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/create-payment-intent', authenticate, paymentController.createPaymentIntent);
router.post('/confirm-payment', authenticate, paymentController.confirmPayment);

module.exports = router;