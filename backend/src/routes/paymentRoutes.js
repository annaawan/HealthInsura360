// backend/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const stripePaymentService = require('../services/stripePaymentService');
const { authenticate, adminMiddleware } = require('../middleware/auth');
// At the top of paymentRoutes.js, add this line with other requires
const reminderService = require('../services/reminderService');
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
// Add these routes to your existing paymentRoutes.js

// ============ AGENT PAYMENT MANAGEMENT ROUTES ============

// Get client payment history for agent (PostgreSQL compatible - with correct column names)
router.get('/agent/clients/:customerId/payments', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    const agentId = req.user.userId || req.user.id;
    
    // Verify client belongs to this agent
    const verifyQuery = `
      SELECT customer_id FROM customer 
      WHERE customer_id = $1 AND agent_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [customerId, agentId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this client\'s payment history' 
      });
    }
    
    // Fixed query - removed policy_number, using correct column names
    const query = `
      SELECT 
        p.payment_id,
        p.policy_id,
        p.amount,
        p.method,
        p.status,
        p.transaction_ref,
        p.paid_at,
        pol.policy_type,
        pol.premium_amount as policy_premium,
        pol.start_date,
        pol.end_date,
        pol.status as policy_status,
        t.transaction_id,
        t.status as transaction_status,
        t.created_at as transaction_date,
        t.notes as transaction_notes
      FROM payment p
      LEFT JOIN policy pol ON p.policy_id = pol.policy_id
      LEFT JOIN transaction t ON p.payment_id = t.related_payment_id
      WHERE p.customer_id = $1
      ORDER BY p.paid_at DESC
    `;
    
    const result = await pool.query(query, [customerId]);
    
    // Get client info
    const clientQuery = `
      SELECT first_name, last_name, email, phone 
      FROM customer WHERE customer_id = $1
    `;
    const clientResult = await pool.query(clientQuery, [customerId]);
    
    // Get audit logs separately for each payment if needed
    const paymentsWithAudit = await Promise.all(result.rows.map(async (payment) => {
      if (payment.transaction_id) {
        const auditQuery = `
          SELECT 
            audit_id,
            action,
            old_status,
            new_status,
            created_at
          FROM payment_audit_log 
          WHERE transaction_id = $1
          ORDER BY created_at DESC
        `;
        const auditResult = await pool.query(auditQuery, [payment.transaction_id]);
        payment.audit_logs = auditResult.rows;
      } else {
        payment.audit_logs = [];
      }
      return payment;
    }));
    
    res.json({
      success: true,
      client: clientResult.rows[0],
      payments: paymentsWithAudit,
      count: paymentsWithAudit.length
    });
    
  } catch (error) {
    console.error('Error fetching client payment history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get agent's clients with payment history (PostgreSQL compatible - with correct column names)
router.get('/agent/clients', authenticate, async (req, res) => {
  try {
    const agentId = req.user.userId || req.user.id;
    console.log('🔵 Fetching clients for agent ID:', agentId);
    
    // Get clients with aggregated payment data
    const query = `
      SELECT 
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.status as customer_status,
        COUNT(DISTINCT p.policy_id) as total_policies,
        COUNT(DISTINCT py.payment_id) as total_payments,
        COALESCE(SUM(py.amount), 0) as total_paid,
        COALESCE(SUM(CASE WHEN py.status = 'Pending' THEN py.amount ELSE 0 END), 0) as pending_amount,
        MAX(py.paid_at) as last_payment_date
      FROM customer c
      LEFT JOIN policy p ON c.customer_id = p.customer_id
      LEFT JOIN payment py ON p.policy_id = py.policy_id
      WHERE c.agent_id = $1
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.phone, c.status
      ORDER BY c.first_name, c.last_name
    `;
    
    const result = await pool.query(query, [agentId]);
    const clients = result.rows;
    
    // Get recent payments for each client
    for (let client of clients) {
      const paymentsQuery = `
        SELECT 
          p.payment_id,
          p.amount,
          p.method,
          p.status,
          p.paid_at,
          pol.policy_id,
          pol.policy_type
        FROM payment p
        LEFT JOIN policy pol ON p.policy_id = pol.policy_id
        WHERE p.customer_id = $1
        ORDER BY p.paid_at DESC
        LIMIT 5
      `;
      const paymentsResult = await pool.query(paymentsQuery, [client.customer_id]);
      client.recent_payments = paymentsResult.rows;
    }
    
    console.log(`✅ Found ${clients.length} clients for agent ${agentId}`);
    
    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
    
  } catch (error) {
    console.error('Error fetching agent clients:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send payment reminder to client - with correct column names
router.post('/agent/send-reminder', authenticate, async (req, res) => {
  try {
    const { customer_id, policy_id, reminder_type } = req.body;
    const agentId = req.user.userId || req.user.id;
    
    // Verify client belongs to this agent - using correct column names
    const verifyQuery = `
      SELECT c.customer_id, c.email, c.first_name, c.last_name, 
             p.policy_type, p.premium_amount
      FROM customer c
      JOIN policy p ON c.customer_id = p.customer_id
      WHERE c.customer_id = $1 AND c.agent_id = $2 AND p.policy_id = $3
    `;
    const verifyResult = await pool.query(verifyQuery, [customer_id, agentId, policy_id]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this client' 
      });
    }
    
    const clientInfo = verifyResult.rows[0];
    
    // Create email notification record - using correct table name (email_notifications)
    const notificationQuery = `
      INSERT INTO email_notifications (
        notification_id, recipient_email, recipient_name, subject, 
        status, notification_type, created_at
      )
      VALUES (
        $1, $2, $3, $4, 'pending', 'payment_reminder', NOW()
      )
      RETURNING *
    `;
    
    const notificationId = `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const subject = `Payment Reminder for ${clientInfo.policy_type} Policy`;
    
    await pool.query(notificationQuery, [
      notificationId, clientInfo.email, `${clientInfo.first_name} ${clientInfo.last_name}`, subject
    ]);
    
    res.json({
      success: true,
      message: `Payment reminder sent to ${clientInfo.first_name} ${clientInfo.last_name}`,
      data: { notification_id: notificationId }
    });
    
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Get client policies for agent
router.get('/agent/clients/:customerId/policies', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    const agentId = req.user.userId || req.user.id;
    
    // Verify client belongs to this agent
    const verifyQuery = `
      SELECT customer_id FROM customer 
      WHERE customer_id = $1 AND agent_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [customerId, agentId]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this client\'s policies' 
      });
    }
    
    // Get client's active policies
    const policiesQuery = `
      SELECT 
        policy_id,
        policy_type,
        premium_amount,
        start_date,
        end_date,
        status
      FROM policy
      WHERE customer_id = $1 AND status = 'active'
      ORDER BY start_date DESC
    `;
    
    const result = await pool.query(policiesQuery, [customerId]);
    
    res.json({
      success: true,
      policies: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching client policies:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Record a payment from client (agent collects payment) - Using integer IDs
router.post('/agent/record-payment', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { customer_id, policy_id, amount, method, transaction_ref, notes } = req.body;
    const agentId = req.user.userId || req.user.id;
    
    console.log('🔵 Recording payment:', { customer_id, policy_id, amount, method, agentId });
    
    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }
    
    if (!policy_id || policy_id === '') {
      return res.status(400).json({ success: false, message: 'Policy ID is required' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    
    if (!method) {
      return res.status(400).json({ success: false, message: 'Payment method is required' });
    }
    
    await client.query('BEGIN');
    
    // Convert IDs to integers
    const policyIdInt = parseInt(policy_id, 10);
    const customerIdInt = parseInt(customer_id, 10);
    const agentIdInt = parseInt(agentId, 10);
    
    if (isNaN(policyIdInt) || isNaN(customerIdInt)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid customer or policy ID' });
    }
    
    // Verify client belongs to this agent
    const verifyQuery = `
      SELECT c.customer_id, c.first_name, c.last_name, p.premium_amount, p.policy_type, p.policy_id
      FROM customer c
      JOIN policy p ON c.customer_id = p.customer_id
      WHERE c.customer_id = $1 AND c.agent_id = $2 AND p.policy_id = $3
    `;
    const verifyResult = await client.query(verifyQuery, [customerIdInt, agentIdInt, policyIdInt]);
    
    if (verifyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to record payment for this client/policy' 
      });
    }
    
    const clientInfo = verifyResult.rows[0];
    
    // Insert payment - using DEFAULT or letting DB auto-generate payment_id
    const insertPaymentQuery = `
      INSERT INTO payment (policy_id, customer_id, amount, method, status, transaction_ref, paid_at)
      VALUES ($1, $2, $3, $4, 'Completed', $5, NOW())
      RETURNING payment_id
    `;
    const paymentResult = await client.query(insertPaymentQuery, [
      policyIdInt, customerIdInt, amount, method, transaction_ref || null
    ]);
    
    const paymentId = paymentResult.rows[0].payment_id;
    
    // Create transaction record - using integer for related_payment_id
    const insertTransactionQuery = `
      INSERT INTO transaction (related_payment_id, amount, type, status, created_at, notes, payment_method)
      VALUES ($1, $2, 'Premium Payment', 'Completed', NOW(), $3, $4)
      RETURNING transaction_id
    `;
    const transactionResult = await client.query(insertTransactionQuery, [
      paymentId, amount, notes || `Payment collected by agent for ${clientInfo.policy_type} policy`, method
    ]);
    
    const transactionId = transactionResult.rows[0].transaction_id;
    
    // Log audit
    const auditQuery = `
      INSERT INTO payment_audit_log (transaction_id, action, old_status, new_status, performed_by, performed_by_type, reason, created_at)
      VALUES ($1, 'payment_recorded', NULL, 'Completed', $2, 'agent', $3, NOW())
    `;
    await client.query(auditQuery, [transactionId, agentIdInt, notes || null]);
    
    await client.query('COMMIT');
    
    console.log('✅ Payment recorded successfully. Payment ID:', paymentId, 'Transaction ID:', transactionId);
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment_id: paymentId,
        transaction_id: transactionId
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});
// Get payment statistics for agent dashboard
router.get('/agent/payments/stats', authenticate, async (req, res) => {
  try {
    const agentId = req.user.userId || req.user.id;
    const agentIdInt = parseInt(agentId, 10);
    
    console.log('🔵 Fetching payment stats for agent ID:', agentIdInt);
    
    const query = `
      SELECT 
        COUNT(DISTINCT c.customer_id) as total_clients,
        COUNT(DISTINCT p.policy_id) as total_policies,
        COUNT(DISTINCT py.payment_id) as total_transactions,
        COALESCE(SUM(py.amount), 0) as total_collection,
        COALESCE(SUM(CASE WHEN py.status = 'Pending' THEN py.amount ELSE 0 END), 0) as pending_collection,
        COALESCE(SUM(CASE WHEN py.status = 'Completed' THEN py.amount ELSE 0 END), 0) as completed_collection,
        COUNT(CASE WHEN py.status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN py.status = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN py.status = 'Failed' THEN 1 END) as failed_count,
        COALESCE(SUM(CASE WHEN DATE(py.paid_at) = CURRENT_DATE THEN py.amount ELSE 0 END), 0) as today_collection,
        COALESCE(SUM(CASE WHEN DATE(py.paid_at) >= CURRENT_DATE - INTERVAL '7 days' THEN py.amount ELSE 0 END), 0) as weekly_collection,
        COALESCE(SUM(CASE WHEN DATE(py.paid_at) >= CURRENT_DATE - INTERVAL '30 days' THEN py.amount ELSE 0 END), 0) as monthly_collection
      FROM customer c
      LEFT JOIN policy p ON c.customer_id = p.customer_id
      LEFT JOIN payment py ON p.policy_id = py.policy_id
      WHERE c.agent_id = $1
    `;
    
    const result = await pool.query(query, [agentIdInt]);
    
    console.log('✅ Stats fetched successfully:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record a payment from client (agent collects payment)
router.post('/agent/record-payment', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { customer_id, policy_id, amount, method, transaction_ref, notes } = req.body;
    const agentId = req.user.userId || req.user.id;
    
    // Validate required fields
    if (!customer_id || !policy_id || !amount || !method) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    await client.query('BEGIN');
    
    // Convert IDs to integers
    const policyIdInt = parseInt(policy_id, 10);
    const customerIdInt = parseInt(customer_id, 10);
    const agentIdInt = parseInt(agentId, 10);
    
    // Verify client belongs to this agent
    const verifyQuery = `
      SELECT c.customer_id, c.first_name, c.last_name, p.premium_amount, p.policy_type, p.policy_id
      FROM customer c
      JOIN policy p ON c.customer_id = p.customer_id
      WHERE c.customer_id = $1 AND c.agent_id = $2 AND p.policy_id = $3
    `;
    const verifyResult = await client.query(verifyQuery, [customerIdInt, agentIdInt, policyIdInt]);
    
    if (verifyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to record payment for this client/policy' 
      });
    }
    
    const clientInfo = verifyResult.rows[0];
    
    // Insert payment - let database auto-generate payment_id
    const insertPaymentQuery = `
      INSERT INTO payment (policy_id, customer_id, amount, method, status, transaction_ref, paid_at)
      VALUES ($1, $2, $3, $4, 'Completed', $5, NOW())
      RETURNING payment_id
    `;
    const paymentResult = await client.query(insertPaymentQuery, [
      policyIdInt, customerIdInt, amount, method, transaction_ref || null
    ]);
    
    const paymentId = paymentResult.rows[0].payment_id;
    
    // Create transaction record
    const insertTransactionQuery = `
      INSERT INTO transaction (related_payment_id, amount, type, status, created_at, notes, payment_method)
      VALUES ($1, $2, 'Premium Payment', 'Completed', NOW(), $3, $4)
      RETURNING transaction_id
    `;
    const transactionResult = await client.query(insertTransactionQuery, [
      paymentId, amount, notes || `Payment collected by agent for ${clientInfo.policy_type} policy`, method
    ]);
    
    const transactionId = transactionResult.rows[0].transaction_id;
    
    // Log audit
    const auditQuery = `
      INSERT INTO payment_audit_log (transaction_id, action, old_status, new_status, performed_by, performed_by_type, reason, created_at)
      VALUES ($1, 'payment_recorded', NULL, 'Completed', $2, 'agent', $3, NOW())
    `;
    await client.query(auditQuery, [transactionId, agentIdInt, notes || null]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment_id: paymentId,
        transaction_id: transactionId
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// ============ RECEIPT MANAGEMENT ROUTES ============


// Email receipt to client (SIMPLIFIED - no PDF attachment)
router.post('/receipt/:paymentId/email', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { email } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        console.log('📧 Email receipt request - Payment ID:', paymentId, 'To:', email);
        
        // Fetch payment details
        const query = `
            SELECT 
                p.payment_id,
                p.amount,
                p.method,
                p.status,
                p.transaction_ref,
                p.paid_at,
                c.first_name,
                c.last_name,
                c.email as customer_email,
                pol.policy_id,
                pol.policy_type
            FROM payment p
            JOIN customer c ON p.customer_id = c.customer_id
            JOIN policy pol ON p.policy_id = pol.policy_id
            WHERE p.payment_id = $1 AND c.agent_id = $2
        `;
        
        const result = await pool.query(query, [paymentId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
        const payment = result.rows[0];
        const date = new Date(payment.paid_at);
        
        const receiptData = {
            receipt_number: `RCP-${payment.payment_id}`,
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString(),
            customer_name: `${payment.first_name} ${payment.last_name}`,
            customer_email: payment.customer_email,
            policy_id: payment.policy_id,
            policy_type: payment.policy_type,
            amount: parseFloat(payment.amount),
            payment_method: payment.method,
            transaction_ref: payment.transaction_ref,
            status: payment.status,
            description: `Premium Payment for ${payment.policy_type} Policy`
        };
        
        const receiptService = require('../services/receiptService');
        const recipientEmail = email || payment.customer_email;
        
        if (!recipientEmail) {
            return res.status(400).json({ success: false, message: 'No recipient email provided' });
        }
        
        const emailResult = await receiptService.sendReceiptEmail(receiptData, recipientEmail);
        
        if (emailResult.success) {
            res.json({
                success: true,
                message: `Receipt sent to ${recipientEmail}`,
                messageId: emailResult.messageId
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to send email', 
                error: emailResult.error 
            });
        }
        
    } catch (error) {
        console.error('Error sending receipt email:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Generate printable receipt (for print/download - NO PDF, just HTML)
router.get('/receipt/:paymentId/print', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const query = `
            SELECT 
                p.payment_id,
                p.amount,
                p.method,
                p.status,
                p.transaction_ref,
                p.paid_at,
                c.first_name,
                c.last_name,
                pol.policy_id,
                pol.policy_type
            FROM payment p
            JOIN customer c ON p.customer_id = c.customer_id
            JOIN policy pol ON p.policy_id = pol.policy_id
            WHERE p.payment_id = $1 AND c.agent_id = $2
        `;
        
        const result = await pool.query(query, [paymentId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).send('Payment not found');
        }
        
        const payment = result.rows[0];
        const date = new Date(payment.paid_at);
        
        const receiptData = {
            receipt_number: `RCP-${payment.payment_id}`,
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString(),
            customer_name: `${payment.first_name} ${payment.last_name}`,
            policy_id: payment.policy_id,
            policy_type: payment.policy_type,
            amount: parseFloat(payment.amount),
            payment_method: payment.method,
            transaction_ref: payment.transaction_ref,
            status: payment.status,
            description: 'Premium Payment'
        };
        
        const receiptService = require('../services/receiptService');
        const html = receiptService.generatePrintableReceipt(receiptData);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        
    } catch (error) {
        console.error('Error generating receipt:', error);
        res.status(500).send('Error generating receipt');
    }
});

// PDF endpoint - redirect to print (same as print)
router.get('/receipt/:paymentId/pdf', authenticate, async (req, res) => {
    res.redirect(`/api/payments/receipt/${req.params.paymentId}/print`);
});

// ============ PAYMENT REMINDER ROUTES ============

// Create a payment reminder
router.post('/reminders', authenticate, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            customer_id, policy_id, reminder_date, reminder_time,
            frequency, recurring_end_date, notification_methods,
            message
        } = req.body;
        
        const agentId = req.user.userId || req.user.id;
        
        // Validate required fields
        if (!customer_id || !policy_id || !reminder_date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer ID, Policy ID, and Reminder Date are required' 
            });
        }
        
        await client.query('BEGIN');
        
        // Verify client belongs to this agent
        const verifyQuery = `
            SELECT c.customer_id, c.first_name, c.last_name, c.email, c.phone,
                   p.policy_type, p.premium_amount, p.end_date
            FROM customer c
            JOIN policy p ON c.customer_id = p.customer_id
            WHERE c.customer_id = $1 AND c.agent_id = $2 AND p.policy_id = $3
        `;
        const verifyResult = await client.query(verifyQuery, [customer_id, agentId, policy_id]);
        
        if (verifyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have access to this client/policy' 
            });
        }
        
        const clientInfo = verifyResult.rows[0];
        
        // Calculate next reminder date
        let nextReminderDate = reminder_date;
        let recurringEndDate = recurring_end_date || null;
        
        // Insert reminder
        const insertQuery = `
            INSERT INTO payment_reminders (
                customer_id, policy_id, agent_id, reminder_type,
                reminder_date, reminder_time, frequency, recurring_end_date,
                notification_methods, message, status, next_reminder_date,
                created_by, created_at
            ) VALUES ($1, $2, $3, 'payment', $4, $5, $6, $7, $8, $9, 'active', $10, $11, NOW())
            RETURNING reminder_id
        `;
        
        const result = await client.query(insertQuery, [
            customer_id, policy_id, agentId,
            reminder_date, reminder_time || '09:00:00',
            frequency || 'one-time', recurringEndDate,
            notification_methods || ['email'],
            message || null,
            nextReminderDate,
            agentId
        ]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Payment reminder created successfully',
            data: { reminder_id: result.rows[0].reminder_id }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Get all reminders for agent's clients
router.get('/reminders', authenticate, async (req, res) => {
    try {
        const agentId = req.user.userId || req.user.id;
        const { status, upcoming } = req.query;
        
        let query = `
            SELECT 
                r.reminder_id,
                r.customer_id,
                r.policy_id,
                r.reminder_date,
                r.reminder_time,
                r.frequency,
                r.recurring_end_date,
                r.notification_methods,
                r.message,
                r.status,
                r.next_reminder_date,
                r.last_sent_at,
                r.created_at,
                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                p.policy_type,
                p.premium_amount,
                p.end_date as policy_end_date
            FROM payment_reminders r
            JOIN customer c ON r.customer_id = c.customer_id
            JOIN policy p ON r.policy_id = p.policy_id
            WHERE r.agent_id = $1
        `;
        
        const params = [agentId];
        let paramCount = 2;
        
        if (status) {
            query += ` AND r.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        
        if (upcoming === 'true') {
            query += ` AND r.reminder_date >= CURRENT_DATE`;
        }
        
        query += ` ORDER BY r.reminder_date ASC, r.created_at DESC`;
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get reminders for a specific client
router.get('/reminders/client/:customerId', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const query = `
            SELECT 
                r.reminder_id,
                r.policy_id,
                r.reminder_date,
                r.reminder_time,
                r.frequency,
                r.recurring_end_date,
                r.notification_methods,
                r.message,
                r.status,
                r.next_reminder_date,
                r.last_sent_at,
                p.policy_type,
                p.premium_amount,
                p.end_date as policy_end_date
            FROM payment_reminders r
            JOIN policy p ON r.policy_id = p.policy_id
            WHERE r.customer_id = $1 AND r.agent_id = $2
            ORDER BY r.reminder_date ASC
        `;
        
        const result = await pool.query(query, [customerId, agentId]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching client reminders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update reminder status (activate/cancel/complete)
router.put('/reminders/:reminderId/status', authenticate, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const { status, notes } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        const validStatuses = ['active', 'cancelled', 'completed', 'sent'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status' 
            });
        }
        
        const query = `
            UPDATE payment_reminders 
            SET status = $1, updated_at = NOW(), notes = COALESCE($2, notes)
            WHERE reminder_id = $3 AND agent_id = $4
            RETURNING reminder_id
        `;
        
        const result = await pool.query(query, [status, notes, reminderId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Reminder not found' 
            });
        }
        
        res.json({
            success: true,
            message: `Reminder ${status} successfully`
        });
        
    } catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete a reminder
router.delete('/reminders/:reminderId', authenticate, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const query = `
            DELETE FROM payment_reminders 
            WHERE reminder_id = $1 AND agent_id = $2
            RETURNING reminder_id
        `;
        
        const result = await pool.query(query, [reminderId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Reminder not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Reminder deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Send reminder now (manual trigger)
router.post('/reminders/:reminderId/send', authenticate, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        // Get reminder details
        const reminderQuery = `
            SELECT 
                r.*,
                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                p.policy_type,
                p.premium_amount,
                p.end_date as policy_end_date
            FROM payment_reminders r
            JOIN customer c ON r.customer_id = c.customer_id
            JOIN policy p ON r.policy_id = p.policy_id
            WHERE r.reminder_id = $1 AND r.agent_id = $2
        `;
        
        const result = await pool.query(reminderQuery, [reminderId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Reminder not found' 
            });
        }
        
        const reminder = result.rows[0];
        const dueDate = new Date(reminder.reminder_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        const reminderService = require('../services/reminderService');
        
        // Prepare email data
        const emailData = {
            customer_name: `${reminder.first_name} ${reminder.last_name}`,
            customer_email: reminder.email,
            policy_id: reminder.policy_id,
            policy_type: reminder.policy_type,
            amount: parseFloat(reminder.premium_amount),
            due_date: reminder.reminder_date,
            days_until_due: daysUntilDue,
            subject: `Payment Reminder - Policy #${reminder.policy_id}`
        };
        
        // Send email
        const emailResult = await reminderService.sendEmailReminder(emailData);
        
        if (emailResult.success) {
            // Update last_sent_at
            await pool.query(`
                UPDATE payment_reminders 
                SET last_sent_at = NOW(), status = 'sent'
                WHERE reminder_id = $1
            `, [reminderId]);
            
            // Log reminder sent
            await pool.query(`
                INSERT INTO reminder_logs (
                    reminder_id, customer_id, customer_email, customer_phone,
                    notification_type, subject, message, status, sent_at
                ) VALUES ($1, $2, $3, $4, 'email', $5, $6, 'sent', NOW())
            `, [reminderId, reminder.customer_id, reminder.email, reminder.phone,
                emailData.subject, reminder.message || emailData.subject]);
        }
        
        res.json({
            success: emailResult.success,
            message: emailResult.success ? 'Reminder sent successfully' : 'Failed to send reminder',
            error: emailResult.error
        });
        
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Manual trigger for reminders (for testing)
router.post('/reminders/trigger-manual', authenticate, async (req, res) => {
    try {
        const reminderScheduler = require('../services/reminderScheduler');
        
        // Manually trigger reminder check
        await reminderScheduler.manualTrigger();
        
        res.json({
            success: true,
            message: 'Reminder check triggered manually'
        });
    } catch (error) {
        console.error('Error triggering reminders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============ CLAIM MANAGEMENT ROUTES ============

// Get all claims for agent's clients (with case-insensitive filters)
router.get('/agent/claims', authenticate, async (req, res) => {
    try {
        const agentId = req.user.userId || req.user.id;
        const { status, type, startDate, endDate } = req.query;
        
        let query = `
            SELECT 
                c.claim_id,
                c.policy_id,
                c.customer_id,
                c.hospital_id,
                c.claim_type,
                c.claim_amount,
                c.approved_amount,
                c.status,
                c.filing_date,
                c.updated_at,
                c.document_url,
                c.approval_notes,
                c.payment_status,
                cust.first_name as customer_first_name,
                cust.last_name as customer_last_name,
                cust.email as customer_email,
                cust.phone as customer_phone,
                h.name as hospital_name,
                h.email as hospital_email,
                p.policy_type,
                p.sum_insured,
                p.premium_amount as policy_premium_amount
            FROM claim c
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN hospital h ON c.hospital_id = h.hospital_id
            LEFT JOIN policy p ON c.policy_id = p.policy_id
            WHERE cust.agent_id = $1
        `;
        
        const params = [agentId];
        let paramCount = 2;
        
        // Case-insensitive status filter
        if (status) {
            query += ` AND LOWER(c.status) = LOWER($${paramCount})`;
            params.push(status);
            paramCount++;
        }
        
        // Case-insensitive claim type filter
        if (type) {
            query += ` AND LOWER(c.claim_type) = LOWER($${paramCount})`;
            params.push(type);
            paramCount++;
        }
        
        if (startDate) {
            query += ` AND DATE(c.filing_date) >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        
        if (endDate) {
            query += ` AND DATE(c.filing_date) <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }
        
        query += ` ORDER BY c.filing_date DESC`;
        
        const result = await pool.query(query, params);
        
        // Get documents for each claim from claim_documents table
        for (let claim of result.rows) {
            const docsResult = await pool.query(`
                SELECT document_id, file_name, file_url, file_type, file_size, uploaded_at
                FROM claim_documents
                WHERE claim_id = $1
                ORDER BY uploaded_at DESC
            `, [claim.claim_id]);
            claim.documents = docsResult.rows;
        }
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            filters: { status, type, startDate, endDate }
        });
        
    } catch (error) {
        console.error('Error fetching claims:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single claim details with policy coverage
router.get('/agent/claims/:claimId', authenticate, async (req, res) => {
    try {
        const { claimId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const query = `
            SELECT 
                c.*,
                cust.first_name as customer_first_name,
                cust.last_name as customer_last_name,
                cust.email as customer_email,
                cust.phone as customer_phone,
                h.name as hospital_name,
                h.email as hospital_email,
                p.policy_type,
                p.sum_insured,
                p.remaining_coverage,
                p.used_coverage,
                p.deductible_amount,
                p.co_pay_percentage
            FROM claim c
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN hospital h ON c.hospital_id = h.hospital_id
            LEFT JOIN policy p ON c.policy_id = p.policy_id
            WHERE c.claim_id = $1 AND cust.agent_id = $2
        `;
        
        const result = await pool.query(query, [claimId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }
        
        const claim = result.rows[0];
        
        // Calculate coverage used percentage
        claim.coverage_used_percentage = claim.sum_insured > 0 
            ? ((claim.used_coverage || 0) / claim.sum_insured * 100).toFixed(2)
            : 0;
        
        // Get documents
        const docsResult = await pool.query(`
            SELECT document_id, file_name, file_url, file_type, file_size, uploaded_at
            FROM claim_documents
            WHERE claim_id = $1
            ORDER BY uploaded_at DESC
        `, [claimId]);
        
        claim.documents = docsResult.rows;
        
        // Get audit logs
        const auditResult = await pool.query(`
            SELECT * FROM claim_audit_log
            WHERE claim_id = $1
            ORDER BY created_at DESC
        `, [claimId]);
        
        claim.audit_logs = auditResult.rows;
        
        res.json({
            success: true,
            data: claim
        });
        
    } catch (error) {
        console.error('Error fetching claim:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve claim and process Stripe payment to customer with company account
router.put('/agent/claims/:claimId/approve', authenticate, async (req, res) => {
    const client = await pool.connect();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const companyAccountService = require('../services/companyAccountService');
    
    try {
        const { claimId } = req.params;
        const { approved_amount, coverage_type, notes } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        await client.query('BEGIN');
        
        // Get claim and policy details
        const claimResult = await client.query(`
            SELECT 
                c.*,
                p.policy_id,
                p.sum_insured,
                p.remaining_coverage,
                p.used_coverage,
                p.deductible_amount as policy_deductible,
                p.co_pay_percentage as policy_copay,
                p.policy_type,
                cust.email as customer_email,
                cust.first_name,
                cust.last_name,
                cust.phone as customer_phone
            FROM claim c
            JOIN policy p ON c.policy_id = p.policy_id
            JOIN customer cust ON c.customer_id = cust.customer_id
            WHERE c.claim_id = $1
        `, [claimId]);
        
        if (claimResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }
        
        const claim = claimResult.rows[0];
        const requestedAmount = parseFloat(claim.claim_amount) || 0;
        let finalApprovedAmount = approved_amount ? parseFloat(approved_amount) : requestedAmount;
        
        // Validate approved amount
        if (isNaN(finalApprovedAmount) || finalApprovedAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid approved amount. Amount must be greater than 0.' 
            });
        }
        
        const remainingCoverage = parseFloat(claim.remaining_coverage) || 0;
        const deductibleAmount = parseFloat(claim.policy_deductible) || 0;
        const coPayPercentage = parseFloat(claim.policy_copay) || 0;
        
        // Check if sufficient coverage remains
        if (finalApprovedAmount > remainingCoverage) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient coverage. Remaining coverage: $${remainingCoverage.toFixed(2)}` 
            });
        }
        
        // Calculate deductible and co-pay
        let deductibleApplied = Math.min(deductibleAmount, finalApprovedAmount);
        let remainingAfterDeductible = finalApprovedAmount - deductibleApplied;
        let coPayAmount = (remainingAfterDeductible * coPayPercentage) / 100;
        let insurancePaid = remainingAfterDeductible - coPayAmount;
        let clientResponsibility = deductibleApplied + coPayAmount;
        
        // Round to 2 decimal places
        deductibleApplied = Math.round(deductibleApplied * 100) / 100;
        coPayAmount = Math.round(coPayAmount * 100) / 100;
        insurancePaid = Math.round(insurancePaid * 100) / 100;
        clientResponsibility = Math.round(clientResponsibility * 100) / 100;
        
        // Generate IDs
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        // Create payment record
        await client.query(`
            INSERT INTO payment (
                payment_id, policy_id, customer_id, amount, method, 
                status, transaction_ref, paid_at
            ) VALUES ($1, $2, $3, $4, 'stripe', 'pending', $5, NOW())
        `, [paymentId, claim.policy_id, claim.customer_id, insurancePaid, transactionId]);
        
        // Process Stripe transfer to customer
        let stripeTransferResult = null;
        let transferStatus = 'pending';
        let stripeTransferId = null;
        let paymentIntentId = null;
        
        if (insurancePaid > 0) {
            try {
                // Create a PaymentIntent to pay the customer
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(insurancePaid * 100),
                    currency: 'usd',
                    payment_method_types: ['card'],
                    description: `Claim payment for claim #${claimId} - ${claim.policy_type}`,
                    metadata: {
                        claim_id: claimId,
                        customer_id: claim.customer_id,
                        policy_id: claim.policy_id,
                        payment_id: paymentId,
                        transaction_type: 'claim_payout'
                    },
                    receipt_email: claim.customer_email
                });
                
                paymentIntentId = paymentIntent.id;
                
                // Debit from company account
                const debitResult = await companyAccountService.debitCompanyAccount(
                    insurancePaid,
                    claim.customer_id,
                    claimId,
                    `Claim payout for claim #${claimId} - ${claim.policy_type}`
                );
                
                if (!debitResult.success) {
                    throw new Error(`Company account debit failed: ${debitResult.error}`);
                }
                
                stripeTransferResult = {
                    success: true,
                    payment_intent_id: paymentIntentId,
                    amount: insurancePaid,
                    status: 'succeeded',
                    company_balance_after: debitResult.new_balance
                };
                
                transferStatus = 'completed';
                stripeTransferId = paymentIntentId;
                
                console.log(`✅ Stripe payment intent created: ${paymentIntentId}`);
                console.log(`✅ Company account debited: $${insurancePaid}`);
                
            } catch (stripeError) {
                console.error('Stripe payment error:', stripeError);
                transferStatus = 'failed';
                stripeTransferResult = { success: false, error: stripeError.message };
            }
        }
        
        // FIXED: Explicitly cast values and use separate query for claim update
        // Convert values to proper types
        const finalApprovedAmountNum = parseFloat(finalApprovedAmount);
        const agentIdInt = parseInt(agentId);
        const approvalNotesText = notes || null;
        const deductibleAppliedNum = parseFloat(deductibleApplied);
        const coPayAmountNum = parseFloat(coPayAmount);
        const insurancePaidNum = parseFloat(insurancePaid);
        const clientResponsibilityNum = parseFloat(clientResponsibility);
        const coverageTypeText = String(coverage_type || 'full_coverage');
        const agentNotesText = notes || null;
        const paymentStatusText = String(transferStatus);
        const paymentIntentIdText = paymentIntentId;
        const stripeTransferIdText = stripeTransferId;
        const transferStatusText = String(transferStatus);
        const claimIdInt = parseInt(claimId);
        
        // Update claim with explicit casting
        await client.query(`
            UPDATE claim 
            SET status = 'paid',
                approved_amount = $1::DECIMAL,
                reviewed_by = $2::INTEGER,
                reviewed_at = NOW(),
                approval_notes = $3::TEXT,
                deductible_applied = $4::DECIMAL,
                co_pay_amount = $5::DECIMAL,
                insurance_paid = $6::DECIMAL,
                client_responsibility = $7::DECIMAL,
                coverage_type = $8::VARCHAR,
                agent_notes = $9::TEXT,
                payment_status = $10::VARCHAR,
                payment_transfer_date = CASE WHEN $10::VARCHAR = 'completed' THEN NOW() ELSE NULL END,
                payment_intent_id = $11::VARCHAR,
                stripe_transfer_id = $12::VARCHAR,
                transfer_status = $13::VARCHAR,
                updated_at = NOW()
            WHERE claim_id = $14::INTEGER
        `, [
            finalApprovedAmountNum,
            agentIdInt,
            approvalNotesText,
            deductibleAppliedNum,
            coPayAmountNum,
            insurancePaidNum,
            clientResponsibilityNum,
            coverageTypeText,
            agentNotesText,
            paymentStatusText,
            paymentIntentIdText,
            stripeTransferIdText,
            transferStatusText,
            claimIdInt
        ]);
        
        // Update transaction record status
        await client.query(`
            UPDATE transaction 
            SET status = $1::VARCHAR
            WHERE related_payment_id = $2::VARCHAR
        `, [transferStatus === 'completed' ? 'completed' : 'pending', paymentId]);
        
        // Update policy remaining coverage
        const newRemainingCoverage = remainingCoverage - insurancePaid;
        const newUsedCoverage = (parseFloat(claim.sum_insured) || 0) - newRemainingCoverage;
        
        await client.query(`
            UPDATE policy 
            SET remaining_coverage = $1::DECIMAL,
                used_coverage = $2::DECIMAL,
                updated_at = NOW()
            WHERE policy_id = $3::INTEGER
        `, [newRemainingCoverage, newUsedCoverage, claim.policy_id]);
        
        // Log audit
        await client.query(`
            INSERT INTO claim_audit_log (
                claim_id, action, old_status, new_status,
                performed_by, performed_by_type, reason, notes, created_at
            ) VALUES ($1::INTEGER, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::INTEGER, $6::VARCHAR, $7::TEXT, $8::TEXT, NOW())
        `, [claimIdInt, 'APPROVE_AND_PAY', 'pending', 'paid', agentIdInt, 'agent', `Amount: $${insurancePaid} transferred`, notes || null]);
        
        await client.query('COMMIT');
        
        // Send email notification
        const claimService = require('../services/claimService');
        await claimService.sendClaimPaymentConfirmationEmail(
            {
                claim_id: claimId,
                claim_amount: requestedAmount,
                approved_amount: finalApprovedAmount,
                insurance_paid: insurancePaid,
                payment_id: paymentId,
                transaction_id: transactionId,
                payment_status: transferStatus,
                stripe_transfer_id: stripeTransferId
            },
            claim.customer_email,
            `${claim.first_name} ${claim.last_name}`
        );
        
        res.json({
            success: true,
            message: `Claim approved and $${insurancePaid.toFixed(2)} transferred successfully`,
            data: {
                claim_id: claimId,
                status: 'paid',
                approved_amount: finalApprovedAmount,
                insurance_paid: insurancePaid,
                payment_id: paymentId,
                transaction_id: transactionId,
                transfer_status: transferStatus,
                stripe_transfer_id: stripeTransferId,
                new_remaining_coverage: newRemainingCoverage
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving claim:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});
// Get company account balance and summary
router.get('/company/balance', authenticate, async (req, res) => {
    try {
        const companyAccountService = require('../services/companyAccountService');
        const balance = await companyAccountService.getCompanyBalance();
        const summary = await companyAccountService.getCompanySummary();
        const ledger = await companyAccountService.getLedgerTransactions(20, 0);
        
        res.json({
            success: true,
            data: {
                balance: balance,
                summary: summary,
                recent_transactions: ledger
            }
        });
    } catch (error) {
        console.error('Error fetching company balance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// TEMPORARY: Add funds to company account for testing
router.post('/company/add-funds', authenticate, adminMiddleware, async (req, res) => {
    try {
        const { amount, description } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }
        
        const result = await pool.query(`
            UPDATE company_account 
            SET balance = balance + $1,
                updated_at = NOW()
            WHERE account_type = 'operating'
            RETURNING balance
        `, [amount]);
        
        // Record ledger entry
        await pool.query(`
            INSERT INTO ledger_transactions (
                transaction_type, amount, from_account_type, to_account_type,
                reference_id, description, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', NOW())
        `, ['manual_addition', amount, 'admin', 'company', 'MANUAL_FUNDS', description || 'Manual funds added']);
        
        res.json({
            success: true,
            message: `$${amount} added to company account`,
            data: { new_balance: result.rows[0].balance }
        });
        
    } catch (error) {
        console.error('Error adding funds:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Disapprove claim
router.put('/agent/claims/:claimId/disapprove', authenticate, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { claimId } = req.params;
        const { reason, notes } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason for disapproval is required' });
        }
        
        await client.query('BEGIN');
        
        // Get claim details
        const claimResult = await client.query(`
            SELECT c.*, cust.email as customer_email, cust.first_name, cust.last_name,
                   h.email as hospital_email, h.name as hospital_name
            FROM claim c
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN hospital h ON c.hospital_id = h.hospital_id
            WHERE c.claim_id = $1
        `, [claimId]);
        
        if (claimResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }
        
        const claim = claimResult.rows[0];
        const oldStatus = claim.status;
        
        // Update claim status
        await client.query(`
            UPDATE claim 
            SET status = 'disapproved',
                reviewed_by = $1,
                reviewed_at = NOW(),
                approval_notes = $2,
                agent_id = COALESCE(agent_id, $3),
                updated_at = NOW()
            WHERE claim_id = $4
        `, [agentId, notes || reason, agentId, claimId]);
        
        // Determine claimant email and name
        let claimantEmail = claim.customer_email || claim.hospital_email;
        let claimantName = claim.customer_email ? `${claim.first_name} ${claim.last_name}` : claim.hospital_name;
        
        // Log audit in claim_audit_log table
        await client.query(`
            INSERT INTO claim_audit_log (
                claim_id, action, old_status, new_status,
                performed_by, performed_by_type, reason, notes, ip_address, created_at
            ) VALUES ($1, 'DISAPPROVE', $2, 'disapproved', $3, 'agent', $4, $5, $6, NOW())
        `, [claimId, oldStatus, agentId, reason, notes, req.ip]);
        
        // Send email notification
        const claimService = require('../services/claimService');
        await claimService.sendClaimDisapprovalEmail(claim, claimantEmail, claimantName, reason);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Claim disapproved successfully',
            data: { claim_id: claimId, status: 'disapproved' }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error disapproving claim:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});
// Get policy coverage details for a client
router.get('/agent/clients/:customerId/policy-coverage', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        // Verify client belongs to this agent
        const verifyQuery = `
            SELECT customer_id FROM customer 
            WHERE customer_id = $1 AND agent_id = $2
        `;
        const verifyResult = await pool.query(verifyQuery, [customerId, agentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have access to this client' 
            });
        }
        
        // Get policy coverage summary
        const query = `
            SELECT 
                p.policy_id,
                p.policy_type,
                p.sum_insured,
                p.remaining_coverage,
                p.used_coverage,
                p.deductible_amount,
                p.co_pay_percentage,
                p.start_date,
                p.end_date,
                p.status as policy_status,
                ROUND((p.used_coverage / NULLIF(p.sum_insured, 0) * 100), 2) as coverage_used_percentage,
                COUNT(c.claim_id) as total_claims,
                COALESCE(SUM(c.insurance_paid), 0) as total_insurance_paid,
                COALESCE(SUM(c.client_responsibility), 0) as total_client_paid,
                (
                    SELECT json_agg(json_build_object(
                        'claim_id', c2.claim_id,
                        'claim_amount', c2.claim_amount,
                        'approved_amount', c2.approved_amount,
                        'insurance_paid', c2.insurance_paid,
                        'status', c2.status,
                        'filing_date', c2.filing_date
                    ) ORDER BY c2.filing_date DESC
                    LIMIT 5
                ) as recent_claims
            FROM policy p
            LEFT JOIN claim c ON p.policy_id = c.policy_id
            WHERE p.customer_id = $1
            GROUP BY p.policy_id, p.policy_type, p.sum_insured, p.remaining_coverage, 
                     p.used_coverage, p.deductible_amount, p.co_pay_percentage,
                     p.start_date, p.end_date, p.status
            ORDER BY p.created_at DESC
        `;
        
        const result = await pool.query(query, [customerId]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching policy coverage:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get claim statistics (FIXED)
router.get('/agent/claims/stats/summary', authenticate, async (req, res) => {
    try {
        const agentId = req.user.userId || req.user.id;
        
        // First, get all claims for this agent's customers
        const claimsQuery = `
            SELECT 
                c.status,
                c.approved_amount,
                c.claim_amount
            FROM claim c
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            WHERE cust.agent_id = $1
        `;
        
        const result = await pool.query(claimsQuery, [agentId]);
        const claims = result.rows;
        
        // Calculate statistics manually for accuracy
        let totalClaims = claims.length;
        let pendingCount = 0;
        let approvedCount = 0;
        let disapprovedCount = 0;
        let paidCount = 0;
        let totalApprovedAmount = 0;
        let totalPaidAmount = 0;
        
        claims.forEach(claim => {
            const status = (claim.status || '').toLowerCase();
            
            // Count by status
            if (status === 'pending') {
                pendingCount++;
            } else if (status === 'approved') {
                approvedCount++;
                totalApprovedAmount += parseFloat(claim.approved_amount || claim.claim_amount || 0);
            } else if (status === 'disapproved') {
                disapprovedCount++;
            } else if (status === 'paid') {
                paidCount++;
                totalPaidAmount += parseFloat(claim.approved_amount || claim.claim_amount || 0);
                totalApprovedAmount += parseFloat(claim.approved_amount || claim.claim_amount || 0);
            }
        });
        
        const stats = {
            total_claims: totalClaims,
            pending_count: pendingCount,
            approved_count: approvedCount,
            disapproved_count: disapprovedCount,
            paid_count: paidCount,
            total_approved_amount: totalApprovedAmount,
            total_paid_amount: totalPaidAmount
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error fetching claim stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get claim summary with coverage details
router.get('/agent/claims/summary', authenticate, async (req, res) => {
    try {
        const agentId = req.user.userId || req.user.id;
        
        const query = `
            SELECT 
                c.customer_id,
                cust.first_name,
                cust.last_name,
                COUNT(DISTINCT p.policy_id) as total_policies,
                SUM(p.sum_insured) as total_coverage,
                SUM(p.remaining_coverage) as total_remaining_coverage,
                SUM(p.used_coverage) as total_used_coverage,
                COUNT(DISTINCT c.claim_id) as total_claims,
                SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) as pending_claims,
                SUM(CASE WHEN c.status = 'approved' THEN 1 ELSE 0 END) as approved_claims,
                SUM(CASE WHEN c.status = 'disapproved' THEN 1 ELSE 0 END) as disapproved_claims,
                COALESCE(SUM(c.insurance_paid), 0) as total_insurance_paid,
                COALESCE(SUM(c.client_responsibility), 0) as total_client_responsibility
            FROM customer cust
            LEFT JOIN policy p ON cust.customer_id = p.customer_id
            LEFT JOIN claim c ON p.policy_id = c.policy_id
            WHERE cust.agent_id = $1
            GROUP BY c.customer_id, cust.first_name, cust.last_name
            ORDER BY cust.first_name
        `;
        
        const result = await pool.query(query, [agentId]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching claim summary:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get claim statistics for a specific client
router.get('/agent/clients/:customerId/claim-stats', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        // Verify client belongs to this agent
        const verifyQuery = `
            SELECT customer_id FROM customer 
            WHERE customer_id = $1 AND agent_id = $2
        `;
        const verifyResult = await pool.query(verifyQuery, [customerId, agentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have access to this client' 
            });
        }
        
        const query = `
            SELECT 
                COUNT(*) as total_claims,
                COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN LOWER(status) = 'disapproved' THEN 1 END) as disapproved_count,
                COUNT(CASE WHEN LOWER(status) = 'paid' THEN 1 END) as paid_count,
                COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN COALESCE(approved_amount, claim_amount) ELSE 0 END), 0) as total_approved_amount
            FROM claim
            WHERE customer_id = $1
        `;
        
        const result = await pool.query(query, [customerId]);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching client claim stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Renew policy (reset coverage) - WITHOUT notes column
router.post('/agent/policies/:policyId/renew', authenticate, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { policyId } = req.params;
        const { renewal_period_months } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        await client.query('BEGIN');
        
        // Get current policy details
        const policyResult = await client.query(`
            SELECT * FROM policy WHERE policy_id = $1
        `, [policyId]);
        
        if (policyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }
        
        const currentPolicy = policyResult.rows[0];
        
        // Check if renewal is needed
        if (currentPolicy.remaining_coverage > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `Policy still has $${currentPolicy.remaining_coverage} remaining coverage. Renewal not needed yet.` 
            });
        }
        
        const renewalMonths = renewal_period_months || 12;
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + renewalMonths);
        
        // Store renewal history - NO notes column
        await client.query(`
            INSERT INTO policy_renewal_history (
                policy_id, renewal_date, previous_sum_insured, new_sum_insured,
                previous_remaining_coverage, new_remaining_coverage,
                renewal_period_months, created_by
            ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
        `, [
            policyId, 
            currentPolicy.sum_insured, 
            currentPolicy.sum_insured,
            currentPolicy.remaining_coverage,
            currentPolicy.sum_insured,
            renewalMonths,
            agentId
        ]);
        
        // Update policy with renewed values
        await client.query(`
            UPDATE policy 
            SET remaining_coverage = $1,
                used_coverage = 0,
                start_date = NOW(),
                end_date = $2,
                updated_at = NOW(),
                status = 'active'
            WHERE policy_id = $3
        `, [currentPolicy.sum_insured, newEndDate, policyId]);
        
        await client.query('COMMIT');
        
        // Send email notification to customer
        const emailService = require('../services/emailServices');
        const customerResult = await client.query(`
            SELECT c.email, c.first_name, c.last_name
            FROM customer c
            WHERE c.customer_id = $1
        `, [currentPolicy.customer_id]);
        
        if (customerResult.rows.length > 0) {
            const customer = customerResult.rows[0];
            await emailService.sendPolicyRenewalEmail(
                customer.email,
                `${customer.first_name} ${customer.last_name}`,
                {
                    policy_id: policyId,
                    policy_type: currentPolicy.policy_type,
                    sum_insured: currentPolicy.sum_insured,
                    renewal_period_months: renewalMonths,
                    new_end_date: newEndDate
                }
            );
        }
        
        res.json({
            success: true,
            message: `Policy renewed successfully for ${renewalMonths} months. Coverage reset to $${currentPolicy.sum_insured.toLocaleString()}.`,
            data: {
                policy_id: policyId,
                sum_insured: currentPolicy.sum_insured,
                remaining_coverage: currentPolicy.sum_insured,
                used_coverage: 0,
                new_end_date: newEndDate,
                renewal_period_months: renewalMonths
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error renewing policy:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});
// Get all claims for a specific client (with policy coverage info)
router.get('/agent/clients/:customerId/claims', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const agentId = req.user.userId || req.user.id;
        const { status } = req.query;
        
        // Verify client belongs to this agent
        const verifyQuery = `
            SELECT customer_id FROM customer 
            WHERE customer_id = $1 AND agent_id = $2
        `;
        const verifyResult = await pool.query(verifyQuery, [customerId, agentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have access to this client' 
            });
        }
        
        // IMPORTANT: Join with policy to get coverage info
        let query = `
            SELECT 
                c.claim_id,
                c.policy_id,
                c.customer_id,
                c.claim_type,
                c.claim_amount,
                c.approved_amount,
                c.status,
                c.filing_date,
                c.updated_at,
                c.approval_notes,
                c.payment_status,
                c.deductible_applied,
                c.co_pay_amount,
                c.insurance_paid,
                c.client_responsibility,
                p.policy_type,
                p.sum_insured,
                p.remaining_coverage,
                p.used_coverage,
                p.deductible_amount,
                p.co_pay_percentage
            FROM claim c
            LEFT JOIN policy p ON c.policy_id = p.policy_id
            WHERE c.customer_id = $1
        `;
        
        const params = [customerId];
        let paramCount = 2;
        
        if (status && status !== 'all') {
            query += ` AND LOWER(c.status) = LOWER($${paramCount})`;
            params.push(status);
            paramCount++;
        }
        
        query += ` ORDER BY c.filing_date DESC`;
        
        const result = await pool.query(query, params);
        
        // Calculate coverage used percentage for each claim
        const claimsWithPercentage = result.rows.map(claim => ({
            ...claim,
            coverage_used_percentage: claim.sum_insured > 0 
                ? ((claim.used_coverage || 0) / claim.sum_insured * 100).toFixed(2)
                : 0
        }));
        
        // Get statistics for this client
        const statsQuery = `
            SELECT 
                COUNT(*) as total_claims,
                COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN LOWER(status) = 'disapproved' THEN 1 END) as disapproved_count,
                COUNT(CASE WHEN LOWER(status) = 'paid' THEN 1 END) as paid_count,
                COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN COALESCE(approved_amount, claim_amount) ELSE 0 END), 0) as total_approved_amount
            FROM claim
            WHERE customer_id = $1
        `;
        
        const statsResult = await pool.query(statsQuery, [customerId]);
        
        res.json({
            success: true,
            data: claimsWithPercentage,
            stats: statsResult.rows[0],
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching client claims:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Retry payment for approved claim
router.post('/agent/claims/:claimId/retry-payment', authenticate, async (req, res) => {
    const client = await pool.connect();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const companyAccountService = require('../services/companyAccountService');
    
    try {
        const { claimId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        await client.query('BEGIN');
        
        // Get claim details with policy info
        const claimResult = await client.query(`
            SELECT 
                c.*,
                cust.email as customer_email,
                cust.first_name,
                cust.last_name,
                p.policy_type,
                p.remaining_coverage,
                p.sum_insured,
                p.policy_id
            FROM claim c
            JOIN customer cust ON c.customer_id = cust.customer_id
            JOIN policy p ON c.policy_id = p.policy_id
            WHERE c.claim_id = $1 AND c.status = 'approved'
        `, [claimId]);
        
        if (claimResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Approved claim not found. Only claims with "approved" status can be paid.' 
            });
        }
        
        const claim = claimResult.rows[0];
        
        // Try to get payment amount from multiple sources
        let insurancePaid = parseFloat(claim.insurance_paid) || 0;
        
        // If insurance_paid is 0, try to use approved_amount
        if (insurancePaid <= 0) {
            insurancePaid = parseFloat(claim.approved_amount) || 0;
            console.log(`📊 insurance_paid was 0, using approved_amount: $${insurancePaid}`);
        }
        
        // If still 0, try to use claim_amount (but this should be rare)
        if (insurancePaid <= 0) {
            insurancePaid = parseFloat(claim.claim_amount) || 0;
            console.log(`📊 approved_amount was 0, using claim_amount: $${insurancePaid}`);
        }
        
        // Check if this claim has any insurance payout
        if (insurancePaid <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: 'This claim has $0 insurance payout. No payment is required.',
                debug: {
                    claim_id: claimId,
                    claim_amount: claim.claim_amount,
                    approved_amount: claim.approved_amount,
                    insurance_paid: claim.insurance_paid,
                    client_responsibility: claim.client_responsibility
                }
            });
        }
        
        // Check company balance before processing
        const companyBalance = await companyAccountService.getCompanyBalance();
        if (companyBalance.balance < insurancePaid) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient company funds. Available: $${companyBalance.balance.toFixed(2)}. Required: $${insurancePaid.toFixed(2)}`,
                company_balance: companyBalance.balance
            });
        }
        
        // Generate new payment ID and transaction ID for retry
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        let stripeTransferId = null;
        let transferSuccess = false;
        let errorMessage = null;
        
        try {
            // Create Stripe PaymentIntent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(insurancePaid * 100),
                currency: 'usd',
                payment_method_types: ['card'],
                description: `Claim payment for claim #${claimId} - ${claim.policy_type}`,
                metadata: {
                    claim_id: claimId,
                    customer_id: claim.customer_id,
                    policy_id: claim.policy_id,
                    payment_id: paymentId,
                    is_retry: 'true'
                },
                receipt_email: claim.customer_email
            });
            
            stripeTransferId = paymentIntent.id;
            transferSuccess = true;
            
            console.log(`✅ Stripe payment intent created: ${stripeTransferId} for claim ${claimId}`);
            
        } catch (stripeError) {
            console.error('Stripe payment error:', stripeError);
            errorMessage = stripeError.message;
            transferSuccess = false;
        }
        
        if (transferSuccess) {
            // Debit from company account
            const debitResult = await companyAccountService.debitCompanyAccount(
                insurancePaid,
                claim.customer_id,
                claimId,
                `Claim payout retry for claim #${claimId} - ${claim.policy_type}`
            );
            
            if (!debitResult.success) {
                throw new Error(`Company account debit failed: ${debitResult.error}`);
            }
            
            // Create new payment record
            await client.query(`
                INSERT INTO payment (
                    payment_id, policy_id, customer_id, amount, method, 
                    status, transaction_ref, paid_at
                ) VALUES ($1, $2, $3, $4, 'stripe', 'completed', $5, NOW())
            `, [paymentId, claim.policy_id, claim.customer_id, insurancePaid, transactionId]);
            
            // Create transaction record
            await client.query(`
                INSERT INTO transaction (
                    transaction_id, related_payment_id, related_claim_id, 
                    amount, type, status, created_at, notes, payment_method
                ) VALUES ($1, $2, $3, $4, 'claim_payment', 'completed', NOW(), $5, 'stripe')
            `, [transactionId, paymentId, claimId, insurancePaid, `Payment retry for claim ${claimId}`]);
            
            // Update claim to 'paid'
            await client.query(`
                UPDATE claim 
                SET status = 'paid',
                    payment_status = 'completed',
                    payment_transfer_date = NOW(),
                    payment_intent_id = $1,
                    stripe_transfer_id = $2,
                    transfer_status = 'completed',
                    insurance_paid = $3,
                    updated_at = NOW()
                WHERE claim_id = $4
            `, [stripeTransferId, stripeTransferId, insurancePaid, claimId]);
            
            // Update policy remaining coverage
            const newRemainingCoverage = parseFloat(claim.remaining_coverage) - insurancePaid;
            const newUsedCoverage = parseFloat(claim.sum_insured) - newRemainingCoverage;
            
            await client.query(`
                UPDATE policy 
                SET remaining_coverage = $1,
                    used_coverage = $2,
                    updated_at = NOW()
                WHERE policy_id = $3
            `, [newRemainingCoverage, newUsedCoverage, claim.policy_id]);
            
            // Log audit
            await client.query(`
                INSERT INTO claim_audit_log (
                    claim_id, action, old_status, new_status,
                    performed_by, performed_by_type, reason, notes, created_at
                ) VALUES ($1, 'RETRY_PAYMENT_SUCCESS', 'approved', 'paid', $2, 'agent', $3, $4, NOW())
            `, [claimId, agentId, `Payment retry successful. Amount: $${insurancePaid} transferred. Company balance: $${debitResult.new_balance}`, null]);
            
            await client.query('COMMIT');
            
            // Send email confirmation
            const claimService = require('../services/claimService');
            await claimService.sendClaimPaymentConfirmationEmail(
                {
                    claim_id: claimId,
                    claim_amount: claim.claim_amount,
                    approved_amount: claim.approved_amount,
                    insurance_paid: insurancePaid,
                    payment_id: paymentId,
                    transaction_id: transactionId,
                    stripe_transfer_id: stripeTransferId
                },
                claim.customer_email,
                `${claim.first_name} ${claim.last_name}`
            );
            
            res.json({
                success: true,
                message: `Payment of $${insurancePaid.toFixed(2)} transferred successfully!`,
                data: {
                    claim_id: claimId,
                    status: 'paid',
                    amount: insurancePaid,
                    payment_id: paymentId,
                    stripe_transfer_id: stripeTransferId,
                    company_balance: debitResult.new_balance
                }
            });
            
        } else {
            // Update claim with error (keep status as 'approved')
            await client.query(`
                UPDATE claim 
                SET payment_status = 'failed',
                    transfer_status = 'failed',
                    payment_error = $1,
                    updated_at = NOW()
                WHERE claim_id = $2
            `, [errorMessage, claimId]);
            
            // Log failed attempt
            await client.query(`
                INSERT INTO claim_audit_log (
                    claim_id, action, old_status, new_status,
                    performed_by, performed_by_type, reason, notes, created_at
                ) VALUES ($1, 'RETRY_PAYMENT_FAILED', 'approved', 'approved', $2, 'agent', $3, $4, NOW())
            `, [claimId, agentId, `Payment failed: ${errorMessage}`, null]);
            
            await client.query('COMMIT');
            
            res.status(500).json({
                success: false,
                message: `Payment failed: ${errorMessage}`,
                error: errorMessage
            });
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error retrying payment:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});
module.exports = router;