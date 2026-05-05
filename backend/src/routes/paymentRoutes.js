const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const stripePaymentService = require('../services/stripePaymentService');
const reminderService = require('../services/reminderService');
const companyAccountService = require('../services/companyAccountService');

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

// // Get all transactions - handles three scenarios (mock data fallback)
// router.get('/transactions', async (req, res) => {
//   console.log('📊 Transactions route hit - fetching from database');
  
//   try {
//     const checkQuery = `
//       SELECT EXISTS (
//         SELECT FROM information_schema.tables 
//         WHERE table_name = 'transaction'
//       ) as table_exists
//     `;
    
//     const tableCheck = await pool.query(checkQuery);
//     const tableExists = tableCheck.rows[0].table_exists;
    
//     if (!tableExists) {
//       console.log('❌ Transaction table does not exist in database');
//       return res.status(200).json({
//         success: true,
//         scenario: 'no_table',
//         message: 'Transaction table does not exist in database',
//         count: 0,
//         data: []
//       });
//     }
    
//     const countQuery = `SELECT COUNT(*) as total FROM transaction`;
//     const countResult = await pool.query(countQuery);
//     const recordCount = parseInt(countResult.rows[0].total, 10);
    
//     console.log(`📊 Database has ${recordCount} transaction records`);
    
//     if (recordCount === 0) {
//       console.log('📭 No transactions found in database');
//       return res.status(200).json({
//         success: true,
//         scenario: 'no_data',
//         message: 'No transactions found in the database',
//         count: 0,
//         data: []
//       });
//     }
    
//     console.log('✅ Data exists, fetching from database');
    
//     const query = `
//       SELECT 
//         t.transaction_id,
//         t.related_payment_id,
//         t.related_claim_id,
//         t.related_commission_id,
//         t.amount,
//         t.type,
//         t.status,
//         t.created_at,
//         c.first_name || ' ' || c.last_name as customer_name,
//         p.method as payment_method,
//         p.status as payment_status
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       ORDER BY t.created_at DESC
//       LIMIT 100
//     `;
    
//     const result = await pool.query(query);
    
//     const transactions = result.rows.map(row => ({
//       transaction_id: row.transaction_id,
//       related_payment_id: row.related_payment_id,
//       related_claim_id: row.related_claim_id,
//       related_commission_id: row.related_commission_id,
//       amount: parseFloat(row.amount),
//       type: row.type,
//       status: row.status,
//       created_at: row.created_at,
//       customer: {
//         name: row.customer_name || 'Unknown Customer'
//       },
//       payment: {
//         method: row.payment_method || 'Unknown',
//         status: row.payment_status
//       }
//     }));
    
//     console.log(`✅ Successfully retrieved ${transactions.length} transactions from database`);
    
//     return res.status(200).json({
//       success: true,
//       scenario: 'has_data',
//       message: 'Transactions retrieved successfully',
//       count: transactions.length,
//       data: transactions
//     });
    
//   } catch (error) {
//     console.error('❌ Database retrieval failed:', error.message);
//     console.error('Full error:', error);
    
//     return res.status(200).json({
//       success: true,
//       scenario: 'mock_data',
//       message: 'Failed to retrieve data from database. Showing mock data.',
//       error: error.message,
//       count: mockTransactions.length,
//       data: mockTransactions
//     });
//   }
// });
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
    
    // In your backend route handler, replace the query with this:
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
    t.payment_method as transaction_payment_method,
    t.notes,
    -- Customer name (for premium payments)
    c.first_name || ' ' || c.last_name as customer_name,
    -- Agent name (for commission payments) - FIXED
    a.first_name || ' ' || a.last_name as agent_name,
    -- Hospital name (for claim payments) - FIXED
    h.name as hospital_name,
    -- Payment method from payment table
    p.method as payment_method_detail,
    p.status as payment_status,
    -- Claim details for hospital payments
    cl.claim_type,
    cl.claim_amount,
    -- Commission details
    comm.amount as commission_amount,
    comm.rate as commission_rate
  FROM transaction t
  LEFT JOIN payment p ON t.related_payment_id = p.payment_id
  LEFT JOIN customer c ON p.customer_id = c.customer_id
  LEFT JOIN commission comm ON t.related_commission_id = comm.commission_id
  LEFT JOIN agent a ON comm.agent_id = a.agent_id  -- Make sure this join exists
  LEFT JOIN claim cl ON t.related_claim_id = cl.claim_id
  LEFT JOIN hospital h ON cl.hospital_id = h.hospital_id  -- Make sure this join exists
  ORDER BY t.created_at DESC
  LIMIT 100
`;
    
    const result = await pool.query(query);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} transactions from database`);
    
    const transactions = result.rows.map(row => {
      // Determine user name based on transaction type
      let userName = 'Unknown';
      const transactionType = (row.type || '').toLowerCase();
      
      if (row.customer_name) {
        userName = row.customer_name;
      } else if (row.agent_name) {
        userName = row.agent_name;
      } else if (row.hospital_name) {
        userName = row.hospital_name;
      }
      
      // Get payment method
      let paymentMethod = row.payment_method_detail || row.transaction_payment_method || 'Unknown';
      
      // Format transaction type for display
      let displayType = row.type || 'Unknown';
      if (displayType === 'premium_payment') displayType = 'Premium Payment';
      if (displayType === 'commission_payment') displayType = 'Commission Payment';
      if (displayType === 'claim_payment') displayType = 'Claim Payment';
      
      return {
        transaction_id: row.transaction_id,
        related_payment_id: row.related_payment_id,
        related_claim_id: row.related_claim_id,
        related_commission_id: row.related_commission_id,
        amount: parseFloat(row.amount),
        type: displayType,
        status: row.status,
        created_at: row.created_at,
        customer: {
          name: row.customer_name
        },
        agent_name: row.agent_name,
        hospital_name: row.hospital_name,
        payment: {
          method: paymentMethod,
          status: row.payment_status
        }
      };
    });
    
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
// // Get transaction statistics
// router.get('/transactions/stats/summary', async (req, res) => {
//   console.log('📊 Stats route hit');
  
//   try {
//     const countQuery = `SELECT COUNT(*) as total FROM transaction`;
//     const countResult = await pool.query(countQuery);
//     const recordCount = parseInt(countResult.rows[0].total, 10);
    
//     if (recordCount === 0) {
//       return res.status(200).json({
//         success: true,
//         scenario: 'no_data',
//         message: 'No transactions found',
//         data: {
//           total_transactions: 0,
//           successful_count: 0,
//           pending_count: 0,
//           failed_count: 0,
//           total_revenue: 0
//         }
//       });
//     }
    
//     const query = `
//       SELECT 
//         COUNT(*) as total_transactions,
//         COUNT(CASE WHEN status = 'Completed' THEN 1 END) as successful_count,
//         COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
//         COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count,
//         COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) as total_revenue
//       FROM transaction
//     `;
    
//     const result = await pool.query(query);
    
//     res.status(200).json({
//       success: true,
//       scenario: 'has_data',
//       data: result.rows[0]
//     });
    
//   } catch (error) {
//     console.error('Stats error:', error);
//     res.status(200).json({
//       success: true,
//       scenario: 'error',
//       message: 'Failed to fetch statistics',
//       data: {
//         total_transactions: 0,
//         successful_count: 0,
//         pending_count: 0,
//         failed_count: 0,
//         total_revenue: 0
//       }
//     });
//   }
// });
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
    
    // ✅ FIXED: Use case-insensitive status check
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN LOWER(status) = 'completed' THEN 1 END) as successful_count,
        COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN LOWER(status) = 'failed' THEN 1 END) as failed_count,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'completed' THEN amount ELSE 0 END), 0) as total_revenue
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

// router.post('/commissions/:commissionId/pay', authenticate, adminMiddleware, async (req, res) => {
//     try {
//         const { commissionId } = req.params;
//         const { amount, agentId } = req.body;
        
//         console.log('💰 Payment request received:', { commissionId, amount, agentId });
        
//         if (!amount || !agentId) {
//             return res.status(400).json({ error: 'Missing required fields: amount and agentId' });
//         }
        
//         const paymentIntent = await stripePaymentService.processCommissionPayment(
//             commissionId,
//             agentId,
//             parseFloat(amount)
//         );
        
//         res.json({
//             success: true,
//             clientSecret: paymentIntent.clientSecret,
//             paymentIntentId: paymentIntent.paymentIntentId
//         });
        
//     } catch (error) {
//         console.error('Payment creation error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });
router.post('/commissions/:commissionId/pay', authenticate, adminMiddleware, async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { amount, agentId, currency } = req.body;  // ← Change paymentMethod to currency
        
        console.log('💰 Payment request received:', { commissionId, amount, agentId, currency });
        
        if (!amount || !agentId) {
            return res.status(400).json({ error: 'Missing required fields: amount and agentId' });
        }
        
        // Use 'usd' as default currency if not provided
        const selectedCurrency = currency || 'usd';
        
        const paymentIntent = await stripePaymentService.processCommissionPayment(
            commissionId,
            agentId,
            parseFloat(amount),
            selectedCurrency  // ← Pass currency (e.g., 'usd')
        );
        
        res.json({
            success: true,
            clientSecret: paymentIntent.clientSecret,
            paymentIntentId: paymentIntent.paymentIntentId,
            currency: selectedCurrency
        });
        
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: error.message });
    }
});
// router.post('/confirm-payment', authenticate, adminMiddleware, async (req, res) => {
//     try {
//         const { paymentIntentId } = req.body;
        
//         if (!paymentIntentId) {
//             return res.status(400).json({ error: 'Missing paymentIntentId' });
//         }
        
//         const result = await stripePaymentService.confirmCommissionPayment(paymentIntentId);
        
//         res.json(result);
        
//     } catch (error) {
//         console.error('Payment confirmation error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

router.post('/confirm-payment', authenticate, adminMiddleware, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { paymentIntentId, paymentMethod, commissionId } = req.body;  // ← ADD paymentMethod and commissionId
        
        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Missing paymentIntentId' });
        }
        
        await client.query('BEGIN');
        
        const result = await stripePaymentService.confirmCommissionPayment(paymentIntentId);
        
        // ✅ UPDATE transaction with payment method
        if (result.success && result.transactionId) {
            const updateQuery = `
                UPDATE transaction 
                SET payment_method = $1,
                    notes = COALESCE(notes, '') || ' | Payment via ' || $1
                WHERE transaction_id = $2
            `;
            await client.query(updateQuery, [paymentMethod || 'stripe', result.transactionId]);
            console.log(`✅ Updated transaction ${result.transactionId} with payment method: ${paymentMethod || 'stripe'}`);
        }
        
        await client.query('COMMIT');
        
        res.json(result);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
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
  SELECT DISTINCT
    p.policy_id,
    p.policy_type,
    p.premium_amount,
    p.start_date,
    p.end_date,
    p.status,
    COALESCE(
      (SELECT plan_name FROM policy_plans WHERE policy_type = p.policy_type AND status = 'active' LIMIT 1),
      p.policy_type
    ) as plan_name
  FROM policy p
  WHERE p.customer_id = $1 AND p.status = 'active'
  ORDER BY p.policy_id
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
// Mark reminder as completed (for admin/agent when payment is made offline)
router.put('/reminders/:reminderId/complete', authenticate, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const agentId = req.user.userId || req.user.id;
        const { paymentReference, notes } = req.body;
        
        // Verify reminder belongs to agent's customer
        const verifyQuery = `
            SELECT r.reminder_id, r.customer_id, r.policy_id, c.email
            FROM payment_reminders r
            JOIN customer c ON r.customer_id = c.customer_id
            WHERE r.reminder_id = $1 AND r.agent_id = $2
        `;
        const verifyResult = await pool.query(verifyQuery, [reminderId, agentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        
        const reminder = verifyResult.rows[0];
        
        // Update reminder status
        await pool.query(
            `UPDATE payment_reminders 
             SET status = 'completed', 
                 updated_at = NOW(),
                 notes = COALESCE(notes, $1)
             WHERE reminder_id = $2`,
            [notes || `Payment completed by agent. Reference: ${paymentReference || 'N/A'}`, reminderId]
        );
        
        // Log completion
        await pool.query(
            `INSERT INTO reminder_logs (
                reminder_id, customer_id, customer_email, notification_type, 
                subject, message, status, sent_at
            ) VALUES ($1, $2, $3, 'payment_completed', 'Payment Completed', $4, 'success', NOW())`,
            [reminderId, reminder.customer_id, reminder.email, `Payment completed for policy #${reminder.policy_id}`]
        );
        
        res.json({
            success: true,
            message: 'Reminder marked as completed'
        });
        
    } catch (error) {
        console.error('Error completing reminder:', error);
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

// // Approve claim with hospital payout account check
// router.put('/agent/claims/:claimId/approve', authenticate, async (req, res) => {
//     const client = await pool.connect();
//     const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//     const companyAccountService = require('../services/companyAccountService');
    
//     try {
//         const { claimId } = req.params;
//         const { approved_amount, coverage_type, notes } = req.body;
//         const agentId = req.user.userId || req.user.id;
        
//         await client.query('BEGIN');
        
//         const claimResult = await client.query(`
//             SELECT c.*, 
//                    p.policy_id, 
//                    p.sum_insured, 
//                    p.remaining_coverage, 
//                    p.used_coverage,
//                    p.used_deductible,
//                    p.deductible_amount as policy_deductible, 
//                    p.co_pay_percentage as policy_copay,
//                    p.policy_type, 
//                    cust.email as customer_email, 
//                    cust.first_name, 
//                    cust.last_name, 
//                    cust.phone,
//                    h.name as hospital_name, 
//                    h.hospital_id, 
//                    h.email as hospital_email
//             FROM claim c
//             JOIN policy p ON c.policy_id = p.policy_id
//             LEFT JOIN customer cust ON c.customer_id = cust.customer_id
//             LEFT JOIN hospital h ON c.hospital_id = h.hospital_id
//             WHERE c.claim_id = $1
//         `, [claimId]);
        
//         if (claimResult.rows.length === 0) {
//             await client.query('ROLLBACK');
//             return res.status(404).json({ success: false, message: 'Claim not found' });
//         }
        
//         const claim = claimResult.rows[0];
//         const isHospitalClaim = claim.hospital_id !== null;
//         const requestedAmount = parseFloat(claim.claim_amount) || 0;
//         let finalApprovedAmount = approved_amount ? parseFloat(approved_amount) : requestedAmount;
        
//         if (isNaN(finalApprovedAmount) || finalApprovedAmount <= 0) {
//             await client.query('ROLLBACK');
//             return res.status(400).json({ success: false, message: 'Invalid approved amount' });
//         }
        
//         // ============================================
//         // CHECK FOR HOSPITAL PAYOUT ACCOUNT
//         // ============================================
//         let hasPayoutAccount = true;
//         let pendingPayment = false;
        
//         if (isHospitalClaim) {
//             const hospitalPayoutResult = await client.query(`
//                 SELECT * FROM hospital_payout_account 
//                 WHERE hospital_id = $1 AND status = 'active'
//                 ORDER BY is_default DESC, created_at DESC
//                 LIMIT 1
//             `, [claim.hospital_id]);
            
//             hasPayoutAccount = hospitalPayoutResult.rows.length > 0;
            
//             if (!hasPayoutAccount) {
//                 console.log(`🏥 Hospital ${claim.hospital_id} has no payout account. Payment will be pending.`);
//                 pendingPayment = true;
                
//                 // Send email notification to hospital about missing payout account
//                 const emailService = require('../services/emailServices');
//                 await emailService.sendHospitalMissingPayoutAccountEmail(
//                     claim.hospital_email,
//                     claim.hospital_name,
//                     claimId,
//                     finalApprovedAmount
//                 );
//                 console.log(`✅ Email sent to hospital ${claim.hospital_email} about missing payout account`);
//             }
//         }
        
//         const remainingCoverage = parseFloat(claim.remaining_coverage) || 0;
//         if (finalApprovedAmount > remainingCoverage) {
//             await client.query('ROLLBACK');
//             return res.status(400).json({ success: false, message: `Insufficient coverage. Remaining: $${remainingCoverage.toFixed(2)}` });
//         }
        
//         // ============================================
//         // ✅ FIXED DEDUCTIBLE LOGIC - Deductible is per policy year, not per claim
//         // ============================================
//         const policyDeductible = parseFloat(claim.policy_deductible) || 0;
//         const usedDeductible = parseFloat(claim.used_deductible) || 0;
//         const coPayPercentage = parseFloat(claim.policy_copay) || 0;
        
//         // Calculate remaining deductible for THIS policy year
//         let remainingDeductible = Math.max(0, policyDeductible - usedDeductible);
//         let deductibleApplied = Math.min(remainingDeductible, finalApprovedAmount);
//         let remainingAfterDeductible = finalApprovedAmount - deductibleApplied;
        
//         let coPayAmount = (remainingAfterDeductible * coPayPercentage) / 100;
//         let insurancePaid = remainingAfterDeductible - coPayAmount;
        
//         deductibleApplied = Math.round(deductibleApplied * 100) / 100;
//         coPayAmount = Math.round(coPayAmount * 100) / 100;
//         insurancePaid = Math.round(insurancePaid * 100) / 100;
//         let clientResponsibility = Math.round((deductibleApplied + coPayAmount) * 100) / 100;
        
//         console.log('💰 Deductible calculation:', {
//             claimAmount: finalApprovedAmount,
//             policyDeductible,
//             usedDeductible,
//             remainingDeductible,
//             deductibleApplied,
//             remainingAfterDeductible,
//             coPayPercentage,
//             coPayAmount,
//             insurancePaid,
//             clientResponsibility
//         });
        
//         const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
//         const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
//         let transferStatus = 'pending';
//         let stripeTransferId = null;
//         let paymentIntentId = null;
//         let paymentStatusForClaim = pendingPayment ? 'pending_account' : 'completed';
//         let claimStatus = pendingPayment ? 'approved' : 'paid';
        
//         // ============================================
//         // DETERMINE THE RECIPIENT (ONLY ONE!)
//         // ============================================
//         let toAccountType = 'customer';
//         let toAccountId = claim.customer_id;
//         let transactionDescription = `Claim payout for claim #${claimId} - Customer: ${claim.first_name} ${claim.last_name}`;
//         let transactionType = 'claim_payout';
        
//         if (isHospitalClaim && !pendingPayment) {
//             toAccountType = 'hospital';
//             toAccountId = claim.hospital_id;
//             transactionDescription = `Claim payout for claim #${claimId} - Hospital: ${claim.hospital_name}`;
//             transactionType = 'hospital_payout';
//         }
        
//         // Only process payment if hospital has payout account (or it's a customer claim) AND insurancePaid > 0
//         if (!pendingPayment && insurancePaid > 0) {
//             try {
//                 if (isHospitalClaim) {
//                     // Hospital claim - record only (no actual Stripe transfer for now)
//                     console.log(`🏥 Processing hospital payout for claim ${claimId}`);
//                     stripeTransferId = `HOSPITAL_PAYOUT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
//                     transferStatus = 'completed';
                    
//                     console.log(`✅ Hospital payout recorded: $${insurancePaid} to hospital ${claim.hospital_id}`);
                    
//                 } else {
//                     // Customer claim - transfer to customer's Stripe account
//                     console.log(`👤 Processing customer payout for claim ${claimId}`);
                    
//                     const paymentIntent = await stripe.paymentIntents.create({
//                         amount: Math.round(insurancePaid * 100),
//                         currency: 'usd',
//                         payment_method_types: ['card'],
//                         description: `Claim payment for claim #${claimId} - ${claim.policy_type}`,
//                         metadata: { claim_id: claimId, customer_id: claim.customer_id, policy_id: claim.policy_id, payment_id: paymentId },
//                         receipt_email: claim.customer_email
//                     });
                    
//                     paymentIntentId = paymentIntent.id;
//                     stripeTransferId = paymentIntentId;
//                     transferStatus = 'completed';
//                 }
                
//                 // Debit company account (ONE TIME)
//                 const debitResult = await companyAccountService.debitCompanyAccount(
//                     insurancePaid, 
//                     isHospitalClaim ? claim.hospital_id : claim.customer_id, 
//                     claimId,
//                     transactionDescription
//                 );
                
//                 console.log(`✅ Company account debited: $${insurancePaid} (Recipient: ${toAccountType})`);
                
//             } catch (stripeError) {
//                 console.error('Payment transfer error:', stripeError);
//                 transferStatus = 'failed';
//                 claimStatus = 'approved';
//                 paymentStatusForClaim = 'failed';
//             }
//         } else if (pendingPayment) {
//             console.log(`⏳ Payment pending for hospital ${claim.hospital_id} - waiting for payout account setup`);
//         } else if (insurancePaid <= 0) {
//             console.log(`⚠️ No payment required. insurancePaid = $${insurancePaid}. This may be due to deductible > claim amount.`);
//             // Still mark as paid/completed even if no money is transferred
//             transferStatus = 'completed';
//             claimStatus = 'paid';
//             paymentStatusForClaim = 'completed';
//         }
        
//         // ============================================
//         // INSERT ONLY ONE LEDGER TRANSACTION
//         // ============================================
//         await client.query(`
//             INSERT INTO ledger_transactions 
//             (transaction_type, amount, from_account_type, from_account_id, to_account_type, to_account_id, 
//              reference_id, description, stripe_transfer_id, status, created_at)
//             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
//         `, [
//             transactionType,
//             insurancePaid,
//             'company',
//             1,
//             toAccountType,
//             toAccountId,
//             paymentId,
//             transactionDescription,
//             stripeTransferId || paymentId,
//             transferStatus === 'completed' ? 'completed' : 'pending'
//         ]);
        
//         console.log(`✅ Ledger entry created: $${insurancePaid} from company to ${toAccountType} ${toAccountId}`);
        
//         // Insert payment record (only if insurancePaid > 0, otherwise insert with 0)
//         await client.query(`
//             INSERT INTO payment (payment_id, policy_id, customer_id, amount, method, status, transaction_ref, paid_at)
//             VALUES ($1, $2, $3, $4, 'stripe', $5, $6, ${pendingPayment ? 'NULL' : (insurancePaid > 0 ? 'NOW()' : 'NOW()')})
//         `, [paymentId, claim.policy_id, claim.customer_id, insurancePaid, transferStatus === 'completed' ? 'completed' : 'pending', transactionId]);
        
//         // Insert transaction record (ONLY ONE)
//         await client.query(`
//             INSERT INTO transaction (transaction_id, related_payment_id, related_claim_id, amount, type, status, created_at, notes, payment_method)
//             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'stripe')
//         `, [
//             transactionId, 
//             paymentId, 
//             claimId, 
//             insurancePaid, 
//             isHospitalClaim ? 'hospital_payout' : 'claim_payout', 
//             transferStatus === 'completed' ? 'completed' : 'pending',
//             pendingPayment ? `Payment pending - Hospital needs to add payout account` : 
//             (insurancePaid <= 0 ? `No payment - Deductible ($${deductibleApplied}) covered the claim amount` : `Payout for claim #${claimId}`)
//         ]);
        
//         // Update claim with all calculated values
//         await client.query(`
//             UPDATE claim 
//             SET status = $1,
//                 approved_amount = $2::DECIMAL,
//                 reviewed_by = $3::INTEGER,
//                 reviewed_at = NOW(),
//                 approval_notes = $4::TEXT,
//                 deductible_applied = $5::DECIMAL,
//                 co_pay_amount = $6::DECIMAL,
//                 insurance_paid = $7::DECIMAL,
//                 client_responsibility = $8::DECIMAL,
//                 coverage_type = $9::VARCHAR,
//                 agent_notes = $10::TEXT,
//                 payment_status = $11::VARCHAR,
//                 payment_transfer_date = CASE WHEN $12 = 'completed' OR $15 = 'completed' THEN NOW() ELSE NULL END,
//                 payment_intent_id = COALESCE($13, $14, NULL),
//                 stripe_transfer_id = COALESCE($14, $13, NULL),
//                 transfer_status = $15::VARCHAR,
//                 updated_at = NOW()
//             WHERE claim_id = $16::INTEGER
//         `, [
//             claimStatus,                    // $1
//             finalApprovedAmount,            // $2
//             agentId,                        // $3
//             notes || null,                  // $4
//             deductibleApplied,              // $5
//             coPayAmount,                    // $6
//             insurancePaid,                  // $7
//             clientResponsibility,           // $8
//             coverage_type || 'full_coverage', // $9
//             notes || null,                  // $10
//             paymentStatusForClaim,          // $11
//             transferStatus,                 // $12 - for payment_transfer_date condition
//             paymentIntentId,                // $13 - Stripe payment intent ID (for customer claims)
//             stripeTransferId,               // $14 - Custom transfer ID (for hospital claims)
//             transferStatus,                 // $15 - for transfer_status column and condition
//             claimId                         // $16
//         ]);
        
//         if (insurancePaid > 0) {
//             await client.query(`UPDATE transaction SET status = $1 WHERE related_payment_id = $2`, 
//                 [transferStatus === 'completed' ? 'completed' : 'pending', paymentId]);
//         }
        
//         // Update policy remaining coverage and track deductible usage
//         const newRemainingCoverage = remainingCoverage - insurancePaid;
//         const newUsedCoverage = (parseFloat(claim.sum_insured) || 0) - newRemainingCoverage;
//         const newUsedDeductible = (parseFloat(claim.used_deductible) || 0) + deductibleApplied;
        
//         await client.query(`
//             UPDATE policy 
//             SET remaining_coverage = $1::DECIMAL, 
//                 used_coverage = $2::DECIMAL,
//                 used_deductible = $3::DECIMAL,
//                 updated_at = NOW() 
//             WHERE policy_id = $4::INTEGER
//         `, [newRemainingCoverage, newUsedCoverage, newUsedDeductible, claim.policy_id]);
        
//         console.log(`✅ Policy updated: remaining_coverage=$${newRemainingCoverage}, used_deductible=$${newUsedDeductible}`);
        
//         // Add audit log entry
//         await client.query(`
//             INSERT INTO claim_audit_log (claim_id, action, old_status, new_status, performed_by, performed_by_type, reason, notes, created_at)
//             VALUES ($1::INTEGER, 'APPROVE_AND_PAY', 'pending', $2, $3::INTEGER, 'agent', $4::TEXT, $5::TEXT, NOW())
//         `, [
//             claimId, 
//             claimStatus, 
//             agentId, 
//             pendingPayment ? `Amount: $${insurancePaid} pending - Hospital needs payout account` : 
//             (insurancePaid <= 0 ? `No payment - Deductible ($${deductibleApplied}) covered the claim amount` : `Amount: $${insurancePaid} transferred`), 
//             notes || null
//         ]);
        
//         await client.query('COMMIT');
        
//         // Send email confirmation if payment was processed
//         if (!pendingPayment && !isHospitalClaim && insurancePaid > 0) {
//             const claimService = require('../services/claimService');
//             await claimService.sendClaimPaymentConfirmationEmail({
//                 claim_id: claimId, 
//                 claim_amount: requestedAmount, 
//                 approved_amount: finalApprovedAmount,
//                 insurance_paid: insurancePaid, 
//                 payment_id: paymentId, 
//                 transaction_id: transactionId,
//                 payment_status: transferStatus, 
//                 stripe_transfer_id: stripeTransferId
//             }, claim.customer_email, `${claim.first_name} ${claim.last_name}`);
//         }
        
//         // Prepare response message
//         let responseMessage;
//         if (pendingPayment) {
//             responseMessage = `Claim approved for $${finalApprovedAmount.toFixed(2)}. Payment is pending - Hospital needs to add payout account. An email notification has been sent to the hospital.`;
//         } else if (insurancePaid <= 0) {
//             responseMessage = `Claim approved for $${finalApprovedAmount.toFixed(2)}. No payment transferred because deductible of $${deductibleApplied.toFixed(2)} covered the claim amount. Patient responsibility: $${clientResponsibility.toFixed(2)}.`;
//         } else {
//             responseMessage = `Claim approved and $${insurancePaid.toFixed(2)} transferred to ${isHospitalClaim ? 'hospital payout account' : 'customer account'}`;
//         }
        
//         res.json({ 
//             success: true, 
//             message: responseMessage,
//             data: { 
//                 claim_id: claimId, 
//                 status: claimStatus,
//                 recipient: isHospitalClaim ? 'hospital' : 'customer',
//                 pendingAccount: pendingPayment,
//                 amountPending: pendingPayment ? finalApprovedAmount : null,
//                 insurancePaid: insurancePaid,
//                 deductibleApplied: deductibleApplied,
//                 patientResponsibility: clientResponsibility
//             }
//         });
        
//     } catch (error) {
//         await client.query('ROLLBACK');
//         console.error('Error approving claim:', error);
//         res.status(500).json({ success: false, message: error.message });
//     } finally {
//         client.release();
//     }
// });
// Approve claim with hospital payout account check
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
            SELECT c.*, 
                   p.policy_id, 
                   p.sum_insured, 
                   p.remaining_coverage, 
                   p.used_coverage,
                   p.policy_type, 
                   cust.email as customer_email, 
                   cust.first_name, 
                   cust.last_name, 
                   cust.phone,
                   h.name as hospital_name, 
                   h.hospital_id, 
                   h.email as hospital_email
            FROM claim c
            JOIN policy p ON c.policy_id = p.policy_id
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN hospital h ON c.hospital_id = h.hospital_id
            WHERE c.claim_id = $1
        `, [claimId]);
        
        if (claimResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }
        
        const claim = claimResult.rows[0];
        const isHospitalClaim = claim.hospital_id !== null;
        const requestedAmount = parseFloat(claim.claim_amount) || 0;
        let finalApprovedAmount = approved_amount ? parseFloat(approved_amount) : requestedAmount;
        
        if (isNaN(finalApprovedAmount) || finalApprovedAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid approved amount' });
        }
        
        // ============================================
        // CHECK FOR HOSPITAL PAYOUT ACCOUNT
        // ============================================
        let hasPayoutAccount = true;
        let pendingPayment = false;
        
        if (isHospitalClaim) {
            const hospitalPayoutResult = await client.query(`
                SELECT * FROM hospital_payout_account 
                WHERE hospital_id = $1 AND status = 'active'
                ORDER BY is_default DESC, created_at DESC
                LIMIT 1
            `, [claim.hospital_id]);
            
            hasPayoutAccount = hospitalPayoutResult.rows.length > 0;
            
            if (!hasPayoutAccount) {
                console.log(`🏥 Hospital ${claim.hospital_id} has no payout account. Payment will be pending.`);
                pendingPayment = true;
                
                const emailService = require('../services/emailServices');
                await emailService.sendHospitalMissingPayoutAccountEmail(
                    claim.hospital_email,
                    claim.hospital_name,
                    claimId,
                    finalApprovedAmount
                );
                console.log(`✅ Email sent to hospital ${claim.hospital_email} about missing payout account`);
            }
        }
        
        const remainingCoverage = parseFloat(claim.remaining_coverage) || 0;
        if (finalApprovedAmount > remainingCoverage) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Insufficient coverage. Remaining: $${remainingCoverage.toFixed(2)}` });
        }
        
        // ============================================
        // ✅ REMOVED DEDUCTIBLE LOGIC - Insurance pays full approved amount
        // ============================================
        let insurancePaid = finalApprovedAmount;
        let deductibleApplied = 0;
        let coPayAmount = 0;
        let clientResponsibility = 0;
        
        console.log('💰 Payment calculation (No Deductible):', {
            claimAmount: finalApprovedAmount,
            insurancePaid: insurancePaid,
            message: 'Full amount paid by insurance'
        });
        
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        let transferStatus = 'pending';
        let stripeTransferId = null;
        let paymentIntentId = null;
        let paymentStatusForClaim = pendingPayment ? 'pending_account' : 'completed';
        let claimStatus = pendingPayment ? 'approved' : 'paid';
        
        // ============================================
        // DETERMINE THE RECIPIENT (ONLY ONE!)
        // ============================================
        let toAccountType = 'customer';
        let toAccountId = claim.customer_id;
        let transactionDescription = `Claim payout for claim #${claimId} - Customer: ${claim.first_name} ${claim.last_name}`;
        let transactionType = 'claim_payout';
        
        if (isHospitalClaim && !pendingPayment) {
            toAccountType = 'hospital';
            toAccountId = claim.hospital_id;
            transactionDescription = `Claim payout for claim #${claimId} - Hospital: ${claim.hospital_name}`;
            transactionType = 'hospital_payout';
        }
        
        // ============================================
        // ✅ CREDIT CUSTOMER BALANCE (For customer claims)
        // ============================================
        let customerBalanceBefore = 0;
        let customerBalanceAfter = 0;
        
        if (!isHospitalClaim && !pendingPayment && insurancePaid > 0) {
            // Get current balance before update
            const balanceResult = await client.query(
                `SELECT balance FROM customer_payment_account WHERE customer_id = $1`,
                [claim.customer_id]
            );
            
            customerBalanceBefore = balanceResult.rows[0]?.balance || 0;
            
            // Credit the customer's account balance
            await client.query(`
                UPDATE customer_payment_account 
                SET balance = balance + $1,
                    total_received = total_received + $1,
                    last_activity_date = NOW(),
                    updated_at = NOW()
                WHERE customer_id = $2
            `, [insurancePaid, claim.customer_id]);
            
            // Get new balance after update
            const newBalanceResult = await client.query(
                `SELECT balance FROM customer_payment_account WHERE customer_id = $1`,
                [claim.customer_id]
            );
            customerBalanceAfter = newBalanceResult.rows[0]?.balance || 0;
            
            console.log(`✅ Customer ${claim.customer_id} balance credited: $${insurancePaid}`);
            console.log(`   Balance before: $${customerBalanceBefore}, After: $${customerBalanceAfter}`);
        }
        
        // Only process payment if hospital has payout account AND insurancePaid > 0
        if (!pendingPayment && insurancePaid > 0) {
            try {
                if (isHospitalClaim) {
                    console.log(`🏥 Processing hospital payout for claim ${claimId}`);
                    stripeTransferId = `HOSPITAL_PAYOUT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                    transferStatus = 'completed';
                    console.log(`✅ Hospital payout recorded: $${insurancePaid} to hospital ${claim.hospital_id}`);
                    
                } else {
                    console.log(`👤 Processing customer payout for claim ${claimId}`);
                    
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
                    } catch (stripeError) {
                        console.log('⚠️ Stripe transfer skipped - using internal balance only');
                        stripeTransferId = `INTERNAL_CREDIT_${Date.now()}_${claimId}`;
                    }
                    transferStatus = 'completed';
                }
                
                // Debit company account
                const debitResult = await companyAccountService.debitCompanyAccount(
                    insurancePaid, 
                    isHospitalClaim ? claim.hospital_id : claim.customer_id, 
                    claimId,
                    transactionDescription
                );
                
                console.log(`✅ Company account debited: $${insurancePaid} (Recipient: ${toAccountType})`);
                
            } catch (stripeError) {
                console.error('Payment transfer error:', stripeError);
                transferStatus = 'failed';
                claimStatus = 'approved';
                paymentStatusForClaim = 'failed';
            }
        } else if (pendingPayment) {
            console.log(`⏳ Payment pending for hospital ${claim.hospital_id} - waiting for payout account setup`);
        }
        
        // ============================================
        // INSERT LEDGER TRANSACTION
        // ============================================
        await client.query(`
            INSERT INTO ledger_transactions 
            (transaction_type, amount, from_account_type, from_account_id, to_account_type, to_account_id, 
             reference_id, description, stripe_transfer_id, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
            transactionType,
            insurancePaid,
            'company',
            1,
            toAccountType,
            toAccountId,
            paymentId,
            transactionDescription,
            stripeTransferId || paymentId,
            transferStatus === 'completed' ? 'completed' : 'pending'
        ]);
        
        console.log(`✅ Ledger entry created: $${insurancePaid} from company to ${toAccountType} ${toAccountId}`);
        
        // Insert payment record
        await client.query(`
            INSERT INTO payment (payment_id, policy_id, customer_id, amount, method, status, transaction_ref, paid_at)
            VALUES ($1, $2, $3, $4, 'stripe', $5, $6, ${pendingPayment ? 'NULL' : (insurancePaid > 0 ? 'NOW()' : 'NOW()')})
        `, [paymentId, claim.policy_id, claim.customer_id, insurancePaid, transferStatus === 'completed' ? 'completed' : 'pending', transactionId]);
        
        // Insert transaction record
        await client.query(`
            INSERT INTO transaction (transaction_id, related_payment_id, related_claim_id, amount, type, status, created_at, notes, payment_method)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'stripe')
        `, [
            transactionId, 
            paymentId, 
            claimId, 
            insurancePaid, 
            isHospitalClaim ? 'hospital_payout' : 'claim_payout', 
            transferStatus === 'completed' ? 'completed' : 'pending',
            pendingPayment ? `Payment pending - Hospital needs to add payout account` : 
            `Payout for claim #${claimId} - Customer balance credited: $${insurancePaid}`
        ]);
        
        // Update claim with all calculated values
        await client.query(`
            UPDATE claim 
            SET status = $1,
                approved_amount = $2::DECIMAL,
                reviewed_by = $3::INTEGER,
                reviewed_at = NOW(),
                approval_notes = $4::TEXT,
                deductible_applied = $5::DECIMAL,
                co_pay_amount = $6::DECIMAL,
                insurance_paid = $7::DECIMAL,
                client_responsibility = $8::DECIMAL,
                coverage_type = $9::VARCHAR,
                agent_notes = $10::TEXT,
                payment_status = $11::VARCHAR,
                payment_transfer_date = CASE WHEN $12 = 'completed' OR $15 = 'completed' THEN NOW() ELSE NULL END,
                payment_intent_id = COALESCE($13, $14, NULL),
                stripe_transfer_id = COALESCE($14, $13, NULL),
                transfer_status = $15::VARCHAR,
                updated_at = NOW()
            WHERE claim_id = $16::INTEGER
        `, [
            claimStatus,                    // $1
            finalApprovedAmount,            // $2
            agentId,                        // $3
            notes || null,                  // $4
            deductibleApplied,              // $5 (0 now)
            coPayAmount,                    // $6 (0 now)
            insurancePaid,                  // $7 (full amount)
            clientResponsibility,           // $8 (0 now)
            coverage_type || 'full_coverage', // $9
            notes || null,                  // $10
            paymentStatusForClaim,          // $11
            transferStatus,                 // $12
            paymentIntentId,                // $13
            stripeTransferId,               // $14
            transferStatus,                 // $15
            claimId                         // $16
        ]);
        
        if (insurancePaid > 0) {
            await client.query(`UPDATE transaction SET status = $1 WHERE related_payment_id = $2`, 
                [transferStatus === 'completed' ? 'completed' : 'pending', paymentId]);
        }
        
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
        
        console.log(`✅ Policy updated: remaining_coverage=$${newRemainingCoverage}, used_coverage=$${newUsedCoverage}`);
        
        // Add audit log entry
let auditReason;
if (pendingPayment) {
    auditReason = `Amount: $${insurancePaid} pending - Hospital needs payout account`;
} else {
    const beforeAmount = parseFloat(customerBalanceBefore || 0).toFixed(2);
    const afterAmount = parseFloat(customerBalanceAfter || 0).toFixed(2);
    auditReason = `Amount: $${insurancePaid} credited to customer balance (Before: $${beforeAmount}, After: $${afterAmount})`;
}

await client.query(`
    INSERT INTO claim_audit_log (claim_id, action, old_status, new_status, performed_by, performed_by_type, reason, notes, created_at)
    VALUES ($1::INTEGER, 'APPROVE_AND_PAY', 'pending', $2, $3::INTEGER, 'agent', $4::TEXT, $5::TEXT, NOW())
`, [
    claimId, 
    claimStatus, 
    agentId, 
    auditReason, 
    notes || null
]);
        
        await client.query('COMMIT');
        
        // Send email confirmation if payment was processed
        if (!pendingPayment && !isHospitalClaim && insurancePaid > 0) {
            const claimService = require('../services/claimService');
            await claimService.sendClaimPaymentConfirmationEmail({
                claim_id: claimId, 
                claim_amount: requestedAmount, 
                approved_amount: finalApprovedAmount,
                insurance_paid: insurancePaid, 
                payment_id: paymentId, 
                transaction_id: transactionId,
                payment_status: transferStatus, 
                stripe_transfer_id: stripeTransferId,
                customer_balance: customerBalanceAfter
            }, claim.customer_email, `${claim.first_name} ${claim.last_name}`);
        }
        
        // Create notification for customer about balance credit
if (!isHospitalClaim && insurancePaid > 0) {
    const { createNotification } = require('../routes/notificationRoutes');
    const balanceAmount = parseFloat(customerBalanceAfter || 0).toFixed(2);
    await createNotification(
        claim.customer_id,
        'customer',
        'claim_payment_credited',
        'Claim Payment Credited! 💰',
        `Your claim #${claimId} for $${insurancePaid.toFixed(2)} has been approved and credited to your account balance. 
         Current balance: $${balanceAmount}. You can withdraw this amount anytime.`,
        claimId
    ).catch(err => console.log('Notification error:', err.message));
}
        
       // Prepare response message
let responseMessage;
if (pendingPayment) {
    responseMessage = `Claim approved for $${finalApprovedAmount.toFixed(2)}. Payment is pending - Hospital needs to add payout account. An email notification has been sent to the hospital.`;
} else if (!isHospitalClaim) {
    const balanceAmount = parseFloat(customerBalanceAfter || 0).toFixed(2);
    responseMessage = `Claim approved and $${insurancePaid.toFixed(2)} has been credited to your account balance. Current balance: $${balanceAmount}.`;
} else {
    responseMessage = `Claim approved and $${insurancePaid.toFixed(2)} transferred to hospital payout account.`;
}
        
        res.json({ 
            success: true, 
            message: responseMessage,
            data: { 
                claim_id: claimId, 
                status: claimStatus,
                recipient: isHospitalClaim ? 'hospital' : 'customer',
                pendingAccount: pendingPayment,
                amountPending: pendingPayment ? finalApprovedAmount : null,
                insurancePaid: insurancePaid,
                customer_balance: !isHospitalClaim ? customerBalanceAfter : null,
                balance_change: !isHospitalClaim ? insurancePaid : null
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
// Add these endpoints to your existing paymentRoutes.js

// Create payment intent for customer purchase
router.post('/create-payment-intent', authenticate, async (req, res) => {
    try {
        const { amount, currency = 'usd', policyId } = req.body;
        const userId = req.user?.userId;
        
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({ success: false, error: 'Valid amount is required' });
        }
        
        // Get customer email for receipt
        const customerResult = await pool.query(
            'SELECT email FROM customer WHERE customer_id = $1',
            [userId]
        );
        const customerEmail = customerResult.rows[0]?.email;
        
        // Get plan name
        let planName = null;
        if (policyId) {
            const planResult = await pool.query(
                'SELECT plan_name FROM policy_plans WHERE plan_id = $1',
                [policyId]
            );
            if (planResult.rows.length > 0) {
                planName = planResult.rows[0].plan_name;
            }
        }
        
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amountNum * 100),
            currency: currency.toLowerCase(),
            metadata: {
                policy_id: policyId?.toString() || 'unknown',
                customer_id: userId?.toString() || 'unknown',
                plan_name: planName || 'Health Insurance'
            },
            description: planName ? `Policy purchase: ${planName}` : 'Health insurance policy purchase',
            receipt_email: customerEmail,
            payment_method_types: ['card']
        });
        
        console.log(`✅ Payment intent created: ${paymentIntent.id}`);
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: amountNum,
            currency: currency
        });
        
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Confirm payment intent (backend notification)
router.post('/confirm-payment-intent', authenticate, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
            return res.status(400).json({ success: false, error: 'Payment intent ID required' });
        }
        
        // For mock payment intents
        if (paymentIntentId.startsWith('pi_mock_')) {
            return res.json({ success: true, status: 'succeeded', mock: true });
        }
        
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        res.json({
            success: paymentIntent.status === 'succeeded',
            status: paymentIntent.status,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100
        });
        
    } catch (error) {
        console.error('Confirm payment intent error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============ CUSTOMER POLICY PAYMENT ROUTES ============

// Create payment intent for customer policy purchase
router.post('/customer/create-payment-intent', authenticate, async (req, res) => {
    try {
        const { policyId, amount } = req.body;
        const customerId = req.user?.userId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        if (!policyId || !amount) {
            return res.status(400).json({ success: false, error: 'Policy ID and amount are required' });
        }
        
        // Verify policy belongs to customer and is in pending status
        const policyCheck = await pool.query(
            `SELECT p.*, pp.plan_name 
             FROM policy p
             JOIN policy_plans pp ON p.plan_id = pp.plan_id
             WHERE p.policy_id = $1 AND p.customer_id = $2 AND p.status = 'pending'`,
            [policyId, customerId]
        );
        
        if (policyCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Policy not found or already activated' 
            });
        }
        
        // Create payment intent
        const result = await stripePaymentService.processCustomerPolicyPayment(
            customerId,
            policyId,
            parseFloat(amount)
        );
        
        res.json({
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            requiresAction: result.requiresAction
        });
        
    } catch (error) {
        console.error('Create customer payment intent error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Confirm payment and credit company account
router.post('/customer/confirm-payment', authenticate, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        const customerId = req.user?.userId;
        
        if (!paymentIntentId) {
            return res.status(400).json({ success: false, error: 'Payment intent ID required' });
        }
        
        // Complete payment and credit company account
        const result = await stripePaymentService.completeCustomerPolicyPayment(paymentIntentId);
        
        // Create notification for customer
        try {
            const { createNotification } = require('../routes/notificationRoutes');
            await createNotification(
                customerId,
                'customer',
                'payment_received',
                'Payment Successful ✅',
                `Your payment of $${result.amount} for policy #${result.policyId} has been received successfully. Your policy has been activated.`,
                result.policyId
            );
        } catch (notifError) {
            console.log('Notification error:', notifError.message);
        }
        
        res.json({
            success: true,
            message: 'Payment confirmed and policy activated',
            data: {
                paymentId: result.paymentId,
                amount: result.amount,
                companyBalance: result.companyBalance
            }
        });
        
    } catch (error) {
        console.error('Confirm customer payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get payment status
router.get('/customer/payment-status/:paymentIntentId', authenticate, async (req, res) => {
    try {
        const { paymentIntentId } = req.params;
        
        const status = await stripePaymentService.getCustomerPaymentStatus(paymentIntentId);
        
        res.json({
            success: true,
            status: status
        });
        
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get customer payment history
router.get('/customer/history', authenticate, async (req, res) => {
    try {
        const customerId = req.user?.userId;
        
        const result = await pool.query(
            `SELECT 
                p.payment_id,
                p.amount,
                p.method,
                p.status as payment_status,
                p.paid_at,
                pol.policy_id,
                pol.policy_type,
                pp.plan_name,
                t.transaction_id,
                t.status as transaction_status,
                t.created_at as transaction_date
             FROM payment p
             JOIN policy pol ON p.policy_id = pol.policy_id
             LEFT JOIN policy_plans pp ON pol.plan_id = pp.plan_id
             LEFT JOIN transaction t ON p.payment_id = t.related_payment_id
             WHERE p.customer_id = $1
             ORDER BY p.paid_at DESC
             LIMIT 50`,
            [customerId]
        );
        
        res.json({
            success: true,
            payments: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get customer's account balance
router.get('/customer/balance', authenticate, async (req, res) => {
    try {
        const customerId = req.user.userId;
        
        const result = await pool.query(
            `SELECT 
                balance,
                total_received,
                total_withdrawn,
                last_activity_date
             FROM customer_payment_account 
             WHERE customer_id = $1`,
            [customerId]
        );
        
        if (result.rows.length === 0) {
            return res.json({ 
                success: true, 
                balance: 0, 
                total_received: 0, 
                total_withdrawn: 0 
            });
        }
        
        res.json({
            success: true,
            balance: parseFloat(result.rows[0].balance),
            total_received: parseFloat(result.rows[0].total_received),
            total_withdrawn: parseFloat(result.rows[0].total_withdrawn),
            last_activity_date: result.rows[0].last_activity_date
        });
        
    } catch (error) {
        console.error('Error fetching customer balance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Request withdrawal from customer balance
router.post('/customer/withdraw', authenticate, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const customerId = req.user.userId;
        const { amount, bankAccountId } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Valid amount required' });
        }
        
        await client.query('BEGIN');
        
        // Check current balance
        const balanceResult = await client.query(
            `SELECT balance FROM customer_payment_account WHERE customer_id = $1`,
            [customerId]
        );
        
        const currentBalance = parseFloat(balanceResult.rows[0]?.balance || 0);
        
        if (amount > currentBalance) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}` 
            });
        }
        
        // Deduct from balance
        await client.query(
            `UPDATE customer_payment_account 
             SET balance = balance - $1,
                 total_withdrawn = total_withdrawn + $1,
                 last_activity_date = NOW(),
                 updated_at = NOW()
             WHERE customer_id = $2`,
            [amount, customerId]
        );
        
        // Create withdrawal transaction record
        const withdrawalId = `WDL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        await client.query(
            `INSERT INTO transaction (
                transaction_id, 
                amount, 
                type, 
                status, 
                created_at,
                notes
            ) VALUES ($1, $2, 'withdrawal', 'pending', NOW(), $3)`,
            [withdrawalId, amount, `Withdrawal request by customer ${customerId}`]
        );
        
        await client.query('COMMIT');
        
        // Create notification for admin to process withdrawal
        const { createNotification } = require('../routes/notificationRoutes');
        await createNotification(
            1, // Admin user ID
            'admin',
            'withdrawal_request',
            'Withdrawal Request',
            `Customer ${customerId} requested withdrawal of $${amount.toFixed(2)}`,
            null
        );
        
        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            withdrawalId: withdrawalId,
            newBalance: currentBalance - amount
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Withdrawal error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});
// ============ CUSTOMER PAYMENT PANEL ROUTES ============
// Get customer's payment history
router.get('/customer/payments', authenticate, async (req, res) => {
    try {
        const customerId = req.user?.userId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const result = await pool.query(
        `SELECT 
            p.payment_id,
            p.policy_id,
            p.amount,
            p.method,
            p.status,
            p.transaction_ref,
            p.paid_at,
            pol.policy_type,
            pol.premium_amount,
            COALESCE(
                (SELECT plan_name FROM policy_plans WHERE plan_id = pol.plan_id AND status = 'active' LIMIT 1),
                pol.policy_type
            ) as plan_name
         FROM payment p
         JOIN policy pol ON p.policy_id = pol.policy_id
         WHERE p.customer_id = $1
         ORDER BY p.paid_at DESC`,
        [customerId]
    );
        
        res.json({
            success: true,
            payments: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching customer payments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// router.get('/customer/reminders', authenticate, async (req, res) => {
//     try {
//         const customerId = req.user?.userId;
        
//         if (!customerId) {
//             return res.status(401).json({ success: false, error: 'Unauthorized' });
//         }
        
//         const result = await pool.query(
//             `SELECT DISTINCT
//                 r.reminder_id,
//                 r.policy_id,
//                 r.reminder_type,
//                 r.reminder_date,
//                 r.reminder_time,
//                 r.frequency,
//                 r.message,
//                 r.status,
//                 r.next_reminder_date,
//                 p.policy_type,
//                 p.premium_amount,
//                 COALESCE(
//                     (SELECT plan_name FROM policy_plans WHERE policy_type = p.policy_type AND status = 'active' LIMIT 1),
//                     p.policy_type
//                 ) as plan_name,
//                 a.first_name as agent_first_name,
//                 a.last_name as agent_last_name
//              FROM payment_reminders r
//              JOIN policy p ON r.policy_id = p.policy_id
//              LEFT JOIN agent a ON r.agent_id = a.agent_id
//              WHERE r.customer_id = $1 
//                AND r.status = 'sent'
//                AND r.reminder_date <= CURRENT_DATE + INTERVAL '30 days'
//              ORDER BY r.reminder_date ASC`,
//             [customerId]
//         );
        
//         console.log(`📊 Found ${result.rows.length} reminders with status 'sent'`);
        
//         res.json({
//             success: true,
//             reminders: result.rows,
//             count: result.rows.length
//         });
        
//     } catch (error) {
//         console.error('Error fetching payment reminders:', error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });
router.get('/customer/reminders', authenticate, async (req, res) => {
    try {
        const customerId = req.user?.userId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const result = await pool.query(
            `SELECT DISTINCT
                r.reminder_id,
                r.policy_id,
                r.reminder_type,
                r.reminder_date,
                r.reminder_time,
                r.frequency,
                r.message,
                r.status,
                r.next_reminder_date,
                p.policy_type,
                p.premium_amount,
                COALESCE(
                    (SELECT plan_name FROM policy_plans WHERE plan_id = p.plan_id AND status = 'active' LIMIT 1),
                    p.policy_type
                ) as plan_name,
                a.first_name as agent_first_name,
                a.last_name as agent_last_name
             FROM payment_reminders r
             JOIN policy p ON r.policy_id = p.policy_id
             LEFT JOIN agent a ON r.agent_id = a.agent_id
             WHERE r.customer_id = $1 
               AND r.status = 'sent'
               AND r.reminder_date <= CURRENT_DATE + INTERVAL '30 days'
             ORDER BY r.reminder_date ASC`,
            [customerId]
        );
        
        console.log(`📊 Found ${result.rows.length} reminders for customer ${customerId}`);
        
        res.json({
            success: true,
            reminders: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching payment reminders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Process premium payment
router.post('/customer/process-payment', authenticate, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const customerId = req.user?.userId;
        const { policyId, amount, paymentMethod, reminderId } = req.body;
        
        if (!customerId || !policyId || !amount) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        await client.query('BEGIN');
        
        // 1. Verify policy belongs to customer and get agent_id
        const policyResult = await client.query(
            `SELECT p.*, pp.plan_name, p.agent_id
             FROM policy p
             JOIN policy_plans pp ON pp.policy_type = p.policy_type
             WHERE p.policy_id = $1 AND p.customer_id = $2 AND p.status = 'active'`,
            [policyId, customerId]
        );
        
        if (policyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Policy not found' });
        }
        
        const policy = policyResult.rows[0];
        const paymentAmount = parseFloat(amount);
        const agentId = policy.agent_id;
        
        // 2. Create payment record
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        await client.query(
            `INSERT INTO payment (
                payment_id, policy_id, customer_id, amount, method, status, 
                transaction_ref, paid_at
            ) VALUES ($1, $2, $3, $4, $5, 'Completed', $6, NOW())`,
            [paymentId, policyId, customerId, paymentAmount, paymentMethod || 'card', transactionId]
        );
        
        // 3. Create transaction record
        await client.query(
            `INSERT INTO transaction (
                transaction_id, related_payment_id, amount, type, status, 
                created_at, payment_method, notes
            ) VALUES ($1, $2, $3, 'premium_payment', 'completed', NOW(), $4, $5)`,
            [transactionId, paymentId, paymentAmount, paymentMethod || 'card', `Premium payment for policy #${policyId}`]
        );
        
        // 4. Credit company account
        const creditResult = await companyAccountService.creditCompanyAccount(
            paymentAmount,
            customerId,
            policyId,
            `Premium payment from customer ${customerId} for policy #${policyId} - ${policy.plan_name}`
        );
        
        if (!creditResult.success) {
            throw new Error('Failed to credit company account');
        }
        
        // 5. Update policy remaining coverage
        await client.query(
            `UPDATE policy 
             SET remaining_coverage = remaining_coverage + $1,
                 updated_at = NOW()
             WHERE policy_id = $2`,
            [paymentAmount, policyId]
        );
        
        // ✅ 6. UPDATE AGENT'S TOTAL SALES (ADD THIS BLOCK)
        if (agentId) {
            await client.query(
                `UPDATE agent 
                 SET total_sales = COALESCE(total_sales, 0) + $1,
                     updated_at = NOW()
                 WHERE agent_id = $2`,
                [paymentAmount, agentId]
            );
            console.log(`✅ Agent ${agentId} total_sales increased by $${paymentAmount} for premium payment on policy ${policyId}`);
        }
        
        // 7. If this payment was from a reminder, mark reminder as 'completed'
        if (reminderId) {
            await client.query(
                `UPDATE payment_reminders 
                 SET status = 'completed', 
                     updated_at = NOW(),
                     notes = COALESCE(notes, 'Payment completed via customer dashboard')
                 WHERE reminder_id = $1`,
                [reminderId]
            );
            
            await client.query(
                `INSERT INTO reminder_logs (
                    reminder_id, customer_id, customer_email, notification_type, 
                    subject, message, status, sent_at
                ) VALUES ($1, $2, (SELECT email FROM customer WHERE customer_id = $2), 
                    'payment_completed', 'Payment Completed', $3, 'success', NOW())`,
                [reminderId, customerId, `Payment of Rs. ${paymentAmount.toLocaleString()} completed for policy #${policyId}`]
            );
        }
        
        await client.query('COMMIT');
        
        // 8. Create notification for customer
        const { createNotification } = require('../routes/notificationRoutes');
        await createNotification(
            customerId,
            'customer',
            'payment_received',
            'Payment Successful ✅',
            `Your payment of Rs. ${paymentAmount.toLocaleString()} for policy "${policy.plan_name}" has been received successfully.`,
            policyId
        ).catch(err => console.log('Notification error:', err.message));
        
        console.log(`✅ Premium payment processed: ${paymentId} for customer ${customerId}`);
        
        res.json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                payment_id: paymentId,
                transaction_id: transactionId,
                amount: paymentAmount,
                company_balance: creditResult.new_balance,
                reminder_completed: !!reminderId
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing premium payment:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});
// Get upcoming payments summary
router.get('/customer/upcoming-summary', authenticate, async (req, res) => {
    try {
        const customerId = req.user?.userId;
        
        if (!customerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        // ✅ FIXED: Use 'sent' instead of 'active'
        const dueResult = await pool.query(
            `SELECT 
                COALESCE(SUM(p.premium_amount), 0) as total_due,
                COUNT(*) as reminders_count
             FROM payment_reminders r
             JOIN policy p ON r.policy_id = p.policy_id
             WHERE r.customer_id = $1 
               AND r.status = 'sent'
               AND r.reminder_date <= CURRENT_DATE + INTERVAL '30 days'`,
            [customerId]
        );
        
        const lastPaymentResult = await pool.query(
            `SELECT paid_at as last_payment_date
             FROM payment 
             WHERE customer_id = $1 
             ORDER BY paid_at DESC 
             LIMIT 1`,
            [customerId]
        );
        
        res.json({
            success: true,
            data: {
                total_due: parseFloat(dueResult.rows[0].total_due) || 0,
                reminders_count: parseInt(dueResult.rows[0].reminders_count) || 0,
                last_payment_date: lastPaymentResult.rows[0]?.last_payment_date || null
            }
        });
        
    } catch (error) {
        console.error('Error fetching upcoming payments summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;