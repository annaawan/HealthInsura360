// backend/src/services/companyAccountService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');

class CompanyAccountService {
    
    
    // Initialize company account
    async initializeCompanyAccount() {
        try {
            // Check if company account exists
            const result = await db.query(`
                SELECT * FROM company_account WHERE account_name = 'HealthInsura360 Main Account'
            `);
            
            if (result.rows.length === 0) {
                // Create company account in database
                await db.query(`
                    INSERT INTO company_account (
                        account_name, account_type, balance, status
                    ) VALUES ($1, $2, $3, $4)
                `, ['HealthInsura360 Main Account', 'operating', 1000000.00, 'active']);
                
                console.log('✅ Company account initialized');
            } else {
                console.log('✅ Company account already exists');
            }
        } catch (error) {
            console.error('❌ Failed to initialize company account:', error.message);
        }
    }
    
    // Get company balance
    async getCompanyBalance() {
        try {
            const result = await db.query(`
                SELECT balance, account_name, stripe_account_id 
                FROM company_account 
                WHERE status = 'active'
            `);
            return result.rows[0] || { balance: 0 };
        } catch (error) {
            console.error('Error getting company balance:', error);
            return { balance: 0 };
        }
    }
    
    // Credit company account (when customer pays premium)
    async creditCompanyAccount(amount, source, referenceId, description) {
        try {
            // Update company balance
            const result = await db.query(`
                UPDATE company_account 
                SET balance = balance + $1,
                    updated_at = NOW()
                WHERE account_type = 'operating'
                RETURNING balance
            `, [amount]);
            
            // Record ledger entry
            await db.query(`
                INSERT INTO ledger_transactions (
                    transaction_type, amount, from_account_type, from_account_id,
                    to_account_type, to_account_id, reference_id, description, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW())
            `, ['premium_payment', amount, 'customer', source, 'company', 1, referenceId, description]);
            
            console.log(`✅ Credited company account: $${amount} from ${description}`);
            return { success: true, new_balance: result.rows[0].balance };
            
        } catch (error) {
            console.error('Error crediting company account:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Debit company account (when paying claims)
    async debitCompanyAccount(amount, destination, referenceId, description) {
        try {
            // Check sufficient balance
            const balanceCheck = await db.query(`
                SELECT balance FROM company_account WHERE account_type = 'operating'
            `);
            
            if (!balanceCheck.rows[0] || balanceCheck.rows[0].balance < amount) {
                throw new Error(`Insufficient company balance. Available: $${balanceCheck.rows[0]?.balance || 0}`);
            }
            
            // Update company balance
            const result = await db.query(`
                UPDATE company_account 
                SET balance = balance - $1,
                    updated_at = NOW()
                WHERE account_type = 'operating'
                RETURNING balance
            `, [amount]);
            
            // Record ledger entry
            await db.query(`
                INSERT INTO ledger_transactions (
                    transaction_type, amount, from_account_type, from_account_id,
                    to_account_type, to_account_id, reference_id, description, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW())
            `, ['claim_payout', amount, 'company', 1, 'customer', destination, referenceId, description]);
            
            console.log(`✅ Debited company account: $${amount} for ${description}`);
            return { success: true, new_balance: result.rows[0].balance };
            
        } catch (error) {
            console.error('Error debiting company account:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Get ledger transactions
    async getLedgerTransactions(limit = 100, offset = 0) {
        try {
            const result = await db.query(`
                SELECT * FROM ledger_transactions 
                ORDER BY created_at DESC 
                LIMIT $1 OFFSET $2
            `, [limit, offset]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting ledger:', error);
            return [];
        }
    }
    
    // Get company account summary
    async getCompanySummary() {
        try {
            const result = await db.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN transaction_type = 'premium_payment' THEN amount ELSE 0 END), 0) as total_premiums,
                    COALESCE(SUM(CASE WHEN transaction_type = 'claim_payout' THEN amount ELSE 0 END), 0) as total_claims_paid,
                    COALESCE(SUM(CASE WHEN transaction_type = 'commission_payout' THEN amount ELSE 0 END), 0) as total_commissions_paid,
                    COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END), 0) as total_refunds,
                    COUNT(CASE WHEN transaction_type = 'premium_payment' THEN 1 END) as premium_count,
                    COUNT(CASE WHEN transaction_type = 'claim_payout' THEN 1 END) as claim_count
                FROM ledger_transactions
                WHERE status = 'completed'
            `);
            
            const balance = await this.getCompanyBalance();
            
            return {
                current_balance: balance.balance,
                ...result.rows[0]
            };
        } catch (error) {
            console.error('Error getting company summary:', error);
            return null;
        }
    }
    // ============ CUSTOMER POLICY PAYMENT WITH COMPANY ACCOUNT CREDIT ============

// Process customer policy payment (create intent)
async processCustomerPolicyPayment(customerId, policyId, amount, paymentMethodId = null) {
    try {
        console.log('💰 Processing customer policy payment:', { customerId, policyId, amount });
        
        // 1. Get customer details
        const customerResult = await db.query(
            `SELECT customer_id, email, first_name, last_name, stripe_customer_id 
             FROM customer WHERE customer_id = $1 AND status = 'active'`,
            [customerId]
        );
        
        if (customerResult.rows.length === 0) {
            throw new Error('Customer not found or inactive');
        }
        
        const customer = customerResult.rows[0];
        
        // 2. Get policy and plan details
        const policyResult = await db.query(
            `SELECT p.*, pp.plan_name, pp.coverage_amount, pp.premium_amount
             FROM policy p
             JOIN policy_plans pp ON p.plan_id = pp.plan_id
             WHERE p.policy_id = $1 AND p.customer_id = $2`,
            [policyId, customerId]
        );
        
        if (policyResult.rows.length === 0) {
            throw new Error('Policy not found');
        }
        
        const policy = policyResult.rows[0];
        
        // 3. Create or retrieve Stripe customer
        let stripeCustomerId = customer.stripe_customer_id;
        
        if (!stripeCustomerId) {
            const stripeCustomer = await stripe.customers.create({
                email: customer.email,
                name: `${customer.first_name} ${customer.last_name}`,
                metadata: {
                    customer_id: customerId
                }
            });
            
            stripeCustomerId = stripeCustomer.id;
            
            // Save Stripe customer ID to database
            await db.query(
                `UPDATE customer SET stripe_customer_id = $1 WHERE customer_id = $2`,
                [stripeCustomerId, customerId]
            );
        }
        
        // 4. Create PaymentIntent
        const amountInCents = Math.round(amount * 100);
        
        const paymentIntentData = {
            amount: amountInCents,
            currency: 'usd',
            customer: stripeCustomerId,
            metadata: {
                customer_id: customerId.toString(),
                policy_id: policyId.toString(),
                purpose: 'policy_purchase',
                plan_name: policy.plan_name
            },
            description: `Policy purchase: ${policy.plan_name} - Premium: $${amount}`,
            receipt_email: customer.email,
            payment_method_types: ['card'],
            setup_future_usage: 'off'
        };
        
        // If payment method is provided, attach and confirm
        if (paymentMethodId) {
            paymentIntentData.payment_method = paymentMethodId;
            paymentIntentData.confirm = true;
        }
        
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
        
        console.log(`✅ Payment intent created: ${paymentIntent.id}, Status: ${paymentIntent.status}`);
        
        return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            requiresAction: paymentIntent.status === 'requires_action',
            status: paymentIntent.status
        };
        
    } catch (error) {
        console.error('❌ Error processing customer payment:', error);
        throw error;
    }
}

// Complete payment and credit company account
async completeCustomerPolicyPayment(paymentIntentId) {
    const companyAccountService = require('./companyAccountService');
    
    try {
        console.log('💰 Completing customer policy payment:', paymentIntentId);
        
        await db.query('BEGIN');
        
        // 1. Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
        }
        
        const customerId = parseInt(paymentIntent.metadata.customer_id);
        const policyId = parseInt(paymentIntent.metadata.policy_id);
        const amount = paymentIntent.amount / 100;
        const planName = paymentIntent.metadata.plan_name;
        
        console.log(`✅ Payment successful: Customer ${customerId}, Policy ${policyId}, Amount $${amount}`);
        
        // 2. Create payment record
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        await db.query(
            `INSERT INTO payment (
                payment_id, policy_id, customer_id, amount, method, status, 
                transaction_ref, paid_at
            ) VALUES ($1, $2, $3, $4, 'stripe', 'Completed', $5, NOW())`,
            [paymentId, policyId, customerId, amount, transactionId]
        );
        
        // 3. Create transaction record
        await db.query(
            `INSERT INTO transaction (
                transaction_id, related_payment_id, amount, type, status, 
                created_at, payment_method, notes
            ) VALUES ($1, $2, $3, 'premium_payment', 'completed', NOW(), 'stripe', $4)`,
            [transactionId, paymentId, amount, `Premium payment for policy #${policyId} - ${planName}`]
        );
        
        // 4. Credit company account
        const creditResult = await companyAccountService.creditCompanyAccount(
            amount,
            customerId,
            policyId,
            `Premium payment from customer ${customerId} for policy #${policyId} - ${planName}`
        );
        
        if (!creditResult.success) {
            throw new Error(`Failed to credit company account: ${creditResult.error}`);
        }
        
        // 5. Update policy status and remaining coverage
        await db.query(
            `UPDATE policy 
             SET status = 'active', 
                 remaining_coverage = sum_insured,
                 updated_at = NOW()
             WHERE policy_id = $1`,
            [policyId]
        );
        
        await db.query('COMMIT');
        
        console.log(`✅ Customer payment completed: $${amount} credited to company account. New balance: $${creditResult.new_balance}`);
        
        return {
            success: true,
            paymentId: paymentId,
            transactionId: transactionId,
            amount: amount,
            companyBalance: creditResult.new_balance,
            policyId: policyId
        };
        
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Error completing customer payment:', error);
        throw error;
    }
}

// Get payment status
async getCustomerPaymentStatus(paymentIntentId) {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        return {
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata
        };
    } catch (error) {
        console.error('Error getting payment status:', error);
        throw error;
    }
}
}

module.exports = new CompanyAccountService();