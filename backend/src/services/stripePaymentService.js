// backend/src/services/stripePaymentService.js

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51TJO4rJ7UpNEGAgNjbgp4ms6Oi6qqjYQH5vnHGm892IYR2MPhbjtaBxSjvBKzcIM6Lg9Py4iNXm7EE9K8gYjcmfi004DipyhY4');
const db = require('../config/database');
const emailService = require('./emailServices');
const auditLogService = require('./auditLogServices');

class StripePaymentService {
    
    // Create a payment intent for commission payout
    async createCommissionPaymentIntent(commissionId, agentId, amount, currency = 'usd') {
        try {
            console.log('🔍 Looking for commission:', commissionId);
            
            // PostgreSQL query - NO destructuring, just get rows
            const commissionResult = await db.query(
                `SELECT c.*, a.email, a.first_name, a.last_name 
                 FROM commission c
                 JOIN agent a ON c.agent_id = a.agent_id
                 WHERE c.commission_id = $1 AND c.status = 'pending'`,
                [commissionId]
            );
            
            // Handle both possible return structures
            const commission = commissionResult.rows ? commissionResult.rows[0] : commissionResult[0];
            
            if (!commission) {
                console.error('❌ Commission not found for ID:', commissionId);
                throw new Error('Commission not found or already paid');
            }
            
            console.log('✅ Commission found:', commission.commission_id);
            
            // Create Stripe payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency: currency,
                metadata: {
                    commission_id: commissionId,
                    agent_id: agentId,
                    policy_id: commission.policy_id,
                    commission_rate: commission.rate,
                    purpose: 'commission_payout'
                },
                description: `Commission payout for policy #${commission.policy_id} - Agent: ${commission.first_name} ${commission.last_name}`,
                receipt_email: commission.email
            });
            
            // Record payment transaction in PostgreSQL
            await db.query(
                `INSERT INTO transaction (
                    related_commission_id, amount, type, status, created_at
                ) VALUES ($1, $2, 'commission_payment', 'pending', NOW())`,
                [commissionId, amount]
            );
            
            console.log(`✅ Payment intent created for commission ${commissionId}: ${paymentIntent.id}`);
            
            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: amount,
                currency: currency
            };
            
        } catch (error) {
            console.error('❌ Stripe payment intent error:', error.message);
            throw error;
        }
    }
    
    // Confirm payment and update commission status
    async confirmCommissionPayment(paymentIntentId) {
        try {
            console.log('🔍 Confirming payment:', paymentIntentId);
            
            // Retrieve payment intent from Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
            }
            
            const commissionId = paymentIntent.metadata.commission_id;
            
            // Start transaction in PostgreSQL
            await db.query('BEGIN');
            
            // Update commission status
            await db.query(
                `UPDATE commission 
                 SET status = 'paid', 
                     paid_at = CURRENT_DATE,
                     payment_reference = $1,
                     updated_at = NOW()
                 WHERE commission_id = $2`,
                [paymentIntentId, commissionId]
            );
            
            // Update transaction status
            await db.query(
                `UPDATE transaction 
                 SET status = 'completed'
                 WHERE related_commission_id = $1`,
                [commissionId]
            );
            
            // Get agent details for email
            const agentResult = await db.query(
                `SELECT a.email, a.first_name, a.last_name, c.* 
                 FROM commission c
                 JOIN agent a ON c.agent_id = a.agent_id
                 WHERE c.commission_id = $1`,
                [commissionId]
            );
            
            const agent = agentResult.rows ? agentResult.rows[0] : agentResult[0];
            
            if (agent) {
                const commissionDetails = {
                    commission_id: commissionId,
                    policy_id: agent.policy_id,
                    amount: agent.amount,
                    rate: agent.rate,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_reference: paymentIntentId
                };
                
                // Send email notification
                await emailService.sendCommissionPaymentNotification(
                    commissionId,
                    agent.email,
                    `${agent.first_name} ${agent.last_name}`,
                    commissionDetails
                );
            }
            
            await db.query('COMMIT');
            
            console.log(`✅ Commission ${commissionId} marked as paid via Stripe`);
            
            return {
                success: true,
                commissionId: commissionId,
                paymentIntent: paymentIntent
            };
            
        } catch (error) {
            await db.query('ROLLBACK');
            console.error('❌ Payment confirmation error:', error.message);
            throw error;
        }
    }
    
    // Process a commission payment (full flow)
    async processCommissionPayment(commissionId, agentId, amount) {
        try {
            console.log('💰 Processing payment for commission:', commissionId);
            const paymentIntent = await this.createCommissionPaymentIntent(
                commissionId, 
                agentId, 
                amount
            );
            return paymentIntent;
        } catch (error) {
            console.error('❌ Process payment error:', error.message);
            throw error;
        }
    }
    
    // Get payment status
    async getPaymentStatus(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            return {
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                metadata: paymentIntent.metadata
            };
        } catch (error) {
            console.error('❌ Get payment status error:', error.message);
            throw error;
        }
    }
}

module.exports = new StripePaymentService();