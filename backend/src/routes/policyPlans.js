const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const auditController = require('../controllers/auditController');

// // Get all policy plans - Allow both admin AND customers to view
// router.get('/', authenticate, async (req, res) => {
//   try {
//     const result = await db.query(`
//       SELECT * FROM policy_plans 
//       WHERE status = 'active'
//       ORDER BY created_at DESC
//     `);
    
//     res.json({
//       success: true,
//       data: result.rows,
//       count: result.rowCount
//     });
//   } catch (error) {
//     console.error('Error fetching policy plans:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch policy plans',
//       error: error.message
//     });
//   }
// });
// Get all policy plans - With case-insensitive status filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const userType = req.user?.userType;
    
    let query = `SELECT * FROM policy_plans`;
    let params = [];
    let whereClauses = [];
    
    // For customers, only show active plans
    if (userType === 'customer') {
      whereClauses.push(`LOWER(status) = 'active'`);
    } 
    // For admin, apply status filter if provided
    else if (status && status !== 'all') {
      whereClauses.push(`LOWER(status) = LOWER($1)`);
      params.push(status);
    }
    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      filter_applied: status || 'all'
    });
  } catch (error) {
    console.error('Error fetching policy plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy plans',
      error: error.message
    });
  }
});
// Create new policy plan
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      plan_name,
      description,
      policy_type,
      category,
      premium_amount,
      coverage_amount,
      coverage_details,
      deductible,
      max_claim_limit,
      waiting_period_days,
      renewal_period_months,
      eligibility_criteria,
      exclusions,
      benefits,
      status
    } = req.body;

    const adminId = req.user?.userId || req.user?.id || 1;

    const result = await db.query(`
      INSERT INTO policy_plans (
        plan_name, description, policy_type, category, premium_amount, coverage_amount,
        coverage_details, deductible, max_claim_limit, waiting_period_days,
        renewal_period_months, eligibility_criteria, exclusions, benefits, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `, [
      plan_name,
      description || null,
      policy_type,
      category,
      premium_amount,
      coverage_amount,
      coverage_details || null,
      deductible || 0,
      max_claim_limit,
      waiting_period_days || 30,
      renewal_period_months || 12,
      eligibility_criteria || null,
      exclusions || null,
      benefits || null,
      status || 'active'
    ]);

    const newPlan = result.rows[0];

    // Log audit
    await auditController.createAuditLog(
      'admin',
      adminId,
      'CREATE_POLICY_PLAN',
      'policy_plan',
      newPlan.plan_id,
      {
        plan_name: plan_name,
        policy_type: policy_type,
        ip_address: req.ip
      }
    );

    res.status(201).json({
      success: true,
      message: 'Policy plan created successfully',
      data: newPlan
    });
  } catch (error) {
    console.error('Error creating policy plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create policy plan',
      error: error.message
    });
  }
});

// Update policy plan
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId || req.user?.id || 1;
    const {
      plan_name,
      description,
      policy_type,
      category,
      premium_amount,
      coverage_amount,
      coverage_details,
      deductible,
      max_claim_limit,
      waiting_period_days,
      renewal_period_months,
      eligibility_criteria,
      exclusions,
      benefits,
      status
    } = req.body;

    const result = await db.query(`
      UPDATE policy_plans SET
        plan_name = $1,
        description = $2,
        policy_type = $3,
        category = $4,
        premium_amount = $5,
        coverage_amount = $6,
        coverage_details = $7,
        deductible = $8,
        max_claim_limit = $9,
        waiting_period_days = $10,
        renewal_period_months = $11,
        eligibility_criteria = $12,
        exclusions = $13,
        benefits = $14,
        status = $15,
        updated_at = NOW()
      WHERE plan_id = $16
      RETURNING *
    `, [
      plan_name,
      description || null,
      policy_type,
      category,
      premium_amount,
      coverage_amount,
      coverage_details || null,
      deductible || 0,
      max_claim_limit,
      waiting_period_days || 30,
      renewal_period_months || 12,
      eligibility_criteria || null,
      exclusions || null,
      benefits || null,
      status || 'active',
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy plan not found'
      });
    }

    const updatedPlan = result.rows[0];

    // Log audit
    await auditController.createAuditLog(
      'admin',
      adminId,
      'UPDATE_POLICY_PLAN',
      'policy_plan',
      id,
      {
        plan_name: plan_name,
        changes: Object.keys(req.body),
        ip_address: req.ip
      }
    );

    res.json({
      success: true,
      message: 'Policy plan updated successfully',
      data: updatedPlan
    });
  } catch (error) {
    console.error('Error updating policy plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update policy plan',
      error: error.message
    });
  }
});

// Delete policy plan
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the plan exists
    const planCheck = await db.query(
      'SELECT plan_id, plan_name FROM policy_plans WHERE plan_id = $1',
      [id]
    );
    
    if (planCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy plan not found'
      });
    }
    
    // Check if plan is being used by any policies
    const usageCheck = await db.query(
      'SELECT COUNT(*) FROM policy WHERE policy_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete policy plan that is currently in use by existing policies'
      });
    }
    
    // Delete the plan
    const result = await db.query(
      'DELETE FROM policy_plans WHERE plan_id = $1 RETURNING plan_id, plan_name',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Policy plan deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting policy plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete policy plan',
      error: error.message
    });
  }
});

module.exports = router;