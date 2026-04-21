// backend/routes/stripeWebhookRoutes.js

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const stripePaymentService = require('../services/stripePaymentService');

// Raw body for webhook signature verification
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
            
            // Auto-confirm payment
            try {
                await stripePaymentService.confirmCommissionPayment(paymentIntent.id);
                console.log(`✅ Commission automatically updated for ${paymentIntent.id}`);
            } catch (error) {
                console.error('Auto-confirmation error:', error);
            }
            break;
            
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log(`Payment failed: ${failedPayment.id}`);
            // You can add logic to notify admin
            break;
            
        case 'charge.refunded':
            const refund = event.data.object;
            console.log(`Payment refunded: ${refund.id}`);
            break;
            
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
});

module.exports = router;