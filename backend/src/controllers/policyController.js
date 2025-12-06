const db = require('../config/database');

// Get all insurance plans
exports.getPlans = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM insurance_plans WHERE is_active = true ORDER BY premium_amount'
        );
        
        res.json({
            success: true,
            plans: result.rows
        });
        
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
};

// Purchase a policy
exports.purchasePolicy = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { planId, startDate, endDate } = req.body;
        
        // Get plan details
        const planResult = await db.query(
            'SELECT * FROM insurance_plans WHERE plan_id = $1',
            [planId]
        );
        
        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        
        const plan = planResult.rows[0];
        
        // Generate policy number
        const policyNumber = 'POL' + Date.now() + Math.floor(Math.random() * 1000);
        
        // Create policy
        const policyResult = await db.query(
            `INSERT INTO policies 
             (customer_id, plan_id, policy_number, start_date, end_date, premium_amount, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active')
             RETURNING *`,
            [userId, planId, policyNumber, startDate, endDate, plan.premium_amount]
        );
        
        res.status(201).json({
            success: true,
            message: 'Policy purchased successfully',
            policy: policyResult.rows[0]
        });
        
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Failed to purchase policy' });
    }
};

// Get user's policies
exports.getUserPolicies = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await db.query(
            `SELECT p.*, ip.plan_name, ip.plan_type 
             FROM policies p
             JOIN insurance_plans ip ON p.plan_id = ip.plan_id
             WHERE p.customer_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            policies: result.rows
        });
        
    } catch (error) {
        console.error('Get policies error:', error);
        res.status(500).json({ error: 'Failed to get policies' });
    }
};