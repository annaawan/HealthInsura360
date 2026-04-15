// backend/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const stripePaymentService = require('../services/stripePaymentService');
const { authenticate, adminMiddleware } = require('../middleware/auth');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Allahuakbar786',
  database: process.env.DB_NAME || 'Healthinsura360',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============ HELPER FUNCTIONS ============

// Get user info from request
const getUserInfo = (req) => {
  return {
    id: req.user?.userId || req.user?.id || req.headers['x-user-id'] || 1,
    type: req.user?.userType || req.user?.role || req.headers['x-user-type'] || 'admin',
    email: req.user?.email || req.headers['x-user-email'] || 'admin@system.com'
  };
};

// Comprehensive audit logging for PostgreSQL
const logPaymentAction = async (req, action, details) => {
  try {
    const user = getUserInfo(req);
    const query = `
      INSERT INTO payment_audit_log (
        transaction_id, action, old_status, new_status, 
        performed_by, performed_by_type, performed_by_email,
        reason, ip_address, user_agent, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `;
    
    await pool.query(query, [
      details.transaction_id || null,
      action,
      details.old_status || null,
      details.new_status || null,
      user.id,
      user.type,
      user.email,
      details.reason || null,
      req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null,
      req.headers['user-agent'] || null,
      JSON.stringify(details)
    ]);
    
    console.log(`✅ Audit: ${action} by ${user.type} (${user.email})`);
  } catch (error) {
    console.error('❌ Audit log failed:', error.message);
  }
};

// ============ TEST ROUTE ============

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Payment routes are working!', timestamp: new Date().toISOString() });
});

// ============ STRIPE PAYMENT ROUTES FOR COMMISSIONS ============
// IMPORTANT: These must be BEFORE the /admin routes to avoid conflicts

// Create payment intent for a commission (Admin only)
router.post('/commissions/:commissionId/pay', authenticate, adminMiddleware, async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { amount, agentId } = req.body;
        
        console.log('💰 Payment request received:', { commissionId, amount, agentId });
        
        if (!amount || !agentId) {
            return res.status(400).json({ error: 'Missing required fields: amount and agentId' });
        }
        
        const paymentIntent = await stripePaymentService.processCommissionPayment(
            commissionId,
            agentId,
            parseFloat(amount)
        );
        
        res.json({
            success: true,
            clientSecret: paymentIntent.clientSecret,
            paymentIntentId: paymentIntent.paymentIntentId
        });
        
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm payment after frontend processing
router.post('/confirm-payment', authenticate, adminMiddleware, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Missing paymentIntentId' });
        }
        
        const result = await stripePaymentService.confirmCommissionPayment(paymentIntentId);
        
        res.json(result);
        
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get payment status
router.get('/status/:paymentIntentId', authenticate, async (req, res) => {
    try {
        const { paymentIntentId } = req.params;
        const status = await stripePaymentService.getPaymentStatus(paymentIntentId);
        res.json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ADMIN DASHBOARD STATS ============

router.get('/admin/dashboard/stats', async (req, res) => {
  // ... keep your existing code
  try {
    const { period = 'month' } = req.query;
    
    let dateCondition = "";
    if (period === 'week') {
      dateCondition = "created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateCondition = "created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === 'year') {
      dateCondition = "created_at >= NOW() - INTERVAL '365 days'";
    } else {
      dateCondition = "1=1";
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'Refunded' THEN 1 END) as refunded_count,
        COUNT(CASE WHEN status = 'Disputed' THEN 1 END) as disputed_count,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN type = 'Premium Payment' AND status = 'Completed' THEN amount ELSE 0 END), 0) as premium_revenue,
        COALESCE(SUM(CASE WHEN type = 'Commission Payment' AND status = 'Completed' THEN amount ELSE 0 END), 0) as commission_paid,
        COALESCE(SUM(CASE WHEN type = 'Claim Payment' AND status = 'Completed' THEN amount ELSE 0 END), 0) as claim_payments,
        COALESCE(SUM(CASE WHEN status = 'Refunded' THEN amount ELSE 0 END), 0) as total_refunds,
        COUNT(DISTINCT CASE WHEN type = 'Premium Payment' THEN related_payment_id END) as unique_customers,
        COUNT(DISTINCT CASE WHEN type = 'Commission Payment' THEN related_commission_id END) as unique_agents,
        COUNT(DISTINCT CASE WHEN type = 'Claim Payment' THEN related_claim_id END) as unique_hospitals
      FROM transaction
      WHERE ${dateCondition}
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      period: period,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ GET ALL PAYMENTS WITH FILTERS ============

router.get('/admin/payments', async (req, res) => {
  // Keep your existing code
  try {
    const {
      type, status, customer_id, agent_id, hospital_id,
      startDate, endDate, minAmount, maxAmount,
      search, sortBy = 'created_at', sortOrder = 'DESC',
      limit = 100, offset = 0
    } = req.query;
    
    let query = `
      SELECT 
        t.transaction_id,
        t.related_payment_id,
        t.related_claim_id,
        t.related_commission_id,
        t.amount,
        t.type,
        t.status,
        t.created_at,
        t.updated_at,
        t.refund_reason,
        t.dispute_reason,
        t.failure_reason,
        t.notes,
        c.customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        p.method as payment_method,
        p.transaction_ref,
        p.paid_at,
        ag.agent_id,
        ag.first_name || ' ' || ag.last_name as agent_name,
        ag.email as agent_email,
        h.hospital_id,
        h.name as hospital_name,
        pol.policy_number,
        pol.policy_type
      FROM transaction t
      LEFT JOIN payment p ON t.related_payment_id = p.payment_id
      LEFT JOIN customer c ON p.customer_id = c.customer_id
      LEFT JOIN agent ag ON t.related_commission_id = ag.agent_id
      LEFT JOIN hospital h ON t.related_claim_id = h.hospital_id
      LEFT JOIN policy pol ON p.policy_id = pol.policy_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Apply filters (keep your existing filter logic)
    if (type) {
      query += ` AND t.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    // ... rest of your filter logic
    
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ UPDATE PAYMENT STATUS ============

router.put('/admin/payments/:id/status', async (req, res) => {
  // Keep your existing code
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;
    
    const currentResult = await client.query(
      'SELECT * FROM transaction WHERE transaction_id = $1',
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    const oldStatus = currentResult.rows[0].status;
    const transaction = currentResult.rows[0];
    
    await client.query('BEGIN');
    
    let updateFields = ['status = $1', 'updated_at = NOW()'];
    let updateParams = [status];
    let paramCount = 2;
    
    if (reason) {
      if (status === 'Refunded') {
        updateFields.push(`refund_reason = $${paramCount}`);
        updateParams.push(reason);
        paramCount++;
      } else if (status === 'Disputed') {
        updateFields.push(`dispute_reason = $${paramCount}`);
        updateParams.push(reason);
        paramCount++;
      } else if (status === 'Failed') {
        updateFields.push(`failure_reason = $${paramCount}`);
        updateParams.push(reason);
        paramCount++;
      }
    }
    
    if (notes) {
      updateFields.push(`notes = $${paramCount}`);
      updateParams.push(notes);
      paramCount++;
    }
    
    updateFields.push(`updated_by = $${paramCount}`);
    updateParams.push(getUserInfo(req).id);
    paramCount++;
    
    updateParams.push(id);
    
    const updateQuery = `UPDATE transaction SET ${updateFields.join(', ')} WHERE transaction_id = $${paramCount}`;
    await client.query(updateQuery, updateParams);
    
    await logPaymentAction(req, `STATUS_CHANGE_${oldStatus}_TO_${status}`, {
      transaction_id: id,
      old_status: oldStatus,
      new_status: status,
      reason: reason,
      notes: notes,
      amount: transaction.amount,
      type: transaction.type
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Transaction ${status.toLowerCase()} successfully`,
      data: { transaction_id: id, old_status: oldStatus, new_status: status }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating transaction:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// ============ GET TRANSACTIONS (Original endpoint for compatibility) ============

router.get('/transactions', async (req, res) => {
  // Keep your existing code
  try {
    const { type, status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        t.transaction_id,
        t.related_payment_id,
        t.related_claim_id,
        t.related_commission_id,
        t.amount,
        t.type,
        t.status,
        t.created_at,
        t.updated_at,
        t.refund_reason,
        t.dispute_reason,
        t.failure_reason,
        t.notes,
        c.first_name || ' ' || c.last_name as customer_name,
        c.customer_id,
        p.method as payment_method
      FROM transaction t
      LEFT JOIN payment p ON t.related_payment_id = p.payment_id
      LEFT JOIN customer c ON p.customer_id = c.customer_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (type) {
      query += ` AND t.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND DATE(t.created_at) >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND DATE(t.created_at) <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT 500`;
    
    const result = await pool.query(query, params);
    
    const transactions = result.rows.map(row => ({
      transaction_id: row.transaction_id,
      related_payment_id: row.related_payment_id,
      related_claim_id: row.related_claim_id,
      related_commission_id: row.related_commission_id,
      amount: parseFloat(row.amount),
      type: row.type,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      refund_reason: row.refund_reason,
      dispute_reason: row.dispute_reason,
      failure_reason: row.failure_reason,
      notes: row.notes,
      customer: {
        id: row.customer_id,
        name: row.customer_name || 'Unknown'
      },
      payment: {
        method: row.payment_method || 'Unknown'
      }
    }));
    
    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ GET TRANSACTION STATISTICS ============

router.get('/transactions/stats/summary', async (req, res) => {
  // Keep your existing code
  try {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as successful_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'Refunded' THEN 1 END) as refunded_count,
        COUNT(CASE WHEN status = 'Disputed' THEN 1 END) as disputed_count,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN type = 'Premium Payment' AND status = 'Completed' THEN amount ELSE 0 END), 0) as premium_revenue,
        COALESCE(SUM(CASE WHEN type = 'Commission Payment' AND status = 'Completed' THEN amount ELSE 0 END), 0) as commission_paid,
        COALESCE(SUM(CASE WHEN type = 'Claim Payment' AND status = 'Completed' THEN amount ELSE 0 END), 0) as claim_payments
      FROM transaction
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ GET AUDIT LOGS ============

router.get('/admin/audit-logs', async (req, res) => {
  // Keep your existing code
  try {
    const { 
      limit = 100, offset = 0, 
      action, performed_by_type, 
      startDate, endDate,
      transaction_id 
    } = req.query;
    
    let query = `SELECT * FROM payment_audit_log WHERE 1=1`;
    const params = [];
    let paramCount = 1;
    
    if (action) {
      query += ` AND action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }
    
    if (performed_by_type) {
      query += ` AND performed_by_type = $${paramCount}`;
      params.push(performed_by_type);
      paramCount++;
    }
    
    if (transaction_id) {
      query += ` AND transaction_id = $${paramCount}`;
      params.push(transaction_id);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND DATE(created_at) >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND DATE(created_at) <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM payment_audit_log`);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ GENERATE REPORTS ============

router.post('/admin/reports/generate', async (req, res) => {
  // Keep your existing code
  try {
    const { 
      reportType, startDate, endDate, 
      includeDetails = true 
    } = req.body;
    
    let reportData = {};
    
    if (reportType === 'summary') {
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'Refunded' THEN 1 END) as refunded,
          COUNT(CASE WHEN status = 'Disputed' THEN 1 END) as disputed,
          COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status = 'Completed' THEN amount ELSE NULL END), 0) as avg_transaction
        FROM transaction
        WHERE DATE(created_at) BETWEEN $1 AND $2
      `;
      const summaryResult = await pool.query(summaryQuery, [startDate, endDate]);
      reportData = summaryResult.rows[0];
    }
    
    await logPaymentAction(req, 'REPORT_GENERATED', {
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
      data_size: JSON.stringify(reportData).length
    });
    
    res.json({
      success: true,
      report: {
        type: reportType,
        generated_at: new Date().toISOString(),
        period: { startDate, endDate },
        data: reportData
      }
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;