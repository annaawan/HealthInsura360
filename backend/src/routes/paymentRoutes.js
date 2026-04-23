const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const stripePaymentService = require('../services/stripePaymentService');
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

// Mock data for fallback when database retrieval fails
const mockTransactions = [
  {
    transaction_id: 'MOCK_TXN001',
    related_payment_id: 'MOCK_PAY001',
    related_claim_id: 'MOCK_CLM001',
    related_commission_id: null,
    amount: 199.00,
    type: 'Premium Payment',
    status: 'Completed',
    created_at: new Date().toISOString(),
    customer: { name: 'Mock User - Database Failed' },
    payment: { method: 'Credit Card' }
  },
  {
    transaction_id: 'MOCK_TXN002',
    related_payment_id: 'MOCK_PAY002',
    related_claim_id: null,
    related_commission_id: 'MOCK_COMM001',
    amount: 299.00,
    type: 'Commission Payment',
    status: 'Pending',
    created_at: new Date().toISOString(),
    customer: { name: 'Mock Agent - Database Failed' },
    payment: { method: 'Bank Transfer' }
  },
  {
    transaction_id: 'MOCK_TXN003',
    related_payment_id: 'MOCK_PAY003',
    related_claim_id: 'MOCK_CLM002',
    related_commission_id: null,
    amount: 45000.00,
    type: 'Hospital Payment',
    status: 'Completed',
    created_at: new Date().toISOString(),
    customer: { name: 'Mock Hospital - Database Failed' },
    payment: { method: 'Wire Transfer' }
  }
];

// ============ HELPER FUNCTIONS ============

const getUserInfo = (req) => {
  return {
    id: req.user?.userId || req.user?.id || req.headers['x-user-id'] || 1,
    type: req.user?.userType || req.user?.role || req.headers['x-user-type'] || 'admin',
    email: req.user?.email || req.headers['x-user-email'] || 'admin@system.com'
  };
};

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

// ============ TRANSACTION ROUTES (from paymentRoutes2) ============

// Get all transactions - handles three scenarios (mock data fallback)
router.get('/transactions', async (req, res) => {
  console.log('📊 Transactions route hit - fetching from database');
  
  try {
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'transaction'
      ) as table_exists
    `;
    
    const tableCheck = await pool.query(checkQuery);
    const tableExists = tableCheck.rows[0].table_exists;
    
    if (!tableExists) {
      console.log('❌ Transaction table does not exist in database');
      return res.status(200).json({
        success: true,
        scenario: 'no_table',
        message: 'Transaction table does not exist in database',
        count: 0,
        data: []
      });
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM transaction`;
    const countResult = await pool.query(countQuery);
    const recordCount = parseInt(countResult.rows[0].total, 10);
    
    console.log(`📊 Database has ${recordCount} transaction records`);
    
    if (recordCount === 0) {
      console.log('📭 No transactions found in database');
      return res.status(200).json({
        success: true,
        scenario: 'no_data',
        message: 'No transactions found in the database',
        count: 0,
        data: []
      });
    }
    
    console.log('✅ Data exists, fetching from database');
    
    const query = `
      SELECT 
        t.transaction_id,
        t.related_payment_id,
        t.related_claim_id,
        t.related_commission_id,
        t.amount,
        t.type,
        t.status,
        t.created_at,
        c.first_name || ' ' || c.last_name as customer_name,
        p.method as payment_method,
        p.status as payment_status
      FROM transaction t
      LEFT JOIN payment p ON t.related_payment_id = p.payment_id
      LEFT JOIN customer c ON p.customer_id = c.customer_id
      ORDER BY t.created_at DESC
      LIMIT 100
    `;
    
    const result = await pool.query(query);
    
    const transactions = result.rows.map(row => ({
      transaction_id: row.transaction_id,
      related_payment_id: row.related_payment_id,
      related_claim_id: row.related_claim_id,
      related_commission_id: row.related_commission_id,
      amount: parseFloat(row.amount),
      type: row.type,
      status: row.status,
      created_at: row.created_at,
      customer: {
        name: row.customer_name || 'Unknown Customer'
      },
      payment: {
        method: row.payment_method || 'Unknown',
        status: row.payment_status
      }
    }));
    
    console.log(`✅ Successfully retrieved ${transactions.length} transactions from database`);
    
    return res.status(200).json({
      success: true,
      scenario: 'has_data',
      message: 'Transactions retrieved successfully',
      count: transactions.length,
      data: transactions
    });
    
  } catch (error) {
    console.error('❌ Database retrieval failed:', error.message);
    console.error('Full error:', error);
    
    return res.status(200).json({
      success: true,
      scenario: 'mock_data',
      message: 'Failed to retrieve data from database. Showing mock data.',
      error: error.message,
      count: mockTransactions.length,
      data: mockTransactions
    });
  }
});

// Get transaction statistics
router.get('/transactions/stats/summary', async (req, res) => {
  console.log('📊 Stats route hit');
  
  try {
    const countQuery = `SELECT COUNT(*) as total FROM transaction`;
    const countResult = await pool.query(countQuery);
    const recordCount = parseInt(countResult.rows[0].total, 10);
    
    if (recordCount === 0) {
      return res.status(200).json({
        success: true,
        scenario: 'no_data',
        message: 'No transactions found',
        data: {
          total_transactions: 0,
          successful_count: 0,
          pending_count: 0,
          failed_count: 0,
          total_revenue: 0
        }
      });
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as successful_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) as total_revenue
      FROM transaction
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      scenario: 'has_data',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(200).json({
      success: true,
      scenario: 'error',
      message: 'Failed to fetch statistics',
      data: {
        total_transactions: 0,
        successful_count: 0,
        pending_count: 0,
        failed_count: 0,
        total_revenue: 0
      }
    });
  }
});

// Update transaction status
router.put('/transactions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Pending', 'Completed', 'Failed', 'Refunded', 'Disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    const query = 'UPDATE transaction SET status = $1 WHERE transaction_id = $2';
    const result = await pool.query(query, [status, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Transaction status updated successfully'
    });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction status'
    });
  }
});

// ============ STRIPE PAYMENT ROUTES FOR COMMISSIONS ============

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
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) as total_revenue
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

// ============ AGENT PAYMENT MANAGEMENT ROUTES ============

// Get agent's clients with payment history
router.get('/agent/clients', authenticate, async (req, res) => {
  try {
    const agentId = req.user.userId || req.user.id;
    console.log('🔵 Fetching clients for agent ID:', agentId);
    
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

// Get payment statistics for agent dashboard
router.get('/agent/payments/stats', authenticate, async (req, res) => {
  try {
    const agentId = req.user.userId || req.user.id;
    const agentIdInt = parseInt(agentId, 10);
    
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
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get client policies for agent
router.get('/agent/clients/:customerId/policies', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    const agentId = req.user.userId || req.user.id;
    
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

// Get client payment history for agent
router.get('/agent/clients/:customerId/payments', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    const agentId = req.user.userId || req.user.id;
    
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
    
    const clientQuery = `
      SELECT first_name, last_name, email, phone 
      FROM customer WHERE customer_id = $1
    `;
    const clientResult = await pool.query(clientQuery, [customerId]);
    
    const paymentsWithAudit = await Promise.all(result.rows.map(async (payment) => {
      if (payment.transaction_id) {
        const auditQuery = `
          SELECT audit_id, action, old_status, new_status, created_at
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

// Record a payment from client
router.post('/agent/record-payment', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { customer_id, policy_id, amount, method, transaction_ref, notes } = req.body;
    const agentId = req.user.userId || req.user.id;
    
    if (!customer_id || !policy_id || !amount || !method) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    await client.query('BEGIN');
    
    const policyIdInt = parseInt(policy_id, 10);
    const customerIdInt = parseInt(customer_id, 10);
    const agentIdInt = parseInt(agentId, 10);
    
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
    
    const insertPaymentQuery = `
      INSERT INTO payment (policy_id, customer_id, amount, method, status, transaction_ref, paid_at)
      VALUES ($1, $2, $3, $4, 'Completed', $5, NOW())
      RETURNING payment_id
    `;
    const paymentResult = await client.query(insertPaymentQuery, [
      policyIdInt, customerIdInt, amount, method, transaction_ref || null
    ]);
    
    const paymentId = paymentResult.rows[0].payment_id;
    
    const insertTransactionQuery = `
      INSERT INTO transaction (related_payment_id, amount, type, status, created_at, notes, payment_method)
      VALUES ($1, $2, 'Premium Payment', 'Completed', NOW(), $3, $4)
      RETURNING transaction_id
    `;
    const transactionResult = await client.query(insertTransactionQuery, [
      paymentId, amount, notes || `Payment collected by agent for ${clientInfo.policy_type} policy`, method
    ]);
    
    const transactionId = transactionResult.rows[0].transaction_id;
    
    const auditQuery = `
      INSERT INTO payment_audit_log (transaction_id, action, old_status, new_status, performed_by, performed_by_type, reason, created_at)
      VALUES ($1, 'payment_recorded', NULL, 'Completed', $2, 'agent', $3, NOW())
    `;
    await client.query(auditQuery, [transactionId, agentIdInt, notes || null]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment_id: paymentId, transaction_id: transactionId }
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

router.post('/receipt/:paymentId/email', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { email } = req.body;
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

router.get('/receipt/:paymentId/pdf', authenticate, async (req, res) => {
    res.redirect(`/api/payments/receipt/${req.params.paymentId}/print`);
});

// ============ PAYMENT REMINDER ROUTES ============

router.post('/reminders', authenticate, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { customer_id, policy_id, reminder_date, reminder_time, frequency, recurring_end_date, notification_methods, message } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        if (!customer_id || !policy_id || !reminder_date) {
            return res.status(400).json({ success: false, message: 'Customer ID, Policy ID, and Reminder Date are required' });
        }
        
        await client.query('BEGIN');
        
        const verifyQuery = `
            SELECT c.customer_id, c.first_name, c.last_name, c.email, c.phone, p.policy_type, p.premium_amount, p.end_date
            FROM customer c
            JOIN policy p ON c.customer_id = p.customer_id
            WHERE c.customer_id = $1 AND c.agent_id = $2 AND p.policy_id = $3
        `;
        const verifyResult = await client.query(verifyQuery, [customer_id, agentId, policy_id]);
        
        if (verifyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'You do not have access to this client/policy' });
        }
        
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
            customer_id, policy_id, agentId, reminder_date, reminder_time || '09:00:00',
            frequency || 'one-time', recurring_end_date || null,
            notification_methods || ['email'], message || null,
            reminder_date, agentId
        ]);
        
        await client.query('COMMIT');
        
        res.json({ success: true, message: 'Payment reminder created successfully', data: { reminder_id: result.rows[0].reminder_id } });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

router.get('/reminders', authenticate, async (req, res) => {
    try {
        const agentId = req.user.userId || req.user.id;
        const { status, upcoming } = req.query;
        
        let query = `
            SELECT r.*, c.first_name, c.last_name, c.email, c.phone, p.policy_type, p.premium_amount, p.end_date as policy_end_date
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
        
        res.json({ success: true, data: result.rows, count: result.rows.length });
        
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/reminders/:reminderId/status', authenticate, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const { status, notes } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        const validStatuses = ['active', 'cancelled', 'completed', 'sent'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        
        const query = `
            UPDATE payment_reminders 
            SET status = $1, updated_at = NOW(), notes = COALESCE($2, notes)
            WHERE reminder_id = $3 AND agent_id = $4
            RETURNING reminder_id
        `;
        
        const result = await pool.query(query, [status, notes, reminderId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        
        res.json({ success: true, message: `Reminder ${status} successfully` });
        
    } catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/reminders/:reminderId', authenticate, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const query = `DELETE FROM payment_reminders WHERE reminder_id = $1 AND agent_id = $2 RETURNING reminder_id`;
        const result = await pool.query(query, [reminderId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        
        res.json({ success: true, message: 'Reminder deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/reminders/:reminderId/send', authenticate, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const reminderQuery = `
            SELECT r.*, c.first_name, c.last_name, c.email, c.phone, p.policy_type, p.premium_amount, p.end_date as policy_end_date
            FROM payment_reminders r
            JOIN customer c ON r.customer_id = c.customer_id
            JOIN policy p ON r.policy_id = p.policy_id
            WHERE r.reminder_id = $1 AND r.agent_id = $2
        `;
        
        const result = await pool.query(reminderQuery, [reminderId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        
        const reminder = result.rows[0];
        const daysUntilDue = Math.ceil((new Date(reminder.reminder_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        const reminderService = require('../services/reminderService');
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
        
        const emailResult = await reminderService.sendEmailReminder(emailData);
        
        if (emailResult.success) {
            await pool.query(`UPDATE payment_reminders SET last_sent_at = NOW(), status = 'sent' WHERE reminder_id = $1`, [reminderId]);
            await pool.query(`
                INSERT INTO reminder_logs (reminder_id, customer_id, customer_email, customer_phone, notification_type, subject, message, status, sent_at)
                VALUES ($1, $2, $3, $4, 'email', $5, $6, 'sent', NOW())
            `, [reminderId, reminder.customer_id, reminder.email, reminder.phone, emailData.subject, reminder.message || emailData.subject]);
        }
        
        res.json({ success: emailResult.success, message: emailResult.success ? 'Reminder sent successfully' : 'Failed to send reminder', error: emailResult.error });
        
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/reminders/trigger-manual', authenticate, async (req, res) => {
    try {
        const reminderScheduler = require('../services/reminderScheduler');
        await reminderScheduler.manualTrigger();
        res.json({ success: true, message: 'Reminder check triggered manually' });
    } catch (error) {
        console.error('Error triggering reminders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ CLAIM MANAGEMENT ROUTES ============

// Get all claims for a specific client (with policy coverage info)
router.get('/agent/clients/:customerId/claims', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const agentId = req.user.userId || req.user.id;
        const { status } = req.query;
        
        const verifyQuery = `SELECT customer_id FROM customer WHERE customer_id = $1 AND agent_id = $2`;
        const verifyResult = await pool.query(verifyQuery, [customerId, agentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You do not have access to this client' });
        }
        
        let query = `
            SELECT 
                c.claim_id, c.policy_id, c.customer_id, c.claim_type, c.claim_amount,
                c.approved_amount, c.status, c.filing_date, c.updated_at, c.approval_notes,
                c.payment_status, c.deductible_applied, c.co_pay_amount, c.insurance_paid,
                c.client_responsibility, p.policy_type, p.sum_insured, p.remaining_coverage,
                p.used_coverage, p.deductible_amount, p.co_pay_percentage
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
        
        const claimsWithPercentage = result.rows.map(claim => ({
            ...claim,
            coverage_used_percentage: claim.sum_insured > 0 ? ((claim.used_coverage || 0) / claim.sum_insured * 100).toFixed(2) : 0
        }));
        
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
        
        res.json({ success: true, data: claimsWithPercentage, stats: statsResult.rows[0], count: result.rows.length });
        
    } catch (error) {
        console.error('Error fetching client claims:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get claim statistics for a specific client
router.get('/agent/clients/:customerId/claim-stats', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const verifyQuery = `SELECT customer_id FROM customer WHERE customer_id = $1 AND agent_id = $2`;
        const verifyResult = await pool.query(verifyQuery, [customerId, agentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You do not have access to this client' });
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
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error fetching client claim stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single claim details
router.get('/agent/claims/:claimId', authenticate, async (req, res) => {
    try {
        const { claimId } = req.params;
        const agentId = req.user.userId || req.user.id;
        
        const query = `
            SELECT 
                c.*, cust.first_name as customer_first_name, cust.last_name as customer_last_name,
                cust.email as customer_email, cust.phone as customer_phone, h.name as hospital_name,
                h.email as hospital_email, p.policy_type, p.sum_insured, p.remaining_coverage,
                p.used_coverage, p.deductible_amount, p.co_pay_percentage
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
        claim.coverage_used_percentage = claim.sum_insured > 0 ? ((claim.used_coverage || 0) / claim.sum_insured * 100).toFixed(2) : 0;
        
        const docsResult = await pool.query(`SELECT * FROM claim_documents WHERE claim_id = $1 ORDER BY uploaded_at DESC`, [claimId]);
        claim.documents = docsResult.rows;
        
        const auditResult = await pool.query(`SELECT * FROM claim_audit_log WHERE claim_id = $1 ORDER BY created_at DESC`, [claimId]);
        claim.audit_logs = auditResult.rows;
        
        res.json({ success: true, data: claim });
        
    } catch (error) {
        console.error('Error fetching claim:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve claim
router.put('/agent/claims/:claimId/approve', authenticate, async (req, res) => {
    const client = await pool.connect();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const companyAccountService = require('../services/companyAccountService');
    
    try {
        const { claimId } = req.params;
        const { approved_amount, coverage_type, notes } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        await client.query('BEGIN');
        
        const claimResult = await client.query(`
            SELECT c.*, p.policy_id, p.sum_insured, p.remaining_coverage, p.used_coverage,
                   p.deductible_amount as policy_deductible, p.co_pay_percentage as policy_copay,
                   p.policy_type, cust.email as customer_email, cust.first_name, cust.last_name, cust.phone
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
        
        if (isNaN(finalApprovedAmount) || finalApprovedAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid approved amount' });
        }
        
        const remainingCoverage = parseFloat(claim.remaining_coverage) || 0;
        if (finalApprovedAmount > remainingCoverage) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Insufficient coverage. Remaining: $${remainingCoverage.toFixed(2)}` });
        }
        
        const deductibleAmount = parseFloat(claim.policy_deductible) || 0;
        const coPayPercentage = parseFloat(claim.policy_copay) || 0;
        
        let deductibleApplied = Math.min(deductibleAmount, finalApprovedAmount);
        let remainingAfterDeductible = finalApprovedAmount - deductibleApplied;
        let coPayAmount = (remainingAfterDeductible * coPayPercentage) / 100;
        let insurancePaid = remainingAfterDeductible - coPayAmount;
        let clientResponsibility = deductibleApplied + coPayAmount;
        
        deductibleApplied = Math.round(deductibleApplied * 100) / 100;
        coPayAmount = Math.round(coPayAmount * 100) / 100;
        insurancePaid = Math.round(insurancePaid * 100) / 100;
        clientResponsibility = Math.round(clientResponsibility * 100) / 100;
        
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        await client.query(`
            INSERT INTO payment (payment_id, policy_id, customer_id, amount, method, status, transaction_ref, paid_at)
            VALUES ($1, $2, $3, $4, 'stripe', 'pending', $5, NOW())
        `, [paymentId, claim.policy_id, claim.customer_id, insurancePaid, transactionId]);
        
        let transferStatus = 'pending';
        let stripeTransferId = null;
        let paymentIntentId = null;
        
        if (insurancePaid > 0) {
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(insurancePaid * 100),
                    currency: 'usd',
                    payment_method_types: ['card'],
                    description: `Claim payment for claim #${claimId} - ${claim.policy_type}`,
                    metadata: { claim_id: claimId, customer_id: claim.customer_id, policy_id: claim.policy_id, payment_id: paymentId },
                    receipt_email: claim.customer_email
                });
                
                paymentIntentId = paymentIntent.id;
                stripeTransferId = paymentIntentId;
                transferStatus = 'completed';
                
                const debitResult = await companyAccountService.debitCompanyAccount(
                    insurancePaid, claim.customer_id, claimId,
                    `Claim payout for claim #${claimId} - ${claim.policy_type}`
                );
                
                console.log(`✅ Company account debited: $${insurancePaid}`);
                
            } catch (stripeError) {
                console.error('Stripe payment error:', stripeError);
                transferStatus = 'failed';
            }
        }
        
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
            finalApprovedAmount, agentId, notes || null, deductibleApplied, coPayAmount,
            insurancePaid, clientResponsibility, coverage_type || 'full_coverage', notes || null,
            transferStatus, paymentIntentId, stripeTransferId, transferStatus, claimId
        ]);
        
        await client.query(`UPDATE transaction SET status = $1 WHERE related_payment_id = $2`, 
            [transferStatus === 'completed' ? 'completed' : 'pending', paymentId]);
        
        const newRemainingCoverage = remainingCoverage - insurancePaid;
        const newUsedCoverage = (parseFloat(claim.sum_insured) || 0) - newRemainingCoverage;
        
        await client.query(`UPDATE policy SET remaining_coverage = $1::DECIMAL, used_coverage = $2::DECIMAL, updated_at = NOW() WHERE policy_id = $3::INTEGER`,
            [newRemainingCoverage, newUsedCoverage, claim.policy_id]);
        
        await client.query(`INSERT INTO claim_audit_log (claim_id, action, old_status, new_status, performed_by, performed_by_type, reason, notes, created_at)
            VALUES ($1::INTEGER, 'APPROVE_AND_PAY', 'pending', 'paid', $2::INTEGER, 'agent', $3::TEXT, $4::TEXT, NOW())`,
            [claimId, agentId, `Amount: $${insurancePaid} transferred`, notes || null]);
        
        await client.query('COMMIT');
        
        const claimService = require('../services/claimService');
        await claimService.sendClaimPaymentConfirmationEmail({
            claim_id: claimId, claim_amount: requestedAmount, approved_amount: finalApprovedAmount,
            insurance_paid: insurancePaid, payment_id: paymentId, transaction_id: transactionId,
            payment_status: transferStatus, stripe_transfer_id: stripeTransferId
        }, claim.customer_email, `${claim.first_name} ${claim.last_name}`);
        
        res.json({ success: true, message: `Claim approved and $${insurancePaid.toFixed(2)} transferred`, data: { claim_id: claimId, status: 'paid' } });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving claim:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
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
        
        let claimantEmail = claim.customer_email || claim.hospital_email;
        let claimantName = claim.customer_email ? `${claim.first_name} ${claim.last_name}` : claim.hospital_name;
        
        await client.query(`
            INSERT INTO claim_audit_log (claim_id, action, old_status, new_status, performed_by, performed_by_type, reason, notes, created_at)
            VALUES ($1, 'DISAPPROVE', $2, 'disapproved', $3, 'agent', $4, $5, NOW())
        `, [claimId, oldStatus, agentId, reason, notes]);
        
        const claimService = require('../services/claimService');
        await claimService.sendClaimDisapprovalEmail(claim, claimantEmail, claimantName, reason);
        
        await client.query('COMMIT');
        
        res.json({ success: true, message: 'Claim disapproved successfully', data: { claim_id: claimId, status: 'disapproved' } });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error disapproving claim:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
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
        
        const claimResult = await client.query(`
            SELECT c.*, cust.email as customer_email, cust.first_name, cust.last_name,
                   p.policy_type, p.remaining_coverage, p.sum_insured, p.policy_id
            FROM claim c
            JOIN customer cust ON c.customer_id = cust.customer_id
            JOIN policy p ON c.policy_id = p.policy_id
            WHERE c.claim_id = $1 AND c.status = 'approved'
        `, [claimId]);
        
        if (claimResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Approved claim not found' });
        }
        
        const claim = claimResult.rows[0];
        let insurancePaid = parseFloat(claim.insurance_paid) || 0;
        
        if (insurancePaid <= 0) {
            insurancePaid = parseFloat(claim.approved_amount) || 0;
        }
        
        if (insurancePaid <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'This claim has $0 insurance payout. No payment is required.' });
        }
        
        const companyBalance = await companyAccountService.getCompanyBalance();
        if (companyBalance.balance < insurancePaid) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Insufficient company funds. Available: $${companyBalance.balance.toFixed(2)}` });
        }
        
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        let stripeTransferId = null;
        let transferSuccess = false;
        let errorMessage = null;
        
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(insurancePaid * 100),
                currency: 'usd',
                payment_method_types: ['card'],
                description: `Claim payment for claim #${claimId} - ${claim.policy_type}`,
                metadata: { claim_id: claimId, customer_id: claim.customer_id, policy_id: claim.policy_id, payment_id: paymentId, is_retry: 'true' },
                receipt_email: claim.customer_email
            });
            
            stripeTransferId = paymentIntent.id;
            transferSuccess = true;
            
        } catch (stripeError) {
            errorMessage = stripeError.message;
            transferSuccess = false;
        }
        
        if (transferSuccess) {
            const debitResult = await companyAccountService.debitCompanyAccount(insurancePaid, claim.customer_id, claimId, `Claim payout retry for claim #${claimId}`);
            
            await client.query(`
                INSERT INTO payment (payment_id, policy_id, customer_id, amount, method, status, transaction_ref, paid_at)
                VALUES ($1, $2, $3, $4, 'stripe', 'completed', $5, NOW())
            `, [paymentId, claim.policy_id, claim.customer_id, insurancePaid, transactionId]);
            
            await client.query(`
                INSERT INTO transaction (transaction_id, related_payment_id, related_claim_id, amount, type, status, created_at, notes, payment_method)
                VALUES ($1, $2, $3, $4, 'claim_payment', 'completed', NOW(), $5, 'stripe')
            `, [transactionId, paymentId, claimId, insurancePaid, `Payment retry for claim ${claimId}`]);
            
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
            
            const newRemainingCoverage = parseFloat(claim.remaining_coverage) - insurancePaid;
            const newUsedCoverage = parseFloat(claim.sum_insured) - newRemainingCoverage;
            
            await client.query(`UPDATE policy SET remaining_coverage = $1, used_coverage = $2, updated_at = NOW() WHERE policy_id = $3`,
                [newRemainingCoverage, newUsedCoverage, claim.policy_id]);
            
            await client.query(`INSERT INTO claim_audit_log (claim_id, action, old_status, new_status, performed_by, performed_by_type, reason, notes, created_at)
                VALUES ($1, 'RETRY_PAYMENT_SUCCESS', 'approved', 'paid', $2, 'agent', $3, $4, NOW())`,
                [claimId, agentId, `Payment retry successful. Amount: $${insurancePaid} transferred`, null]);
            
            await client.query('COMMIT');
            
            const claimService = require('../services/claimService');
            await claimService.sendClaimPaymentConfirmationEmail({
                claim_id: claimId, claim_amount: claim.claim_amount, approved_amount: claim.approved_amount,
                insurance_paid: insurancePaid, payment_id: paymentId, transaction_id: transactionId, stripe_transfer_id: stripeTransferId
            }, claim.customer_email, `${claim.first_name} ${claim.last_name}`);
            
            res.json({ success: true, message: `Payment of $${insurancePaid.toFixed(2)} transferred successfully!`, data: { claim_id: claimId, status: 'paid' } });
            
        } else {
            await client.query(`UPDATE claim SET payment_status = 'failed', transfer_status = 'failed', payment_error = $1, updated_at = NOW() WHERE claim_id = $2`, [errorMessage, claimId]);
            await client.query(`INSERT INTO claim_audit_log (claim_id, action, old_status, new_status, performed_by, performed_by_type, reason, notes, created_at)
                VALUES ($1, 'RETRY_PAYMENT_FAILED', 'approved', 'approved', $2, 'agent', $3, $4, NOW())`,
                [claimId, agentId, `Payment failed: ${errorMessage}`, null]);
            await client.query('COMMIT');
            res.status(500).json({ success: false, message: `Payment failed: ${errorMessage}` });
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error retrying payment:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Get company account balance
router.get('/company/balance', authenticate, async (req, res) => {
    try {
        const companyAccountService = require('../services/companyAccountService');
        const balance = await companyAccountService.getCompanyBalance();
        const summary = await companyAccountService.getCompanySummary();
        const ledger = await companyAccountService.getLedgerTransactions(20, 0);
        res.json({ success: true, data: { balance, summary, recent_transactions: ledger } });
    } catch (error) {
        console.error('Error fetching company balance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add funds to company account (admin only)
router.post('/company/add-funds', authenticate, adminMiddleware, async (req, res) => {
    try {
        const { amount, description } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }
        
        const result = await pool.query(`UPDATE company_account SET balance = balance + $1, updated_at = NOW() WHERE account_type = 'operating' RETURNING balance`, [amount]);
        await pool.query(`INSERT INTO ledger_transactions (transaction_type, amount, from_account_type, to_account_type, reference_id, description, status, created_at)
            VALUES ('manual_addition', $1, 'admin', 'company', 'MANUAL_FUNDS', $2, 'completed', NOW())`, [amount, description || 'Manual funds added']);
        
        res.json({ success: true, message: `$${amount} added to company account`, data: { new_balance: result.rows[0].balance } });
    } catch (error) {
        console.error('Error adding funds:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get claim statistics summary
router.get('/agent/claims/stats/summary', authenticate, async (req, res) => {
    try {
        const agentId = req.user.userId || req.user.id;
        const claimsQuery = `SELECT c.status, c.approved_amount, c.claim_amount FROM claim c LEFT JOIN customer cust ON c.customer_id = cust.customer_id WHERE cust.agent_id = $1`;
        const result = await pool.query(claimsQuery, [agentId]);
        const claims = result.rows;
        
        let stats = { total_claims: claims.length, pending_count: 0, approved_count: 0, disapproved_count: 0, paid_count: 0, total_approved_amount: 0, total_paid_amount: 0 };
        
        claims.forEach(claim => {
            const status = (claim.status || '').toLowerCase();
            if (status === 'pending') stats.pending_count++;
            else if (status === 'approved') { stats.approved_count++; stats.total_approved_amount += parseFloat(claim.approved_amount || claim.claim_amount || 0); }
            else if (status === 'disapproved') stats.disapproved_count++;
            else if (status === 'paid') { stats.paid_count++; stats.total_paid_amount += parseFloat(claim.approved_amount || claim.claim_amount || 0); stats.total_approved_amount += parseFloat(claim.approved_amount || claim.claim_amount || 0); }
        });
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching claim stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Send payment reminder to client
router.post('/agent/send-reminder', authenticate, async (req, res) => {
    try {
        const { customer_id, policy_id } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        const verifyQuery = `
            SELECT c.customer_id, c.email, c.first_name, c.last_name, p.policy_type, p.premium_amount
            FROM customer c JOIN policy p ON c.customer_id = p.customer_id
            WHERE c.customer_id = $1 AND c.agent_id = $2 AND p.policy_id = $3
        `;
        const verifyResult = await pool.query(verifyQuery, [customer_id, agentId, policy_id]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You do not have access to this client' });
        }
        
        const clientInfo = verifyResult.rows[0];
        const notificationId = `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const subject = `Payment Reminder for ${clientInfo.policy_type} Policy`;
        
        await pool.query(`
            INSERT INTO email_notifications (notification_id, recipient_email, recipient_name, subject, status, notification_type, created_at)
            VALUES ($1, $2, $3, $4, 'pending', 'payment_reminder', NOW())
        `, [notificationId, clientInfo.email, `${clientInfo.first_name} ${clientInfo.last_name}`, subject]);
        
        res.json({ success: true, message: `Payment reminder sent to ${clientInfo.first_name} ${clientInfo.last_name}`, data: { notification_id: notificationId } });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Renew policy
router.post('/agent/policies/:policyId/renew', authenticate, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { policyId } = req.params;
        const { renewal_period_months } = req.body;
        const agentId = req.user.userId || req.user.id;
        
        await client.query('BEGIN');
        
        const policyResult = await client.query(`SELECT * FROM policy WHERE policy_id = $1`, [policyId]);
        if (policyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }
        
        const currentPolicy = policyResult.rows[0];
        
        if (currentPolicy.remaining_coverage > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Policy still has $${currentPolicy.remaining_coverage} remaining coverage. Renewal not needed yet.` });
        }
        
        const renewalMonths = renewal_period_months || 12;
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + renewalMonths);
        
        await client.query(`
            INSERT INTO policy_renewal_history (policy_id, renewal_date, previous_sum_insured, new_sum_insured,
                previous_remaining_coverage, new_remaining_coverage, renewal_period_months, created_by)
            VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
        `, [policyId, currentPolicy.sum_insured, currentPolicy.sum_insured, currentPolicy.remaining_coverage, currentPolicy.sum_insured, renewalMonths, agentId]);
        
        await client.query(`
            UPDATE policy 
            SET remaining_coverage = $1, used_coverage = 0, start_date = NOW(), end_date = $2, updated_at = NOW(), status = 'active'
            WHERE policy_id = $3
        `, [currentPolicy.sum_insured, newEndDate, policyId]);
        
        await client.query('COMMIT');
        
        const emailService = require('../services/emailServices');
        const customerResult = await client.query(`SELECT c.email, c.first_name, c.last_name FROM customer c WHERE c.customer_id = $1`, [currentPolicy.customer_id]);
        
        if (customerResult.rows.length > 0) {
            const customer = customerResult.rows[0];
            await emailService.sendPolicyRenewalEmail(customer.email, `${customer.first_name} ${customer.last_name}`, {
                policy_id: policyId, policy_type: currentPolicy.policy_type, sum_insured: currentPolicy.sum_insured,
                renewal_period_months: renewalMonths, new_end_date: newEndDate
            });
        }
        
        res.json({ success: true, message: `Policy renewed successfully for ${renewalMonths} months.`, data: { policy_id: policyId, remaining_coverage: currentPolicy.sum_insured } });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error renewing policy:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

module.exports = router;