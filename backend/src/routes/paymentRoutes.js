const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

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

// Stripe payment endpoints
router.post('/create-payment-intent', authenticate, paymentController.createPaymentIntent);
router.post('/confirm-payment', authenticate, paymentController.confirmPayment);

module.exports = router;
