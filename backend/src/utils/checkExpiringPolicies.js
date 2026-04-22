const db = require('../config/database');
const { createNotification } = require('../routes/notificationRoutes');

const checkExpiringPolicies = async () => {
    try {
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        
        // Find policies expiring in next 30 days
        const result = await db.query(
            `SELECT p.id, p.policy_number, p.end_date, p.customer_id, 
                    ip.plan_name, ip.coverage_amount
             FROM policies p
             JOIN insurance_plans ip ON p.plan_id = ip.plan_id
             WHERE p.end_date BETWEEN $1 AND $2
             AND p.status = 'active'`,
            [today, thirtyDaysLater]
        );
        
        for (const policy of result.rows) {
            const daysUntilExpiry = Math.ceil((new Date(policy.end_date) - today) / (1000 * 60 * 60 * 24));
            
            await createNotification(
                policy.customer_id,
                'customer',
                'policy_expiring',
                'Policy Expiring Soon',
                `Your policy "${policy.plan_name}" (${policy.policy_number}) will expire in ${daysUntilExpiry} days on ${new Date(policy.end_date).toLocaleDateString()}. Renew now to avoid coverage gaps!`,
                policy.id
            );
        }
        
        console.log(`✅ Checked expiring policies: ${result.rows.length} found`);
    } catch (error) {
        console.error('Error checking expiring policies:', error);
    }
};

// Also check for already expired policies
const checkExpiredPolicies = async () => {
    try {
        const today = new Date();
        
        const result = await db.query(
            `SELECT p.id, p.policy_number, p.end_date, p.customer_id, ip.plan_name
             FROM policies p
             JOIN insurance_plans ip ON p.plan_id = ip.plan_id
             WHERE p.end_date < $1
             AND p.status = 'active'`,
            [today]
        );
        
        for (const policy of result.rows) {
            await createNotification(
                policy.customer_id,
                'customer',
                'policy_expired',
                'Policy Expired',
                `Your policy "${policy.plan_name}" (${policy.policy_number}) has expired on ${new Date(policy.end_date).toLocaleDateString()}. Please renew to continue coverage.`,
                policy.id
            );
            
            // Update policy status to expired
            await db.query(
                `UPDATE policies SET status = 'expired' WHERE id = $1`,
                [policy.id]
            );
        }
        
        console.log(`✅ Checked expired policies: ${result.rows.length} found`);
    } catch (error) {
        console.error('Error checking expired policies:', error);
    }
};

// Run these functions
const runExpiryChecks = async () => {
    await checkExpiringPolicies();
    await checkExpiredPolicies();
};

module.exports = runExpiryChecks;