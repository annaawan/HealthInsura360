// backend/src/services/stripePaymentService.js

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');
const emailService = require('./emailServices');
const auditLogService = require('./auditLogServices');

class StripePaymentService {
    
    // ============ GENERIC PAYMENT INTENT (For Customer Policy Purchases) ============
    async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        try {
            console.log('💰 Creating payment intent for customer purchase:', { amount, currency, metadata });
            
            const amountInCents = Math.round(amount * 100);
            
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: currency.toLowerCase(),
                metadata: {
                    ...metadata,
                    purpose: 'policy_purchase'
                },
                description: metadata.policy_name ? `Policy purchase: ${metadata.policy_name}` : 'Health insurance policy purchase',
                receipt_email: metadata.customer_email,
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            
            console.log(`✅ Payment intent created: ${paymentIntent.id}`);
            
            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: amount,
                currency: currency
            };
            
        } catch (error) {
            console.error('❌ Error creating payment intent:', error);
            throw error;
        }
    }

    // ============ CONFIRM PAYMENT INTENT ============
    async confirmPaymentIntent(paymentIntentId) {
        try {
            console.log('💰 Confirming payment intent:', paymentIntentId);
            
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            console.log(`📊 Payment intent status: ${paymentIntent.status}`);
            
            if (paymentIntent.status === 'succeeded') {
                console.log('✅ Payment already succeeded');
                return paymentIntent;
            }
            
            if (paymentIntent.status === 'requires_confirmation') {
                const confirmed = await stripe.paymentIntents.confirm(paymentIntentId);
                console.log(`✅ Payment confirmed: ${confirmed.status}`);
                return confirmed;
            }
            
            if (paymentIntent.status === 'requires_capture') {
                const captured = await stripe.paymentIntents.capture(paymentIntentId);
                console.log(`✅ Payment captured: ${captured.status}`);
                return captured;
            }
            
            return paymentIntent;
            
        } catch (error) {
            console.error('❌ Error confirming payment intent:', error);
            throw error;
        }
    }

    // ============ RETRIEVE PAYMENT INTENT ============
    async retrievePaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('❌ Error retrieving payment intent:', error);
            throw error;
        }
    }

    // ============ COMMISSION PAYOUT METHODS (Existing) ============
    
    async createCommissionPaymentIntent(commissionId, agentId, amount, currency = 'usd') {
        try {
            console.log('🔍 Looking for commission:', commissionId);
            
            const commissionResult = await db.query(
                `SELECT c.*, a.email, a.first_name, a.last_name 
                 FROM commission c
                 JOIN agent a ON c.agent_id = a.agent_id
                 WHERE c.commission_id = $1 AND LOWER(c.status) = 'pending'`,
                [commissionId]
            );
            
            const commission = commissionResult.rows ? commissionResult.rows[0] : commissionResult[0];
            
            if (!commission) {
                console.error('❌ Commission not found for ID:', commissionId);
                throw new Error('Commission not found or already paid');
            }
            
            console.log('✅ Commission found:', commission.commission_id);
            
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
    
    async confirmCommissionPayment(paymentIntentId) {
    try {
        console.log('🔍 Confirming payment:', paymentIntentId);
        
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
        }
        
        const commissionId = paymentIntent.metadata.commission_id;
        const amount = paymentIntent.amount / 100;
        
        await db.query('BEGIN');
        
        // 1. Get commission details
        const commissionResult = await db.query(
            `SELECT c.*, a.email, a.first_name, a.last_name 
             FROM commission c
             JOIN agent a ON c.agent_id = a.agent_id
             WHERE c.commission_id = $1`,
            [commissionId]
        );
        
        const commission = commissionResult.rows[0];
        const agentId = commission.agent_id;
        const commissionAmount = parseFloat(commission.amount);
        
        // 2. Update commission status to paid
        await db.query(
            `UPDATE commission 
             SET status = 'paid', 
                 paid_at = CURRENT_DATE,
                 payment_reference = $1,
                 updated_at = NOW()
             WHERE commission_id = $2`,
            [paymentIntentId, commissionId]
        );
        
        // 3. Update transaction status to completed
        await db.query(
            `UPDATE transaction 
             SET status = 'completed',
                 updated_at = NOW()
             WHERE related_commission_id = $1`,
            [commissionId]
        );
        
        // ============================================
        // ✅ 4. DEBIT COMPANY ACCOUNT
        // ============================================
        const debitResult = await db.query(
            `UPDATE company_account 
             SET balance = balance - $1,
                 updated_at = NOW()
             WHERE account_type = 'operating'
             RETURNING balance`,
            [commissionAmount]
        );
        
        console.log(`✅ Company account debited: $${commissionAmount}. New balance: $${debitResult.rows[0].balance}`);
        
        // ============================================
        // ✅ 5. CREDIT AGENT PAYMENT ACCOUNT
        // ============================================
        // First check if agent payment account exists
        let agentAccountResult = await db.query(
            `SELECT * FROM agent_payment_account WHERE agent_id = $1`,
            [agentId]
        );
        
        if (agentAccountResult.rows.length === 0) {
            // Create account if it doesn't exist
            await db.query(
                `INSERT INTO agent_payment_account (agent_id, balance, total_earned, status, created_at)
                 VALUES ($1, 0, 0, 'active', NOW())`,
                [agentId]
            );
            agentAccountResult = await db.query(
                `SELECT * FROM agent_payment_account WHERE agent_id = $1`,
                [agentId]
            );
        }
        
        // Credit agent's account
        const creditResult = await db.query(
            `UPDATE agent_payment_account 
             SET balance = balance + $1,
                 total_earned = total_earned + $1,
                 last_payment_date = CURRENT_DATE,
                 updated_at = NOW()
             WHERE agent_id = $2
             RETURNING balance, total_earned`,
            [commissionAmount, agentId]
        );
        
        console.log(`✅ Agent ${agentId} account credited: $${commissionAmount}. New balance: $${creditResult.rows[0].balance}`);
        
        // ============================================
        // ✅ 6. RECORD IN LEDGER TRANSACTIONS (Corrected column names)
        // ============================================
        await db.query(
            `INSERT INTO ledger_transactions (
                transaction_type, amount, 
                from_account_type, from_account_id,
                to_account_type, to_account_id, 
                reference_id, description, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW())`,
            [
                'commission_payout',
                commissionAmount,
                'company',           // from_account_type
                1,                   // from_account_id (company account_id)
                'agent',             // to_account_type
                agentId,             // to_account_id
                commissionId.toString(),  // reference_id
                `Commission payout for commission #${commissionId} - Agent: ${commission.first_name} ${commission.last_name}`
            ]
        );
        
        console.log(`✅ Ledger entry created for commission ${commissionId}`);
        
        // 7. Send email notification
        if (commission.email) {
            const commissionDetails = {
                commission_id: commissionId,
                policy_id: commission.policy_id,
                amount: commissionAmount,
                rate: commission.rate,
                payment_date: new Date().toISOString().split('T')[0],
                payment_reference: paymentIntentId
            };
            
            emailService.sendCommissionPaymentNotification(
                commissionId,
                commission.email,
                `${commission.first_name} ${commission.last_name}`,
                commissionDetails
            ).catch(err => console.error('Email error:', err.message));
        }
        
        await db.query('COMMIT');
        
        console.log(`✅ Commission ${commissionId} marked as paid via Stripe`);
        console.log(`✅ Company balance: $${debitResult.rows[0].balance}`);
        console.log(`✅ Agent balance: $${creditResult.rows[0].balance}`);
        
        return {
            success: true,
            commissionId: commissionId,
            paymentIntent: paymentIntent,
            company_balance: debitResult.rows[0].balance,
            agent_balance: creditResult.rows[0].balance
        };
        
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Payment confirmation error:', error.message);
        throw error;
    }
}
    // async confirmCommissionPayment(paymentIntentId) {
    //     try {
    //         console.log('🔍 Confirming payment:', paymentIntentId);
            
    //         const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
    //         if (paymentIntent.status !== 'succeeded') {
    //             throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    //         }
            
    //         const commissionId = paymentIntent.metadata.commission_id;
            
    //         await db.query('BEGIN');
            
    //         await db.query(
    //             `UPDATE commission 
    //              SET status = 'paid', 
    //                  paid_at = CURRENT_DATE,
    //                  payment_reference = $1,
    //                  updated_at = NOW()
    //              WHERE commission_id = $2`,
    //             [paymentIntentId, commissionId]
    //         );
            
    //         await db.query(
    //             `UPDATE transaction 
    //              SET status = 'completed'
    //              WHERE related_commission_id = $1`,
    //             [commissionId]
    //         );
            
    //         const agentResult = await db.query(
    //             `SELECT a.email, a.first_name, a.last_name, c.* 
    //              FROM commission c
    //              JOIN agent a ON c.agent_id = a.agent_id
    //              WHERE c.commission_id = $1`,
    //             [commissionId]
    //         );
            
    //         const agent = agentResult.rows ? agentResult.rows[0] : agentResult[0];
            
    //         if (agent) {
    //             const commissionDetails = {
    //                 commission_id: commissionId,
    //                 policy_id: agent.policy_id,
    //                 amount: agent.amount,
    //                 rate: agent.rate,
    //                 payment_date: new Date().toISOString().split('T')[0],
    //                 payment_reference: paymentIntentId
    //             };
                
    //             emailService.sendCommissionPaymentNotification(
    //                 commissionId,
    //                 agent.email,
    //                 `${agent.first_name} ${agent.last_name}`,
    //                 commissionDetails
    //             ).catch(err => console.error('Email error:', err.message));
    //         }
            
    //         await db.query('COMMIT');
            
    //         console.log(`✅ Commission ${commissionId} marked as paid via Stripe`);
            
    //         return {
    //             success: true,
    //             commissionId: commissionId,
    //             paymentIntent: paymentIntent
    //         };
            
    //     } catch (error) {
    //         await db.query('ROLLBACK');
    //         console.error('❌ Payment confirmation error:', error.message);
    //         throw error;
    //     }
    // }
    
    async processCommissionPayment(commissionId, agentId, amount, paymentMethod = 'stripe') {
    try {
        console.log('💰 Processing payment for commission:', commissionId);
        console.log('📝 Payment method:', paymentMethod);
        
        const paymentIntent = await this.createCommissionPaymentIntent(commissionId, agentId, amount, paymentMethod);
        return paymentIntent;
    } catch (error) {
        console.error('❌ Process payment error:', error.message);
        throw error;
    }
}
    
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
    
    async createClaimPayout(claimData) {
        try {
            console.log('💰 Processing claim payout for:', claimData.claim_id);
            
            if (claimData.stripe_account_id) {
                const transfer = await stripe.transfers.create({
                    amount: Math.round(claimData.amount * 100),
                    currency: 'usd',
                    destination: claimData.stripe_account_id,
                    transfer_group: `CLAIM_${claimData.claim_id}`,
                    metadata: {
                        claim_id: claimData.claim_id,
                        customer_id: claimData.customer_id,
                        policy_id: claimData.policy_id,
                        claim_type: claimData.claim_type
                    },
                    description: `Claim payout for claim #${claimData.claim_id} - ${claimData.claim_type}`
                });
                
                console.log(`✅ Claim payout created: ${transfer.id}`);
                
                return {
                    success: true,
                    transfer_id: transfer.id,
                    amount: claimData.amount,
                    status: transfer.status
                };
            } else {
                console.log('⚠️ No Stripe account ID found, creating payment record only');
                return {
                    success: true,
                    payment_record: true,
                    amount: claimData.amount,
                    message: 'Payment recorded in system. Stripe payout requires customer Stripe account.'
                };
            }
            
        } catch (error) {
            console.error('❌ Claim payout error:', error.message);
            throw error;
        }
    }
    
    async getClaimPayoutStatus(claimId) {
        try {
            const result = await db.query(
                `SELECT payment_status, payment_transfer_date, payment_intent_id 
                 FROM claim 
                 WHERE claim_id = $1`,
                [claimId]
            );
            
            const claim = result.rows ? result.rows[0] : result[0];
            
            if (claim && claim.payment_intent_id) {
                const paymentIntent = await stripe.paymentIntents.retrieve(claim.payment_intent_id);
                return {
                    status: paymentIntent.status,
                    amount: paymentIntent.amount / 100,
                    transfer_date: claim.payment_transfer_date
                };
            }
            
            return {
                status: claim?.payment_status || 'pending',
                amount: null,
                transfer_date: claim?.payment_transfer_date
            };
            
        } catch (error) {
            console.error('❌ Get payout status error:', error.message);
            throw error;
        }
    }
}

module.exports = new StripePaymentService();