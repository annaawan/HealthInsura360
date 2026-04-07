const db = require('../config/database');

// In-memory storage for policies (fallback when DB is unavailable)
const purchasedPolicies = {};

// Mock data for demo/fallback
const mockPlans = [
    {
        plan_id: 1,
        plan_name: 'Premium Health Coverage',
        plan_type: 'Individual',
        description: 'Comprehensive health coverage with hospitalization',
        premium_amount: 5000,
        coverage_amount: 500000,
        deductible: 0,
        is_active: true
    },
    {
        plan_id: 2,
        plan_name: 'Basic Health Plan',
        plan_type: 'Family',
        description: 'Basic coverage for family members',
        premium_amount: 3000,
        coverage_amount: 300000,
        deductible: 5000,
        is_active: true
    },
    {
        plan_id: 3,
        plan_name: 'Senior Care Plan',
        plan_type: 'Individual',
        description: 'Specialized plan for senior citizens',
        premium_amount: 7000,
        coverage_amount: 700000,
        deductible: 0,
        is_active: true
    }
];

// Get all insurance plans
exports.getPlans = async (req, res) => {
    try {
        try {
            const result = await db.query(
                'SELECT * FROM insurance_plans WHERE is_active = true ORDER BY premium_amount'
            );
            
            res.json({
                success: true,
                plans: result.rows
            });
        } catch (dbError) {
            console.log('Database error, returning mock data:', dbError.message);
            res.json({
                success: true,
                plans: mockPlans
            });
        }
    } catch (error) {
        console.error('Get plans error:', error);
        // Return mock data as fallback
        res.json({
            success: true,
            plans: mockPlans
        });
    }
};

exports.purchasePolicy = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'User not authenticated' 
            });
        }
        
        const { planId, startDate, endDate } = req.body;
        
        if (!planId || !startDate || !endDate) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: planId, startDate, endDate' 
            });
        }
        
        try {
            // Check which plan table exists - try insurance_plans first
            let planResult;
            
            // Try insurance_plans table
            planResult = await db.query(
                'SELECT * FROM insurance_plans WHERE plan_id = $1',
                [planId]
            );
            
            // If not found, try policy_plans table
            if (planResult.rows.length === 0) {
                planResult = await db.query(
                    'SELECT * FROM policy_plans WHERE plan_id = $1',
                    [planId]
                );
            }
            
            if (planResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Plan not found' 
                });
            }
            
            const plan = planResult.rows[0];
            
            // Generate policy number
            const policyNumber = 'POL' + Date.now() + Math.floor(Math.random() * 1000);
            
            // Check which policy table exists - try policy first
            let policyResult;
            
            // Try policy table
            try {
                policyResult = await db.query(
                    `INSERT INTO policy 
                     (customer_id, plan_id, policy_number, start_date, end_date, premium_amount, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'active')
                     RETURNING *`,
                    [userId, planId, policyNumber, startDate, endDate, plan.premium_amount]
                );
            } catch (policyError) {
                // If policy table fails, try policies table
                console.log('⚠️ policy table failed, trying policies table');
                policyResult = await db.query(
                    `INSERT INTO policies 
                     (customer_id, plan_id, policy_number, start_date, end_date, premium_amount, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'active')
                     RETURNING *`,
                    [userId, planId, policyNumber, startDate, endDate, plan.premium_amount]
                );
            }
            
            console.log(`✅ Policy ${policyNumber} purchased by customer ${userId}`);
            
            res.status(201).json({
                success: true,
                message: 'Policy purchased successfully',
                policy: policyResult.rows[0]
            });
            
        } catch (dbError) {
            console.error('❌ Database error during policy purchase:', dbError.message);
            res.status(500).json({ 
                success: false,
                error: 'Database error: ' + dbError.message 
            });
        }
    } catch (error) {
        console.error('❌ Purchase error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to purchase policy: ' + error.message 
        });
    }
};

// Get user's policies
exports.getUserPolicies = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Unauthorized' 
            });
        }
        
        try {
            const result = await db.query(
                `SELECT p.*, ip.plan_name, ip.plan_type, ip.coverage_amount
                 FROM policies p
                 LEFT JOIN insurance_plans ip ON p.plan_id = ip.plan_id
                 WHERE p.customer_id = $1
                 ORDER BY p.created_at DESC`,
                [userId]
            );
            
            console.log(`✅ Retrieved ${result.rows.length} policies from database for customer ${userId}`);
            
            res.json({
                success: true,
                policies: result.rows,
                source: 'database'
            });
        } catch (dbError) {
            console.error('❌ Database query failed:', dbError.message);
            console.log('⚠️  Falling back to in-memory storage. Run npm run setup-db for persistent storage.');
            
            // Return policies from in-memory fallback
            const userPolicies = purchasedPolicies[userId] || [];
            
            res.json({
                success: true,
                policies: userPolicies,
                source: 'memory',
                warning: 'Data stored in temporary memory - will be lost on server restart. Please run: npm run setup-db'
            });
        }
    } catch (error) {
        console.error('❌ Get policies error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get policies: ' + error.message 
        });
    }
};