// backend/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Allahuakbar786',
  database: process.env.DB_NAME || 'Healthinsura360',
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

// Test route
router.get('/test', (req, res) => {
  console.log('✅ Payment test route hit');
  res.json({ 
    success: true, 
    message: 'Payment routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Get all transactions - handles three scenarios
router.get('/transactions', async (req, res) => {
  console.log('📊 Transactions route hit - fetching from database');
  
  try {
    // Check if transaction table exists and has data
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
    
    // Get count of records
    const countQuery = `SELECT COUNT(*) as total FROM transaction`;
    const countResult = await pool.query(countQuery);
    const recordCount = parseInt(countResult.rows[0].total);
    
    console.log(`📊 Database has ${recordCount} transaction records`);
    
    // Scenario 1: No data in database
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
    
    // Scenario 2: Data exists - fetch it
    console.log('✅ Data exists, fetching from database');
    
    const query = `
      SELECT 
        t.transaction_id,
        t.related_payment_id,
        t.related_claim_id,
        t.relasted_commission_id as related_commission_id,
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
    // Scenario 3: Database retrieval failed - return mock data
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
    // Check if table exists and has data
    const countQuery = `SELECT COUNT(*) as total FROM transaction`;
    const countResult = await pool.query(countQuery);
    const recordCount = parseInt(countResult.rows[0].total);
    
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

module.exports = router;
// // backend/src/routes/paymentRoutes.js

// const express = require('express');
// const router = express.Router();
// const stripePaymentService = require('../services/stripePaymentService');
// const db = require('../config/database');

// // Helper function to convert to CSV
// function convertToCSV(data) {
//   if (!data || data.length === 0) return '';
  
//   const headers = Object.keys(data[0]);
//   const csvRows = [];
  
//   csvRows.push(headers.join(','));
  
//   for (const row of data) {
//     const values = headers.map(header => {
//       const val = row[header];
//       if (val === null || val === undefined) return '';
//       if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
//         return `"${val.replace(/"/g, '""')}"`;
//       }
//       return val;
//     });
//     csvRows.push(values.join(','));
//   }
  
//   return csvRows.join('\n');
// }

// // TEST ROUTE
// router.get('/test', (req, res) => {
//   console.log('✅ Test route hit!');
//   res.json({ 
//     success: true, 
//     message: 'Payment routes are working!',
//     timestamp: new Date().toISOString()
//   });
// });

// // GET all payment transactions (PostgreSQL version)
// router.get('/transactions', async (req, res) => {
//   try {
//     console.log('📊 Fetching transactions from PostgreSQL...');
    
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
//         p.payment_id,
//         p.policy_id,
//         p.customer_id,
//         p.method AS payment_method,
//         p.status AS payment_status,
//         p.transaction_ref,
//         p.paid_at,
//         pa.payment_amount_id,
//         pa.agent_id,
//         pa.hospital_id,
//         pa.card_holder_name,
//         pa.masked_card,
//         pa.card_type,
//         pa.expiry_month,
//         pa.expiry_year,
//         pa.is_default,
//         c.name AS customer_name,
//         c.email AS customer_email,
//         c.phone AS customer_phone,
//         ag.name AS agent_name,
//         ag.email AS agent_email,
//         h.name AS hospital_name,
//         h.email AS hospital_email,
//         pol.policy_number,
//         pol.policy_type
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN payment_amount pa ON t.related_payment_id = pa.payment_amount_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       LEFT JOIN agent ag ON pa.agent_id = ag.agent_id
//       LEFT JOIN hospital h ON pa.hospital_id = h.hospital_id
//       LEFT JOIN policy pol ON p.policy_id = pol.policy_id
//       ORDER BY t.created_at DESC
//       LIMIT 100
//     `;
    
//     const result = await db.query(query);
//     const rows = result.rows;
    
//     if (!rows || rows.length === 0) {
//       console.log('No transactions found');
//       return res.status(200).json({
//         success: true,
//         message: 'No transactions found',
//         count: 0,
//         data: []
//       });
//     }
    
//     console.log(`✅ Found ${rows.length} transactions`);
    
//     // Transform the data for frontend
//     const transactions = rows.map(row => ({
//       transaction_id: row.transaction_id,
//       related_payment_id: row.related_payment_id,
//       related_claim_id: row.related_claim_id,
//       related_commission_id: row.related_commission_id,
//       amount: parseFloat(row.amount),
//       type: row.type,
//       status: row.status,
//       created_at: row.created_at,
//       customer: row.customer_id ? {
//         id: row.customer_id,
//         name: row.customer_name || row.card_holder_name || 'Unknown',
//         email: row.customer_email,
//         phone: row.customer_phone
//       } : null,
//       payment: row.payment_id ? {
//         id: row.payment_id,
//         policy_id: row.policy_id,
//         policy_number: row.policy_number,
//         policy_type: row.policy_type,
//         method: row.payment_method,
//         status: row.payment_status,
//         transaction_ref: row.transaction_ref,
//         paid_at: row.paid_at
//       } : null,
//       payment_details: row.payment_amount_id ? {
//         id: row.payment_amount_id,
//         agent_id: row.agent_id,
//         agent_name: row.agent_name,
//         agent_email: row.agent_email,
//         hospital_id: row.hospital_id,
//         hospital_name: row.hospital_name,
//         hospital_email: row.hospital_email,
//         card_holder_name: row.card_holder_name,
//         masked_card: row.masked_card,
//         card_type: row.card_type,
//         expiry_month: row.expiry_month,
//         expiry_year: row.expiry_year,
//         is_default: row.is_default === 1
//       } : null
//     }));
    
//     res.status(200).json({
//       success: true,
//       count: transactions.length,
//       data: transactions
//     });
    
//   } catch (error) {
//     console.error('Error fetching transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch transactions',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // GET transaction statistics (PostgreSQL version)
// router.get('/transactions/stats/summary', async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         COUNT(*) as total_transactions,
//         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as successful_count,
//         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
//         SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed_count,
//         SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END) as total_revenue,
//         COALESCE(AVG(CASE WHEN status = 'Completed' THEN amount END), 0) as avg_transaction_amount,
//         COALESCE(SUM(CASE WHEN status = 'Completed' AND DATE(created_at) = CURRENT_DATE THEN amount ELSE 0 END), 0) as today_revenue,
//         COALESCE(SUM(CASE WHEN status = 'Completed' AND DATE_PART('week', created_at) = DATE_PART('week', CURRENT_DATE) THEN amount ELSE 0 END), 0) as this_week_revenue,
//         COALESCE(SUM(CASE WHEN status = 'Completed' AND DATE_PART('month', created_at) = DATE_PART('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as this_month_revenue
//       FROM transaction
//     `;
    
//     const result = await db.query(query);
    
//     res.status(200).json({
//       success: true,
//       data: result.rows[0]
//     });
    
//   } catch (error) {
//     console.error('Error fetching statistics:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch statistics'
//     });
//   }
// });

// // GET transactions by date range (PostgreSQL version)
// router.get('/transactions/date-range/:startDate/:endDate', async (req, res) => {
//   try {
//     const { startDate, endDate } = req.params;
    
//     const query = `
//       SELECT 
//         t.transaction_id,
//         t.related_payment_id,
//         t.amount,
//         t.type,
//         t.status,
//         t.created_at,
//         p.method AS payment_method,
//         c.name AS customer_name
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       WHERE DATE(t.created_at) BETWEEN $1 AND $2
//       ORDER BY t.created_at DESC
//     `;
    
//     const result = await db.query(query, [startDate, endDate]);
    
//     res.status(200).json({
//       success: true,
//       count: result.rows.length,
//       data: result.rows
//     });
    
//   } catch (error) {
//     console.error('Error fetching transactions by date:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch transactions by date range'
//     });
//   }
// });

// // UPDATE transaction status (PostgreSQL version)
// router.put('/transactions/:id/status', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;
    
//     const validStatuses = ['Pending', 'Completed', 'Failed', 'Refunded', 'Disputed'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
//       });
//     }
    
//     const query = 'UPDATE transaction SET status = $1 WHERE transaction_id = $2';
//     const result = await db.query(query, [status, id]);
    
//     if (result.rowCount === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }
    
//     res.status(200).json({
//       success: true,
//       message: 'Transaction status updated successfully'
//     });
    
//   } catch (error) {
//     console.error('Error updating transaction status:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update transaction status'
//     });
//   }
// });

// // Export transactions (PostgreSQL version)
// router.get('/transactions/export/:format', async (req, res) => {
//   try {
//     const { format } = req.params;
//     const { startDate, endDate, status, type } = req.query;
    
//     let query = `
//       SELECT 
//         t.transaction_id,
//         t.amount,
//         t.type,
//         t.status,
//         t.created_at,
//         c.name AS customer_name,
//         c.email AS customer_email,
//         p.method AS payment_method,
//         p.transaction_ref
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       WHERE 1=1
//     `;
    
//     const params = [];
//     let paramCounter = 1;
    
//     if (startDate && endDate) {
//       query += ` AND DATE(t.created_at) BETWEEN $${paramCounter} AND $${paramCounter + 1}`;
//       params.push(startDate, endDate);
//       paramCounter += 2;
//     }
    
//     if (status) {
//       query += ` AND t.status = $${paramCounter}`;
//       params.push(status);
//       paramCounter++;
//     }
    
//     if (type) {
//       query += ` AND t.type = $${paramCounter}`;
//       params.push(type);
//       paramCounter++;
//     }
    
//     query += ' ORDER BY t.created_at DESC';
    
//     const result = await db.query(query, params);
    
//     if (format === 'csv') {
//       const csv = convertToCSV(result.rows);
//       res.setHeader('Content-Type', 'text/csv');
//       res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
//       return res.send(csv);
//     } else if (format === 'json') {
//       return res.status(200).json({
//         success: true,
//         count: result.rows.length,
//         data: result.rows
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid export format. Use "csv" or "json"'
//       });
//     }
    
//   } catch (error) {
//     console.error('Error exporting transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to export transactions'
//     });
//   }
// });

// module.exports = router;
// // Helper function to convert to CSV
// function convertToCSV(data) {
//   if (!data || data.length === 0) return '';
  
//   const headers = Object.keys(data[0]);
//   const csvRows = [];
  
//   csvRows.push(headers.join(','));
  
//   for (const row of data) {
//     const values = headers.map(header => {
//       const val = row[header];
//       if (val === null || val === undefined) return '';
//       if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
//         return `"${val.replace(/"/g, '""')}"`;
//       }
//       return val;
//     });
//     csvRows.push(values.join(','));
//   }
  
//   return csvRows.join('\n');
// }

// // Create payment intent for a commission (No auth for now)
// router.post('/commissions/:commissionId/pay', async (req, res) => {
//     try {
//         const { commissionId } = req.params;
//         const { amount, agentId } = req.body;
        
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

// // Confirm payment after frontend processing (No auth for now)
// router.post('/confirm-payment', async (req, res) => {
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

// // Get payment status (No auth for now)
// router.get('/status/:paymentIntentId', async (req, res) => {
//     try {
//         const { paymentIntentId } = req.params;
//         const status = await stripePaymentService.getPaymentStatus(paymentIntentId);
//         res.json(status);
//     } catch (error) {
//         console.error('Status check error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// // GET all payment transactions with complete details (No auth for now)
// router.get('/transactions', async (req, res) => {
//   try {
//     console.log('📊 Fetching transactions from database...');
    
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
//         p.payment_id,
//         p.policy_id,
//         p.customer_id,
//         p.method AS payment_method,
//         p.status AS payment_status,
//         p.transaction_ref,
//         p.paid_at,
//         pa.payment_amount_id,
//         pa.agent_id,
//         pa.hospital_id,
//         pa.card_holder_name,
//         pa.masked_card,
//         pa.card_type,
//         pa.expiry_month,
//         pa.expiry_year,
//         pa.is_default,
//         c.name AS customer_name,
//         c.email AS customer_email,
//         c.phone AS customer_phone,
//         ag.name AS agent_name,
//         ag.email AS agent_email,
//         h.name AS hospital_name,
//         h.email AS hospital_email,
//         pol.policy_number,
//         pol.policy_type
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN payment_amount pa ON t.related_payment_id = pa.payment_amount_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       LEFT JOIN agent ag ON pa.agent_id = ag.agent_id
//       LEFT JOIN hospital h ON pa.hospital_id = h.hospital_id
//       LEFT JOIN policy pol ON p.policy_id = pol.policy_id
//       ORDER BY t.created_at DESC
//       LIMIT 100
//     `;
    
//     const [rows] = await db.execute(query);
    
//     if (!rows || rows.length === 0) {
//       console.log('No transactions found');
//       return res.status(200).json({
//         success: true,
//         message: 'No transactions found',
//         count: 0,
//         data: []
//       });
//     }
    
//     console.log(`✅ Found ${rows.length} transactions`);
    
//     // Transform the data for frontend
//     const transactions = rows.map(row => ({
//       transaction_id: row.transaction_id,
//       related_payment_id: row.related_payment_id,
//       related_claim_id: row.related_claim_id,
//       related_commission_id: row.related_commission_id,
//       amount: parseFloat(row.amount),
//       type: row.type,
//       status: row.status,
//       created_at: row.created_at,
//       customer: row.customer_id ? {
//         id: row.customer_id,
//         name: row.customer_name || row.card_holder_name || 'Unknown',
//         email: row.customer_email,
//         phone: row.customer_phone
//       } : null,
//       payment: row.payment_id ? {
//         id: row.payment_id,
//         policy_id: row.policy_id,
//         policy_number: row.policy_number,
//         policy_type: row.policy_type,
//         method: row.payment_method,
//         status: row.payment_status,
//         transaction_ref: row.transaction_ref,
//         paid_at: row.paid_at
//       } : null,
//       payment_details: row.payment_amount_id ? {
//         id: row.payment_amount_id,
//         agent_id: row.agent_id,
//         agent_name: row.agent_name,
//         agent_email: row.agent_email,
//         hospital_id: row.hospital_id,
//         hospital_name: row.hospital_name,
//         hospital_email: row.hospital_email,
//         card_holder_name: row.card_holder_name,
//         masked_card: row.masked_card,
//         card_type: row.card_type,
//         expiry_month: row.expiry_month,
//         expiry_year: row.expiry_year,
//         is_default: row.is_default === 1
//       } : null
//     }));
    
//     res.status(200).json({
//       success: true,
//       count: transactions.length,
//       data: transactions
//     });
    
//   } catch (error) {
//     console.error('Error fetching transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch transactions',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // GET single transaction by ID (No auth for now)
// router.get('/transactions/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
    
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
//         p.payment_id,
//         p.policy_id,
//         p.customer_id,
//         p.method AS payment_method,
//         p.status AS payment_status,
//         p.transaction_ref,
//         p.paid_at,
//         pa.payment_amount_id,
//         pa.agent_id,
//         pa.hospital_id,
//         pa.card_holder_name,
//         pa.masked_card,
//         pa.card_type,
//         pa.expiry_month,
//         pa.expiry_year,
//         pa.is_default,
//         c.name AS customer_name,
//         c.email AS customer_email,
//         c.phone AS customer_phone,
//         ag.name AS agent_name,
//         ag.email AS agent_email,
//         h.name AS hospital_name,
//         h.email AS hospital_email,
//         pol.policy_number,
//         pol.policy_type
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN payment_amount pa ON t.related_payment_id = pa.payment_amount_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       LEFT JOIN agent ag ON pa.agent_id = ag.agent_id
//       LEFT JOIN hospital h ON pa.hospital_id = h.hospital_id
//       LEFT JOIN policy pol ON p.policy_id = pol.policy_id
//       WHERE t.transaction_id = ?
//     `;
    
//     const [rows] = await db.execute(query, [id]);
    
//     if (!rows || rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }
    
//     const row = rows[0];
//     const transaction = {
//       transaction_id: row.transaction_id,
//       related_payment_id: row.related_payment_id,
//       related_claim_id: row.related_claim_id,
//       related_commission_id: row.related_commission_id,
//       amount: parseFloat(row.amount),
//       type: row.type,
//       status: row.status,
//       created_at: row.created_at,
//       customer: row.customer_id ? {
//         id: row.customer_id,
//         name: row.customer_name || row.card_holder_name || 'Unknown',
//         email: row.customer_email,
//         phone: row.customer_phone
//       } : null,
//       payment: row.payment_id ? {
//         id: row.payment_id,
//         policy_id: row.policy_id,
//         policy_number: row.policy_number,
//         policy_type: row.policy_type,
//         method: row.payment_method,
//         status: row.payment_status,
//         transaction_ref: row.transaction_ref,
//         paid_at: row.paid_at
//       } : null,
//       payment_details: row.payment_amount_id ? {
//         id: row.payment_amount_id,
//         agent_id: row.agent_id,
//         agent_name: row.agent_name,
//         agent_email: row.agent_email,
//         hospital_id: row.hospital_id,
//         hospital_name: row.hospital_name,
//         hospital_email: row.hospital_email,
//         card_holder_name: row.card_holder_name,
//         masked_card: row.masked_card,
//         card_type: row.card_type,
//         expiry_month: row.expiry_month,
//         expiry_year: row.expiry_year,
//         is_default: row.is_default === 1
//       } : null
//     };
    
//     res.status(200).json({
//       success: true,
//       data: transaction
//     });
    
//   } catch (error) {
//     console.error('Error fetching transaction:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch transaction',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // GET transactions by customer ID (No auth for now)
// router.get('/transactions/customer/:customerId', async (req, res) => {
//   try {
//     const { customerId } = req.params;
    
//     const query = `
//       SELECT 
//         t.transaction_id,
//         t.related_payment_id,
//         t.amount,
//         t.type,
//         t.status,
//         t.created_at,
//         p.method AS payment_method,
//         pa.card_holder_name,
//         pa.masked_card,
//         pa.card_type
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN payment_amount pa ON t.related_payment_id = pa.payment_amount_id
//       WHERE p.customer_id = ?
//       ORDER BY t.created_at DESC
//     `;
    
//     const [rows] = await db.execute(query, [customerId]);
    
//     res.status(200).json({
//       success: true,
//       count: rows.length,
//       data: rows
//     });
    
//   } catch (error) {
//     console.error('Error fetching customer transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch customer transactions',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // GET transactions by date range (No auth for now)
// router.get('/transactions/date-range/:startDate/:endDate', async (req, res) => {
//   try {
//     const { startDate, endDate } = req.params;
    
//     const query = `
//       SELECT 
//         t.transaction_id,
//         t.related_payment_id,
//         t.amount,
//         t.type,
//         t.status,
//         t.created_at,
//         p.method AS payment_method,
//         c.name AS customer_name
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       WHERE DATE(t.created_at) BETWEEN ? AND ?
//       ORDER BY t.created_at DESC
//     `;
    
//     const [rows] = await db.execute(query, [startDate, endDate]);
    
//     res.status(200).json({
//       success: true,
//       count: rows.length,
//       data: rows
//     });
    
//   } catch (error) {
//     console.error('Error fetching transactions by date:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch transactions by date range',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // GET transaction statistics (No auth for now)
// router.get('/transactions/stats/summary', async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         COUNT(*) as total_transactions,
//         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as successful_count,
//         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
//         SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed_count,
//         SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END) as total_revenue,
//         AVG(CASE WHEN status = 'Completed' THEN amount ELSE NULL END) as avg_transaction_amount,
//         COALESCE(SUM(CASE WHEN status = 'Completed' AND DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as today_revenue,
//         COALESCE(SUM(CASE WHEN status = 'Completed' AND WEEK(created_at) = WEEK(CURDATE()) THEN amount ELSE 0 END), 0) as this_week_revenue,
//         COALESCE(SUM(CASE WHEN status = 'Completed' AND MONTH(created_at) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) as this_month_revenue
//       FROM transaction
//     `;
    
//     const [rows] = await db.execute(query);
    
//     res.status(200).json({
//       success: true,
//       data: rows[0]
//     });
    
//   } catch (error) {
//     console.error('Error fetching statistics:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch statistics',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // GET transactions grouped by type (No auth for now)
// router.get('/transactions/stats/by-type', async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         type,
//         COUNT(*) as count,
//         SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END) as total_amount,
//         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as successful_count,
//         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
//         SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed_count
//       FROM transaction
//       GROUP BY type
//       ORDER BY total_amount DESC
//     `;
    
//     const [rows] = await db.execute(query);
    
//     res.status(200).json({
//       success: true,
//       data: rows
//     });
    
//   } catch (error) {
//     console.error('Error fetching transactions by type:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch transactions by type',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // UPDATE transaction status (No auth for now)
// router.put('/transactions/:id/status', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;
    
//     // Validate status
//     const validStatuses = ['Pending', 'Completed', 'Failed', 'Refunded', 'Disputed'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
//       });
//     }
    
//     const query = 'UPDATE transaction SET status = ? WHERE transaction_id = ?';
//     const [result] = await db.execute(query, [status, id]);
    
//     if (result.affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }
    
//     res.status(200).json({
//       success: true,
//       message: 'Transaction status updated successfully'
//     });
    
//   } catch (error) {
//     console.error('Error updating transaction status:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update transaction status',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // CREATE new transaction (No auth for now)
// router.post('/transactions', async (req, res) => {
//   try {
//     const {
//       transaction_id,
//       related_payment_id,
//       related_claim_id,
//       related_commission_id,
//       amount,
//       type,
//       status,
//       created_at
//     } = req.body;
    
//     // Validate required fields
//     if (!transaction_id || !amount || !type) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: transaction_id, amount, type'
//       });
//     }
    
//     const query = `
//       INSERT INTO transaction 
//       (transaction_id, related_payment_id, related_claim_id, related_commission_id, amount, type, status, created_at)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;
    
//     const [result] = await db.execute(query, [
//       transaction_id,
//       related_payment_id || null,
//       related_claim_id || null,
//       related_commission_id || null,
//       amount,
//       type,
//       status || 'Pending',
//       created_at || new Date()
//     ]);
    
//     res.status(201).json({
//       success: true,
//       message: 'Transaction created successfully',
//       transaction_id: transaction_id
//     });
    
//   } catch (error) {
//     console.error('Error creating transaction:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create transaction',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // DELETE transaction (No auth for now)
// router.delete('/transactions/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     const query = 'DELETE FROM transaction WHERE transaction_id = ?';
//     const [result] = await db.execute(query, [id]);
    
//     if (result.affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }
    
//     res.status(200).json({
//       success: true,
//       message: 'Transaction deleted successfully'
//     });
    
//   } catch (error) {
//     console.error('Error deleting transaction:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete transaction',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// // Export transactions (No auth for now)
// router.get('/transactions/export/:format', async (req, res) => {
//   try {
//     const { format } = req.params;
//     const { startDate, endDate, status, type } = req.query;
    
//     let query = `
//       SELECT 
//         t.transaction_id,
//         t.amount,
//         t.type,
//         t.status,
//         t.created_at,
//         c.name AS customer_name,
//         c.email AS customer_email,
//         p.method AS payment_method,
//         p.transaction_ref
//       FROM transaction t
//       LEFT JOIN payment p ON t.related_payment_id = p.payment_id
//       LEFT JOIN customer c ON p.customer_id = c.customer_id
//       WHERE 1=1
//     `;
    
//     const params = [];
    
//     if (startDate && endDate) {
//       query += ' AND DATE(t.created_at) BETWEEN ? AND ?';
//       params.push(startDate, endDate);
//     }
    
//     if (status) {
//       query += ' AND t.status = ?';
//       params.push(status);
//     }
    
//     if (type) {
//       query += ' AND t.type = ?';
//       params.push(type);
//     }
    
//     query += ' ORDER BY t.created_at DESC';
    
//     const [rows] = await db.execute(query, params);
    
//     if (format === 'csv') {
//       const csv = convertToCSV(rows);
//       res.setHeader('Content-Type', 'text/csv');
//       res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
//       return res.send(csv);
//     } else if (format === 'json') {
//       return res.status(200).json({
//         success: true,
//         count: rows.length,
//         data: rows
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid export format. Use "csv" or "json"'
//       });
//     }
    
//   } catch (error) {
//     console.error('Error exporting transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to export transactions',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// module.exports = router;
