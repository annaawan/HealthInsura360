const db = require('../config/database');
const Stripe = require('stripe');
const { createNotification } = require('../routes/notificationRoutes');

exports.createPaymentIntent = async (req, res) => {
  try {
    console.log('='.repeat(50));
    console.log('📝 CREATE PAYMENT INTENT CALLED');
    console.log('='.repeat(50));
    
    // 1. Check request body
    console.log('📦 Request body:', req.body);
    
    // 2. Check user from auth
    console.log('👤 User from auth:', req.user);
    
    const { policyId, amount, policyName } = req.body;
    
    // 3. Validate inputs
    if (!policyId) {
      console.log('❌ Missing policyId');
      return res.status(400).json({ error: 'Policy ID is required' });
    }
    
    if (!amount) {
      console.log('❌ Missing amount');
      return res.status(400).json({ error: 'Amount is required' });
    }
    
    // 4. Get customer ID (try different possible names)
    const customerId = req.user?.userId || req.user?.id || req.user?.customer_id;
    console.log('👤 Extracted customerId:', customerId);
    
    if (!customerId) {
      console.log('❌ No customer ID found in req.user');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // 5. Check Stripe key
    console.log('🔑 Stripe key exists:', !!process.env.STRIPE_SECRET_KEY);
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('❌ STRIPE_SECRET_KEY not set in .env');
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    // 6. Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized');
    
    // 7. Create payment intent
    const amountInPaisa = Math.round(amount * 100);
    console.log('💰 Amount in paisa:', amountInPaisa);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaisa,
      currency: 'pkr',
      metadata: { 
        customerId: customerId.toString(), 
        policyId: policyId.toString(),
        policyName: policyName || 'Policy Purchase'
      },
    });
    
    console.log('✅ PaymentIntent created:', paymentIntent.id);
    console.log('✅ Client secret:', paymentIntent.client_secret.substring(0, 20) + '...');
    
    // 8. Try to save to database (but don't fail if it doesn't work)
    try {
      console.log('📝 Attempting to save to database...');
      
      // First, check if tables exist
      const tableCheck = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'payment_intents'
        );`
      );
      
      console.log('📊 payment_intents table exists:', tableCheck.rows[0].exists);
      
      if (tableCheck.rows[0].exists) {
        await db.query(
          `INSERT INTO payment_intents 
           (payment_intent_id, customer_id, policy_id, amount, status, client_secret)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [paymentIntent.id, customerId, policyId, amount, 'pending', paymentIntent.client_secret]
        );
        console.log('✅ Payment intent saved to database');
      } else {
        console.log('⚠️ payment_intents table does not exist - skipping database save');
      }
    } catch (dbError) {
      console.log('⚠️ Database error (non-fatal):', dbError.message);
    }
    
    // 9. Send success response
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
    
  } catch (error) {
    console.error('❌ ERROR in createPaymentIntent:');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create payment' 
    });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    console.log('='.repeat(50));
    console.log('📝 CONFIRM PAYMENT CALLED');
    console.log('='.repeat(50));
    
    const { paymentIntentId, policyId, policyName, amount } = req.body;
    console.log('💰 PaymentIntent ID:', paymentIntentId);
    console.log('📋 Policy ID:', policyId);
    console.log('💰 Amount:', amount);
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log('✅ PaymentIntent status:', paymentIntent.status);
    
    if (paymentIntent.status === 'succeeded') {
      // Get customer ID from metadata or request
      const customerId = paymentIntent.metadata?.customerId || req.user?.userId || req.user?.id;
      const policyNameFromMetadata = paymentIntent.metadata?.policyName || policyName || 'your policy';
      const paymentAmount = amount || (paymentIntent.amount / 100);
      
      // Update database if table exists
      try {
        await db.query(
          'UPDATE payment_intents SET status = $1 WHERE payment_intent_id = $2',
          ['succeeded', paymentIntentId]
        );
        console.log('✅ Database updated');
      } catch (dbError) {
        console.log('⚠️ Database update failed:', dbError.message);
      }
      
      // ✅ CREATE NOTIFICATION FOR SUCCESSFUL PAYMENT
      if (customerId) {
        const formattedAmount = parseFloat(paymentAmount).toLocaleString();
        
        await createNotification(
          customerId,                          // customer ID
          'customer',                          // user type
          'payment_received',                  // notification type
          'Payment Received Successfully',     // title
          `Your payment of Rs. ${formattedAmount} for "${policyNameFromMetadata}" has been received successfully. Thank you for your purchase!`, // message
          policyId                             // related policy ID
        );
        
        console.log(`📧 Payment notification sent to customer ${customerId}`);
      } else {
        console.log('⚠️ No customerId found, skipping notification');
      }
      
      res.json({ 
        success: true, 
        message: 'Payment confirmed and notification sent' 
      });
    } else {
      res.status(400).json({ success: false, error: 'Payment not successful' });
    }
  } catch (error) {
    console.error('❌ Confirm payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// WEBHOOK FOR STRIPE PAYMENT SUCCESS (Alternative)
// ============================================
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }
    
    console.log('📨 Webhook event type:', event.type);
    
    // Handle payment success
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const customerId = paymentIntent.metadata?.customerId;
      const policyId = paymentIntent.metadata?.policyId;
      const policyName = paymentIntent.metadata?.policyName || 'your policy';
      const amount = paymentIntent.amount / 100;
      
      console.log(`💰 Payment succeeded for customer ${customerId}, policy ${policyId}`);
      
      // Update payment intent in database
      try {
        await db.query(
          `UPDATE payment_intents 
           SET status = 'succeeded', updated_at = NOW() 
           WHERE payment_intent_id = $1`,
          [paymentIntent.id]
        );
        console.log('✅ Payment intent updated in database');
      } catch (dbError) {
        console.log('⚠️ Database update error:', dbError.message);
      }
      
      // ✅ CREATE NOTIFICATION FOR SUCCESSFUL PAYMENT VIA WEBHOOK
      if (customerId) {
        const formattedAmount = amount.toLocaleString();
        
        await createNotification(
          parseInt(customerId),                // customer ID
          'customer',                          // user type
          'payment_received',                  // notification type
          'Payment Received Successfully',     // title
          `Your payment of Rs. ${formattedAmount} for "${policyName}" has been received successfully. Thank you for your purchase!`, // message
          policyId ? parseInt(policyId) : null // related policy ID
        );
        
        console.log(`📧 Payment notification sent to customer ${customerId} via webhook`);
      }
    }
    
    // Handle payment failure
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const customerId = paymentIntent.metadata?.customerId;
      const policyName = paymentIntent.metadata?.policyName || 'your policy';
      const amount = paymentIntent.amount / 100;
      
      console.log(`❌ Payment failed for customer ${customerId}`);
      
      // Update payment intent in database
      try {
        await db.query(
          `UPDATE payment_intents 
           SET status = 'failed', updated_at = NOW() 
           WHERE payment_intent_id = $1`,
          [paymentIntent.id]
        );
      } catch (dbError) {
        console.log('⚠️ Database update error:', dbError.message);
      }
      
      // ✅ CREATE NOTIFICATION FOR FAILED PAYMENT
      if (customerId) {
        const formattedAmount = amount.toLocaleString();
        
        await createNotification(
          parseInt(customerId),                // customer ID
          'customer',                          // user type
          'payment_failed',                    // notification type
          'Payment Failed',                    // title
          `Your payment of Rs. ${formattedAmount} for "${policyName}" failed. Please check your payment method and try again.`, // message
          null
        );
        
        console.log(`📧 Payment failure notification sent to customer ${customerId}`);
      }
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};