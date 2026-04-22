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
}

module.exports = new CompanyAccountService();