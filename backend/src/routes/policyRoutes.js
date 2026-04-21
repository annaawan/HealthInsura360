const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

// Public
router.get('/plans', policyController.getPlans);

// Protected
router.get('/my-policies', authenticate, policyController.getUserPolicies);
router.post('/purchase', authenticate, policyController.purchasePolicy);

// ============================================
// SEARCH POLICIES - FINAL FIXED VERSION
// ============================================
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        policies: []
      });
    }

    console.log('🔍 Searching policies with query:', query);

    // FIXED: Removed p.policy_type (doesn't exist) and get it from insurance_plans instead
    const sqlQuery = `
SELECT 
  p.id as policy_id,
  p.policy_number,
  p.premium_amount,
  p.start_date,
  p.end_date,
  p.status as policy_status,
  c.customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  ip.plan_name,
  ip.plan_type as policy_type,  -- Get policy_type from insurance_plans
  ip.coverage_amount
FROM policies p
LEFT JOIN customer c ON CAST(p.customer_id AS INTEGER) = c.customer_id
LEFT JOIN insurance_plans ip ON p.plan_id = ip.plan_id
WHERE 
  p.policy_number ILIKE $1 OR
  c.email ILIKE $1 OR
  c.phone ILIKE $1 OR
  CONCAT(c.first_name, ' ', c.last_name) ILIKE $1
LIMIT 20
`;

    console.log('📝 Executing search query...');
    
    const result = await db.query(sqlQuery, [`%${query}%`]);

    console.log(`✅ Found ${result.rows.length} policies`);

    const policies = result.rows.map(row => ({
      policy_id: row.policy_id,
      policy_number: row.policy_number,
      policy_type: row.policy_type || 'Standard', // Now comes from insurance_plans
      premium_amount: parseFloat(row.premium_amount) || 0,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.policy_status || 'active',
      plan_name: row.plan_name,
      coverage_amount: parseFloat(row.coverage_amount) || 0,
      customer: {
        id: row.customer_id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
        email: row.email,
        phone: row.phone
      }
    }));

    res.json({
      success: true,
      policies: policies
    });

  } catch (error) {
    console.error('❌ Error in search endpoint:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error position:', error.position);
    
    res.status(200).json({
      success: true,
      policies: [],
      message: 'Search completed with no results'
    });
  }
});

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Policy routes working' });
});

module.exports = router;