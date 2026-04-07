// backend/services/webhookService.js

const db = require('../config/database');
const commissionCalculationService = require('./commissionCalculationService');

class WebhookService {
    
    // Main webhook handler
    async handleWebhook(eventType, payload, source = 'api') {
        // Step 1: Log the incoming webhook
        const [logResult] = await db.query(
            `INSERT INTO webhook_logs (event_type, source, payload, processed, received_at)
             VALUES (?, ?, ?, FALSE, NOW())`,
            [eventType, source, JSON.stringify(payload)]
        );
        
        const webhookId = logResult.insertId;
        
        try {
            // Step 2: Process based on event type
            let result;
            
            switch (eventType) {
                case 'policy_sold':
                    result = await this.handlePolicySold(payload);
                    break;
                case 'policy_renewed':
                    result = await this.handlePolicyRenewed(payload);
                    break;
                case 'policy_cancelled':
                    result = await this.handlePolicyCancelled(payload);
                    break;
                default:
                    throw new Error(`Unknown webhook event type: ${eventType}`);
            }
            
            // Step 3: Mark webhook as processed
            await db.query(
                `UPDATE webhook_logs 
                 SET processed = TRUE, processed_at = NOW() 
                 WHERE webhook_id = ?`,
                [webhookId]
            );
            
            return result;
            
        } catch (error) {
            // Step 4: Log error
            await db.query(
                `UPDATE webhook_logs 
                 SET error_message = ?, processed_at = NOW() 
                 WHERE webhook_id = ?`,
                [error.message, webhookId]
            );
            
            console.error(`Webhook processing error for ${eventType}:`, error);
            throw error;
        }
    }
    
    // Handle policy sold event
    async handlePolicySold(payload) {
        const { policy_id, customer_id, agent_id, premium_amount, policy_type } = payload;
        
        console.log(`Processing policy_sold webhook for policy #${policy_id}`);
        
        // Validate required fields
        if (!policy_id || !agent_id) {
            throw new Error('Missing required fields: policy_id or agent_id');
        }
        
        // Calculate commission
        const commission = await commissionCalculationService.calculateCommissionForPolicy(policy_id);
        
        return {
            event: 'policy_sold',
            policy_id,
            commission
        };
    }
    
    // Handle policy renewed event
    async handlePolicyRenewed(payload) {
        const { policy_id, renewal_year, premium_amount } = payload;
        
        console.log(`Processing policy_renewed webhook for policy #${policy_id}, year ${renewal_year}`);
        
        // Calculate renewal commission
        const commission = await commissionCalculationService.calculateRenewalCommission(policy_id, renewal_year);
        
        return {
            event: 'policy_renewed',
            policy_id,
            renewal_year,
            commission
        };
    }
    
    // Handle policy cancelled event
    async handlePolicyCancelled(payload) {
        const { policy_id, cancellation_reason } = payload;
        
        console.log(`Processing policy_cancelled webhook for policy #${policy_id}`);
        
        // Get pending commissions for this policy
        const [commissions] = await db.query(
            `SELECT * FROM commission 
             WHERE policy_id = ? AND status = 'pending'`,
            [policy_id]
        );
        
        // Cancel all pending commissions
        for (const commission of commissions) {
            await db.query(
                `UPDATE commission 
                 SET status = 'cancelled', 
                     cancelled_at = CURDATE(),
                     cancel_reason = ?
                 WHERE commission_id = ?`,
                [cancellation_reason, commission.commission_id]
            );
        }
        
        return {
            event: 'policy_cancelled',
            policy_id,
            cancelled_commissions: commissions.length
        };
    }
    
    // Verify webhook signature (for security)
    verifySignature(req, secret) {
        const signature = req.headers['x-webhook-signature'];
        // Implement your signature verification logic
        // This depends on your webhook provider (Stripe, PayPal, etc.)
        return true; // Placeholder
    }
}

module.exports = new WebhookService();