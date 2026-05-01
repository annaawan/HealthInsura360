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
      currency: 'usd',
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
  // ============ GET CUSTOMER PAYMENT HISTORY ============
exports.getCustomerPayments = async (req, res) => {
    try {
        const customerId = req.user?.userId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const result = await db.query(
            `SELECT 
                p.payment_id,
                p.policy_id,
                p.amount,
                p.method,
                p.status,
                p.transaction_ref,
                p.paid_at,
                pol.policy_type,
                pol.premium_amount,
                pp.plan_name
             FROM payment p
             JOIN policy pol ON p.policy_id = pol.policy_id
             LEFT JOIN policy_plans pp ON pol.plan_id = pp.plan_id
             WHERE p.customer_id = $1
             ORDER BY p.paid_at DESC`,
            [customerId]
        );
        
        res.json({
            success: true,
            payments: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching customer payments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============ GET PAYMENT REMINDERS ============
exports.getPaymentReminders = async (req, res) => {
    try {
        const customerId = req.user?.userId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const result = await db.query(
            `SELECT 
                r.reminder_id,
                r.policy_id,
                r.reminder_type,
                r.reminder_date,
                r.reminder_time,
                r.frequency,
                r.message,
                r.status,
                r.next_reminder_date,
                p.policy_type,
                p.premium_amount,
                pp.plan_name,
                a.first_name as agent_first_name,
                a.last_name as agent_last_name
             FROM payment_reminders r
             JOIN policy p ON r.policy_id = p.policy_id
             LEFT JOIN policy_plans pp ON p.plan_id = pp.plan_id
             LEFT JOIN agent a ON r.agent_id = a.agent_id
             WHERE r.customer_id = $1 AND r.status = 'active'
               AND r.reminder_date <= CURRENT_DATE + INTERVAL '30 days'
             ORDER BY r.reminder_date ASC`,
            [customerId]
        );
        
        res.json({
            success: true,
            reminders: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching payment reminders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============ PROCESS PREMIUM PAYMENT ============
exports.processPremiumPayment = async (req, res) => {
    const client = await db.pool.connect();
    const companyAccountService = require('../services/companyAccountService');
    
    try {
        const customerId = req.user?.userId;
        const { policyId, amount, paymentMethod, reminderId } = req.body;
        
        if (!customerId || !policyId || !amount) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        await client.query('BEGIN');
        
        // 1. Verify policy belongs to customer
        const policyResult = await client.query(
            `SELECT p.*, pp.plan_name 
             FROM policy p
             JOIN policy_plans pp ON p.plan_id = pp.plan_id
             WHERE p.policy_id = $1 AND p.customer_id = $2 AND p.status = 'active'`,
            [policyId, customerId]
        );
        
        if (policyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Policy not found' });
        }
        
        const policy = policyResult.rows[0];
        const paymentAmount = parseFloat(amount);
        
        // 2. Create payment record
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        await client.query(
            `INSERT INTO payment (
                payment_id, policy_id, customer_id, amount, method, status, 
                transaction_ref, paid_at
            ) VALUES ($1, $2, $3, $4, $5, 'Completed', $6, NOW())`,
            [paymentId, policyId, customerId, paymentAmount, paymentMethod || 'card', transactionId]
        );
        
        // 3. Create transaction record
        await client.query(
            `INSERT INTO transaction (
                transaction_id, related_payment_id, amount, type, status, 
                created_at, payment_method, notes
            ) VALUES ($1, $2, $3, 'premium_payment', 'completed', NOW(), $4, $5)`,
            [transactionId, paymentId, paymentAmount, paymentMethod || 'card', `Premium payment for policy #${policyId}`]
        );
        
        // 4. Credit company account
        const creditResult = await companyAccountService.creditCompanyAccount(
            paymentAmount,
            customerId,
            policyId,
            `Premium payment from customer ${customerId} for policy #${policyId} - ${policy.plan_name}`
        );
        
        if (!creditResult.success) {
            throw new Error('Failed to credit company account');
        }
        
        // 5. Update policy remaining coverage (add the payment amount to coverage)
        await client.query(
            `UPDATE policy 
             SET remaining_coverage = remaining_coverage + $1,
                 updated_at = NOW()
             WHERE policy_id = $2`,
            [paymentAmount, policyId]
        );
        
        // 6. If this payment was from a reminder, mark reminder as completed
        if (reminderId) {
            await client.query(
                `UPDATE payment_reminders 
                 SET status = 'completed', 
                     updated_at = NOW(),
                     notes = COALESCE(notes, 'Payment completed via customer dashboard')
                 WHERE reminder_id = $1`,
                [reminderId]
            );
            
            // Log reminder completion
            await client.query(
                `INSERT INTO reminder_logs (
                    reminder_id, customer_id, customer_email, notification_type, 
                    subject, message, status, sent_at
                ) VALUES ($1, $2, (SELECT email FROM customer WHERE customer_id = $2), 
                    'payment_completed', 'Payment Completed', $3, 'success', NOW())`,
                [reminderId, customerId, `Payment of Rs. ${paymentAmount.toLocaleString()} completed for policy #${policyId}`]
            );
        }
        
        await client.query('COMMIT');
        
        // 7. Create notification for customer
        await createNotification(
            customerId,
            'customer',
            'payment_received',
            'Payment Successful ✅',
            `Your payment of Rs. ${paymentAmount.toLocaleString()} for policy "${policy.plan_name}" has been received successfully.`,
            policyId
        ).catch(err => console.log('Notification error:', err.message));
        
        console.log(`✅ Premium payment processed: ${paymentId} for customer ${customerId}`);
        
        res.json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                payment_id: paymentId,
                transaction_id: transactionId,
                amount: paymentAmount,
                company_balance: creditResult.new_balance
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing premium payment:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
};

// ============ GET UPCOMING PAYMENTS SUMMARY ============
exports.getUpcomingPaymentsSummary = async (req, res) => {
    try {
        const customerId = req.user?.userId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        // Get total due amount from active reminders
        const dueResult = await db.query(
            `SELECT 
                COALESCE(SUM(p.premium_amount), 0) as total_due,
                COUNT(*) as reminders_count
             FROM payment_reminders r
             JOIN policy p ON r.policy_id = p.policy_id
             WHERE r.customer_id = $1 
               AND r.status = 'active'
               AND r.reminder_date <= CURRENT_DATE + INTERVAL '30 days'`,
            [customerId]
        );
        
        // Get last payment date
        const lastPaymentResult = await db.query(
            `SELECT paid_at as last_payment_date
             FROM payment 
             WHERE customer_id = $1 
             ORDER BY paid_at DESC 
             LIMIT 1`,
            [customerId]
        );
        
        res.json({
            success: true,
            data: {
                total_due: parseFloat(dueResult.rows[0].total_due) || 0,
                reminders_count: parseInt(dueResult.rows[0].reminders_count) || 0,
                last_payment_date: lastPaymentResult.rows[0]?.last_payment_date || null
            }
        });
        
    } catch (error) {
        console.error('Error fetching upcoming payments summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
};