// backend/services/commissionCalculationService.js

const db = require('../config/database');

class CommissionCalculationService {
    
    // Main function to calculate commission for a policy
    async calculateCommissionForPolicy(policyId) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Step 1: Get policy details with agent information
            const [policy] = await connection.query(
                `SELECT p.*, 
                        a.agent_id, 
                        a.commission_rate as agent_base_rate,
                        CONCAT(a.first_name, ' ', a.last_name) as agent_name
                 FROM policy p
                 JOIN agent a ON p.agent_id = a.agent_id
                 WHERE p.policy_id = ?`,
                [policyId]
            );
            
            if (!policy.length) {
                throw new Error(`Policy with ID ${policyId} not found`);
            }
            
            const policyData = policy[0];
            
            // Step 2: Check if commission already exists for this policy
            const [existingCommission] = await connection.query(
                'SELECT commission_id FROM commission WHERE policy_id = ?',
                [policyId]
            );
            
            if (existingCommission.length) {
                console.log(`Commission already exists for policy ${policyId}`);
                await connection.rollback();
                return { already_exists: true, commission_id: existingCommission[0].commission_id };
            }
            
            // Step 3: Calculate commission rate
            let commissionRate = parseFloat(policyData.agent_base_rate) || 10; // Default 10%
            
            // Step 4: Apply tiered commission based on agent's yearly sales
            const [salesData] = await connection.query(
                `SELECT COALESCE(SUM(premium_amount), 0) as total_sales 
                 FROM policy 
                 WHERE agent_id = ? 
                 AND YEAR(created_at) = YEAR(CURDATE())
                 AND status = 'active'`,
                [policyData.agent_id]
            );
            
            const yearlySales = parseFloat(salesData[0].total_sales);
            const newTotal = yearlySales + parseFloat(policyData.premium_amount);
            
            // Tier logic
            if (newTotal > 100000) commissionRate = 18;
            else if (newTotal > 50000) commissionRate = 15;
            else if (newTotal > 25000) commissionRate = 12;
            else if (newTotal > 10000) commissionRate = 8;
            
            // Step 5: Apply policy type bonus
            if (policyData.policy_type === 'Family') commissionRate += 2;
            if (policyData.policy_type === 'Medicare') commissionRate += 3;
            
            // Step 6: Calculate commission amount
            const premiumAmount = parseFloat(policyData.premium_amount);
            const commissionAmount = (premiumAmount * commissionRate) / 100;
            
            // Step 7: Create commission record
            const [result] = await connection.query(
                `INSERT INTO commission (
                    agent_id, 
                    policy_id, 
                    amount, 
                    rate, 
                    created_at, 
                    premium_amount, 
                    status, 
                    agent_name
                ) VALUES (?, ?, ?, ?, CURDATE(), ?, 'pending', ?)`,
                [
                    policyData.agent_id,
                    policyId,
                    commissionAmount.toFixed(2),
                    commissionRate,
                    premiumAmount,
                    policyData.agent_name
                ]
            );
            
            // Step 8: Update agent's total sales
            await connection.query(
                `UPDATE agent 
                 SET total_sales = total_sales + ? 
                 WHERE agent_id = ?`,
                [premiumAmount, policyData.agent_id]
            );
            
            // Step 9: Audit log
            await connection.query(
                `INSERT INTO audit_log (
                    user_type, 
                    user_id, 
                    action, 
                    entity, 
                    entity_id, 
                    timestamp
                ) VALUES ('system', ?, 'commission_calculated', 'commission', ?, NOW())`,
                [policyData.agent_id, result.insertId]
            );
            
            // Step 10: Queue email notification
            await connection.query(
                `INSERT INTO email_notifications (
                    recipient_email, 
                    recipient_name, 
                    notification_type, 
                    subject, 
                    content, 
                    status, 
                    created_at
                ) VALUES (?, ?, 'commission_earned', ?, ?, 'pending', NOW())`,
                [
                    policyData.email, // Assuming agent has email field
                    policyData.agent_name,
                    'New Commission Earned!',
                    `Dear ${policyData.agent_name},<br><br>
                     Congratulations! You've earned a commission of $${commissionAmount.toFixed(2)}<br>
                     from policy #${policyId}.<br><br>
                     Policy Type: ${policyData.policy_type}<br>
                     Premium Amount: $${premiumAmount.toFixed(2)}<br>
                     Commission Rate: ${commissionRate}%<br><br>
                     Thank you for your hard work!`
                ]
            );
            
            await connection.commit();
            
            console.log(`Commission calculated for policy ${policyId}: $${commissionAmount} at ${commissionRate}%`);
            
            return {
                success: true,
                commission_id: result.insertId,
                amount: commissionAmount,
                rate: commissionRate,
                policy_id: policyId,
                agent_id: policyData.agent_id
            };
            
        } catch (error) {
            await connection.rollback();
            console.error('Commission calculation error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
    
    // Calculate commission for policy renewal
    async calculateRenewalCommission(policyId, renewalYear) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [policy] = await connection.query(
                `SELECT p.*, 
                        CONCAT(a.first_name, ' ', a.last_name) as agent_name
                 FROM policy p
                 JOIN agent a ON p.agent_id = a.agent_id
                 WHERE p.policy_id = ?`,
                [policyId]
            );
            
            if (!policy.length) {
                throw new Error(`Policy with ID ${policyId} not found`);
            }
            
            const policyData = policy[0];
            
            // Check if renewal commission already exists
            const [existingCommission] = await connection.query(
                'SELECT commission_id FROM commission WHERE policy_id = ? AND is_renewal = TRUE AND renewal_year = ?',
                [policyId, renewalYear]
            );
            
            if (existingCommission.length) {
                await connection.rollback();
                return { already_exists: true };
            }
            
            // Renewal commission rates
            let renewalRate = 5; // 5% for first renewal
            if (renewalYear > 1) renewalRate = 3; // 3% for subsequent renewals
            
            const premiumAmount = parseFloat(policyData.premium_amount);
            const commissionAmount = (premiumAmount * renewalRate) / 100;
            
            // Create renewal commission
            const [result] = await connection.query(
                `INSERT INTO commission (
                    agent_id, policy_id, amount, rate, created_at, 
                    premium_amount, status, agent_name, is_renewal, renewal_year
                ) VALUES (?, ?, ?, ?, CURDATE(), ?, 'pending', ?, TRUE, ?)`,
                [
                    policyData.agent_id,
                    policyId,
                    commissionAmount.toFixed(2),
                    renewalRate,
                    premiumAmount,
                    policyData.agent_name,
                    renewalYear
                ]
            );
            
            await connection.commit();
            
            return {
                success: true,
                commission_id: result.insertId,
                amount: commissionAmount,
                rate: renewalRate
            };
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new CommissionCalculationService();