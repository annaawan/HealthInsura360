// backend/src/routes/agentCommissionRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get agent's own commission summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commission,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM commission 
      WHERE agent_id = $1`,
      [req.user.userId]
    );

    res.json({
      success: true,
      summary: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get agent's commission history (paginated)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT 
        c.commission_id,
        c.amount,
        c.rate,
        c.status,
        c.created_at,
        c.paid_at,
        c.payment_reference,
        c.is_renewal,
        c.renewal_year,
        p.policy_id,
        p.policy_type,
        p.premium_amount,
        c.premium_amount as policy_premium
      FROM commission c
      LEFT JOIN policy p ON c.policy_id = p.policy_id
      WHERE c.agent_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    res.json({
      success: true,
      commissions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching commission history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get agent's monthly commission breakdown
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await db.query(
      `SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        TO_CHAR(created_at, 'Mon YYYY') as month_name,
        COUNT(*) as policies_count,
        COALESCE(SUM(amount), 0) as total_commission,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_commission,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commission
      FROM commission
      WHERE agent_id = $1
      GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon YYYY')
      ORDER BY month DESC
      LIMIT 12`,
      [req.user.userId]
    );

    res.json({
      success: true,
      monthlyData: result.rows
    });
  } catch (error) {
    console.error('Error fetching monthly commission:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get agent's commission rate
router.get('/rate', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get current commission rate from agent table or agent_rates
    const result = await db.query(
      `SELECT commission_rate FROM agent WHERE agent_id = $1`,
      [req.user.userId]
    );

    res.json({
      success: true,
      commissionRate: result.rows[0]?.commission_rate || 0
    });
  } catch (error) {
    console.error('Error fetching commission rate:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get upcoming commission payments
router.get('/upcoming', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await db.query(
      `SELECT 
        c.commission_id,
        c.amount,
        c.created_at,
        p.policy_type,
        p.premium_amount,
        c.rate
      FROM commission c
      LEFT JOIN policy p ON c.policy_id = p.policy_id
      WHERE c.agent_id = $1 
        AND c.status = 'pending'
        AND c.created_at >= NOW() - INTERVAL '90 days'
      ORDER BY c.created_at ASC
      LIMIT 10`,
      [req.user.userId]
    );

    res.json({
      success: true,
      upcoming: result.rows
    });
  } catch (error) {
    console.error('Error fetching upcoming commissions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;