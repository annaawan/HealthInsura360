// backend/routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const bcrypt = require('bcryptjs');  // ← ADD THIS LINE


// Get agent profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const result = await db.query(
      `SELECT agent_id, first_name, last_name, gender, email, phone, 
              license_number, commission_rate, street, city, zipcode, 
              created_at, updated_at, date_of_birth, total_sales, status
       FROM agent 
       WHERE agent_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not found' 
      });
    }

    const agent = result.rows[0];
    
    res.json({
      success: true,
      id: agent.agent_id,
      firstName: agent.first_name,
      lastName: agent.last_name,
      fullName: `${agent.first_name} ${agent.last_name}`,
      gender: agent.gender,
      email: agent.email,
      phone: agent.phone,
      licenseNumber: agent.license_number,
      commissionRate: agent.commission_rate,
      street: agent.street,
      city: agent.city,
      zipcode: agent.zipcode,
      dateOfBirth: agent.date_of_birth,
      totalSales: agent.total_sales || 0,
      status: agent.status,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at
    });

  } catch (error) {
    console.error('Error fetching agent profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Update agent profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { first_name, last_name, phone, street, city, zipcode } = req.body;

    const result = await db.query(
      `UPDATE agent 
       SET first_name = $1, last_name = $2, phone = $3, 
           street = $4, city = $5, zipcode = $6, updated_at = NOW()
       WHERE agent_id = $7
       RETURNING agent_id, first_name, last_name, email, phone, street, city, zipcode`,
      [first_name, last_name, phone, street, city, zipcode, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not found' 
      });
    }

    // Update audit log
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ($1, $2, 'update_profile', 'agent', $3, NOW())`,
      ['agent', req.user.userId, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      agent: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating agent profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// backend/routes/agentRoutes.js
// backend/routes/agentRoutes.js

// backend/routes/agentRoutes.js

// Get agent clients (customers assigned to this agent)
router.get('/clients', authMiddleware, async (req, res) => {
    // DEBUG: Log the entire user object
  console.log('🔍 Full req.user object:', JSON.stringify(req.user, null, 2));
  console.log('🔍 req.user.userId:', req.user.userId);
  console.log('🔍 req.user.userType:', req.user.userType);
  
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    console.log(`📋 Fetching clients for agent ID: ${req.user.userId}`);

    const result = await db.query(
      `SELECT DISTINCT
         c.customer_id,
         c.first_name,
         c.last_name,
         c.email,
         c.phone,
         c.created_at,
         c.status as customer_status,
         p.policy_id,
         p.policy_type,
         p.premium_amount,
         p.status as policy_status,
         p.start_date,
         p.end_date
       FROM customer c
       LEFT JOIN policy p ON c.customer_id = p.customer_id
       WHERE c.agent_id = $1 OR p.agent_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.userId]
    );

    console.log(`✅ Found ${result.rows.length} clients for agent ${req.user.userId}`);

    // Transform data for frontend
    const clients = result.rows.map(client => ({
      client_id: client.customer_id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone || 'N/A',
      plan_name: client.policy_type || 'Pending Policy',
      premium_amount: client.premium_amount || 0,
      status: client.policy_status || client.customer_status || 'Active',
      created_at: client.created_at,
      policy_id: client.policy_id,
      start_date: client.start_date,
      end_date: client.end_date
    }));

    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get client statistics
router.get('/clients/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const result = await db.query(
      `SELECT 
         COUNT(DISTINCT c.customer_id) as total_clients,
         COUNT(DISTINCT CASE WHEN p.status = 'Active' THEN c.customer_id END) as active_policies,
         COUNT(DISTINCT CASE WHEN p.status = 'Pending' THEN c.customer_id END) as pending_policies,
         COALESCE(SUM(p.premium_amount), 0) as total_monthly_premium
       FROM customer c
       LEFT JOIN policy p ON c.customer_id = p.customer_id
       WHERE c.agent_id = $1 OR p.agent_id = $1`,
      [req.user.userId]
    );

    const stats = result.rows[0];
    res.json({
      total_clients: parseInt(stats.total_clients) || 0,
      active_policies: parseInt(stats.active_policies) || 0,
      pending_policies: parseInt(stats.pending_policies) || 0,
      lapsed_policies: 0,
      total_monthly_premium: parseFloat(stats.total_monthly_premium) || 0
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});
// Add to agentRoutes.js
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const result = await db.query(
      `SELECT 
         COUNT(*) as total_customers,
         COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_customers
       FROM customer
       WHERE agent_id = $1`,
      [req.user.userId]
    );

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});
// Update client status (activate/deactivate)
router.put('/clients/:clientId/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { clientId } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive"'
      });
    }

    // Check if client belongs to this agent
    const clientCheck = await db.query(
      'SELECT customer_id, first_name, last_name, email, status FROM customer WHERE customer_id = $1 AND agent_id = $2',
      [clientId, req.user.userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found or not assigned to you'
      });
    }

    const oldStatus = clientCheck.rows[0].status;
    const client = clientCheck.rows[0];

    // Update client status
    await db.query(
      `UPDATE customer 
       SET status = $1, updated_at = NOW()
       WHERE customer_id = $2`,
      [status, clientId]
    );

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('agent', $1, 'update_client_status', 'customer', $2, NOW())`,
      [req.user.userId, clientId]
    );

    // Send email notification to client about status change
    const emailService = require('../services/emailServices');
    
    await emailService.sendClientStatusUpdateEmail({
      to: client.email,
      clientName: `${client.first_name} ${client.last_name}`,
      newStatus: status,
      oldStatus: oldStatus,
      agentName: `${req.user.firstName || 'Your'} ${req.user.lastName || 'Agent'}`
    });

    res.json({
      success: true,
      message: `Client account has been ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      newStatus: status
    });

  } catch (error) {
    console.error('Error updating client status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Add client manually (agent creates customer account)
router.post('/clients', authMiddleware, async (req, res) => {
  console.log('🚀 POST /clients route was called!');

  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const {
      firstName,
      lastName,
      gender,
      email,
      phone,
      dob,
      password,
      street,
      city,
      state,
      zipcode
    } = req.body;

    console.log('📝 Agent adding client - Agent ID:', req.user.userId);
    console.log('Client data:', { firstName, lastName, email });

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // CHECK IF CUSTOMER ALREADY EXISTS - BLOCK CREATION
    const existingCustomer = await db.query(
      'SELECT customer_id, email, agent_id FROM customer WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Customer with email ${email} already exists. Cannot create duplicate account.`,
        customer_exists: true,
        customer_id: existingCustomer.rows[0].customer_id
      });
    }

    // Get agent info for email
    const agentInfo = await db.query(
      'SELECT first_name, last_name, license_number FROM agent WHERE agent_id = $1',
      [req.user.userId]
    );
    const agent = agentInfo.rows[0];

    // Hash the provided password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new customer
    const result = await db.query(
      `INSERT INTO customer (
        first_name, last_name, gender, email, phone, dob,
        password_hash, street, city, state, zipcode,
        agent_id, created_at, updated_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), 'active')
      RETURNING customer_id, first_name, last_name, email, agent_id`,
      [
        firstName,
        lastName,
        gender || 'other',
        email.toLowerCase(),
        phone || null,
        dob || null,
        passwordHash,
        street || null,
        city || null,
        state || null,
        zipcode || null,
        req.user.userId
      ]
    );

    const newCustomer = result.rows[0];

    // Update agent's total_sales
    await db.query(
      `UPDATE agent 
       SET total_sales = COALESCE(total_sales, 0) + 1
       WHERE agent_id = $1`,
      [req.user.userId]
    );

    // ========== SEND WELCOME EMAIL TO CUSTOMER ==========
    const emailService = require('../services/emailServices');
    
    const emailSent = await emailService.sendWelcomeEmail({
      to: newCustomer.email,
      customerName: `${newCustomer.first_name} ${newCustomer.last_name}`,
      password: password,
      agentName: `${agent.first_name} ${agent.last_name}`,
      agentLicense: agent.license_number
    });

    if (emailSent) {
      console.log(`✅ Welcome email sent to ${newCustomer.email}`);
    } else {
      console.log(`⚠️ Failed to send welcome email to ${newCustomer.email}`);
    }

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('agent', $1, 'add_client', 'customer', $2, NOW())`,
      [req.user.userId, newCustomer.customer_id]
    );

    console.log(`✅ New customer ${newCustomer.customer_id} created and assigned to agent ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Client registered successfully! A welcome email has been sent to the customer.',
      customer: newCustomer
    });

  } catch (error) {
    console.error('Error adding client:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});
// Send email to client
router.post('/clients/:clientId/email', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { clientId } = req.params;
    const { subject, message, includePolicyDetails, includePaymentInfo } = req.body;

    // Get client details
    const clientResult = await db.query(
      `SELECT c.*, p.policy_type, p.premium_amount, p.status as policy_status
       FROM customer c
       LEFT JOIN policy p ON c.customer_id = p.customer_id
       WHERE c.customer_id = $1 AND c.agent_id = $2`,
      [clientId, req.user.userId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }

    const client = clientResult.rows[0];
    
    // Get agent details
    const agentResult = await db.query(
      'SELECT first_name, last_name, license_number FROM agent WHERE agent_id = $1',
      [req.user.userId]
    );
    const agent = agentResult.rows[0];

    // Build email content
    let emailContent = message;
    
    if (includePolicyDetails && client.policy_type) {
      emailContent += `\n\n--- Policy Details ---\nPolicy Type: ${client.policy_type}\nPremium: $${client.premium_amount}/month\nStatus: ${client.policy_status}`;
    }
    
    if (includePaymentInfo) {
      emailContent += `\n\n--- Payment Information ---\nFor payment inquiries, please contact us directly.`;
    }
    
    emailContent += `\n\n---\nBest regards,\n${agent.first_name} ${agent.last_name}\nLicense: ${agent.license_number}\nHealthInsura360 Agent`;

    // Send email using your email service
    const emailService = require('../services/emailServices');
    
    const emailSent = await emailService.sendClientEmail({
      to: client.email,
      subject: subject,
      message: emailContent,
      clientName: `${client.first_name} ${client.last_name}`,
      agentName: `${agent.first_name} ${agent.last_name}`
    });

    if (!emailSent.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again.'
      });
    }

    // Log email in audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('agent', $1, 'send_email', 'customer', $2, NOW())`,
      [req.user.userId, clientId]
    );

    res.json({
      success: true,
      message: `Email sent successfully to ${client.email}`
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});
// Get policy details for a specific client
router.get('/clients/:clientId/policies', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      console.log('❌ Access denied - Not an agent');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { clientId } = req.params;
    console.log(`📋 Fetching policies for client ID: ${clientId}, Agent ID: ${req.user.userId}`);

    const result = await db.query(
      `SELECT p.policy_id, p.policy_type, p.sum_insured, p.premium_amount, 
              p.start_date, p.end_date, p.status, p.created_at, p.updated_at,
              COALESCE(c.amount, 0) as total_commission_paid,
              c.status as commission_status
       FROM policy p
       LEFT JOIN commission c ON p.policy_id = c.policy_id
       WHERE p.customer_id = $1 AND p.agent_id = $2
       ORDER BY p.created_at DESC`,
      [clientId, req.user.userId]
    );

    if (result.rows.length === 0) {
      console.log(`📊 No policies found for client ID: ${clientId}`);
    } else {
      console.log(`✅ Found ${result.rows.length} policies for client ID: ${clientId}`);
      result.rows.forEach((policy, index) => {
        console.log(`   Policy ${index + 1}: ID=${policy.policy_id}, Type=${policy.policy_type}, Premium=$${policy.premium_amount}, Status=${policy.status}`);
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching client policies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get claims history for a client
router.get('/clients/:clientId/claims', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      console.log('❌ Access denied - Not an agent');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { clientId } = req.params;
    console.log(`📋 Fetching claims for client ID: ${clientId}, Agent ID: ${req.user.userId}`);

    // Verify client belongs to this agent
    const clientCheck = await db.query(
      'SELECT customer_id, first_name, last_name FROM customer WHERE customer_id = $1 AND agent_id = $2',
      [clientId, req.user.userId]
    );

    if (clientCheck.rows.length === 0) {
      console.log(`❌ Client ${clientId} not found or not assigned to agent ${req.user.userId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found or not assigned to you' 
      });
    }

    console.log(`✅ Client verified: ${clientCheck.rows[0].first_name} ${clientCheck.rows[0].last_name}`);

    // Fetch claims for this client
    const result = await db.query(
      `SELECT 
         c.claim_id,
         c.claim_type,
         c.claim_amount,
         c.approved_amount,
         c.status,
         c.filing_date,
         c.updated_at,
         p.policy_type,
         p.policy_id,
         h.name as hospital_name
       FROM claim c
       LEFT JOIN policy p ON c.policy_id = p.policy_id
       LEFT JOIN hospital h ON c.hospital_id = h.hospital_id
       WHERE c.customer_id = $1
       ORDER BY c.filing_date DESC`,
      [clientId]
    );

    if (result.rows.length === 0) {
      console.log(`📊 No claims found for client ID: ${clientId}`);
    } else {
      console.log(`✅ Found ${result.rows.length} claims for client ID: ${clientId}`);
      result.rows.forEach((claim, index) => {
        console.log(`   Claim ${index + 1}: ID=${claim.claim_id}, Type=${claim.claim_type}, Amount=$${claim.claim_amount}, Status=${claim.status}`);
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching claims:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get payment history for a client
router.get('/clients/:clientId/payments', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      console.log('❌ Access denied - Not an agent');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { clientId } = req.params;
    console.log(`💰 Fetching payment history for client ID: ${clientId}, Agent ID: ${req.user.userId}`);

    // Verify client belongs to this agent
    const clientCheck = await db.query(
      'SELECT customer_id, first_name, last_name FROM customer WHERE customer_id = $1 AND agent_id = $2',
      [clientId, req.user.userId]
    );

    if (clientCheck.rows.length === 0) {
      console.log(`❌ Client ${clientId} not found or not assigned to agent ${req.user.userId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found or not assigned to you' 
      });
    }

    console.log(`✅ Client verified: ${clientCheck.rows[0].first_name} ${clientCheck.rows[0].last_name}`);

    // Fetch payments for this client
    const result = await db.query(
      `SELECT 
         p.payment_id,
         p.amount,
         p.method,
         p.status,
         p.transaction_ref,
         p.paid_at,
         po.policy_type,
         po.policy_id
       FROM payment p
       LEFT JOIN policy po ON p.policy_id = po.policy_id
       WHERE p.customer_id = $1
       ORDER BY p.paid_at DESC`,
      [clientId]
    );

    if (result.rows.length === 0) {
      console.log(`📊 No payment history found for client ID: ${clientId}`);
    } else {
      console.log(`✅ Found ${result.rows.length} payments for client ID: ${clientId}`);
      result.rows.forEach((payment, index) => {
        console.log(`   Payment ${index + 1}: ID=${payment.payment_id}, Amount=$${payment.amount}, Method=${payment.method}, Status=${payment.status}, Date=${payment.paid_at}`);
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});
// Get available customers not assigned to any agent (for claiming)
router.get('/available-customers', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const result = await db.query(
      `SELECT 
         customer_id, first_name, last_name, email, phone, created_at
       FROM customer
       WHERE agent_id IS NULL
       ORDER BY created_at DESC
       LIMIT 50`,
      []
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available customers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});
// Add a new policy for a client
router.post('/clients/:clientId/policies', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { clientId } = req.params;
    const {
      policy_type,
      sum_insured,
      premium_amount,
      start_date,
      end_date,
      payment_method
    } = req.body;

    console.log(`📝 Adding new policy for client ID: ${clientId}, Agent ID: ${req.user.userId}`);
    console.log('Policy data:', { policy_type, sum_insured, premium_amount, start_date, end_date });

    // Verify client belongs to this agent
    const clientCheck = await db.query(
      'SELECT customer_id, first_name, last_name FROM customer WHERE customer_id = $1 AND agent_id = $2',
      [clientId, req.user.userId]
    );

    if (clientCheck.rows.length === 0) {
      console.log(`❌ Client ${clientId} not found or not assigned to agent ${req.user.userId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found or not assigned to you' 
      });
    }

    // Start transaction
    await db.query('BEGIN');

    // Insert new policy
    const result = await db.query(
      `INSERT INTO policy (
        customer_id, agent_id, policy_type, sum_insured, premium_amount,
        start_date, end_date, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', NOW(), NOW())
      RETURNING policy_id, policy_type, sum_insured, premium_amount, start_date, end_date`,
      [clientId, req.user.userId, policy_type, sum_insured, premium_amount, start_date, end_date]
    );

    const newPolicy = result.rows[0];

    // Calculate commission (assuming 30% rate)
    const commissionRate = 30;
    const commissionAmount = (premium_amount * commissionRate) / 100;

    // Create commission record
    await db.query(
      `INSERT INTO commission (
        agent_id, policy_id, amount, rate, premium_amount, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [req.user.userId, newPolicy.policy_id, commissionAmount, commissionRate, premium_amount]
    );

    // Update agent's total_sales
    await db.query(
      `UPDATE agent 
       SET total_sales = COALESCE(total_sales, 0) + 1,
           updated_at = NOW()
       WHERE agent_id = $1`,
      [req.user.userId]
    );

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('agent', $1, 'add_policy', 'policy', $2, NOW())`,
      [req.user.userId, newPolicy.policy_id]
    );

    await db.query('COMMIT');

    console.log(`✅ New policy ${newPolicy.policy_id} added for client ${clientId}`);

    res.status(201).json({
      success: true,
      message: 'Policy added successfully!',
      policy: newPolicy
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Error adding policy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});
// Renew an existing policy
router.post('/policies/:policyId/renew', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { policyId } = req.params;
    const { start_date, end_date, premium_amount } = req.body;

    console.log(`🔄 Renewing policy ID: ${policyId}, Agent ID: ${req.user.userId}`);

    // Check if policy belongs to this agent
    const policyCheck = await db.query(
      `SELECT p.*, c.agent_id FROM policy p
       JOIN customer c ON p.customer_id = c.customer_id
       WHERE p.policy_id = $1 AND c.agent_id = $2`,
      [policyId, req.user.userId]
    );

    if (policyCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Policy not found or not assigned to you' 
      });
    }

    const oldPolicy = policyCheck.rows[0];

    // Update policy with new dates
    const result = await db.query(
      `UPDATE policy 
       SET start_date = $1, end_date = $2, premium_amount = $3, 
           status = 'Active', updated_at = NOW()
       WHERE policy_id = $4
       RETURNING *`,
      [start_date, end_date, premium_amount || oldPolicy.premium_amount, policyId]
    );

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('agent', $1, 'renew_policy', 'policy', $2, NOW())`,
      [req.user.userId, policyId]
    );

    console.log(`✅ Policy ${policyId} renewed successfully`);

    res.json({
      success: true,
      message: 'Policy renewed successfully!',
      policy: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error renewing policy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Upgrade an existing policy
router.post('/policies/:policyId/upgrade', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const { policyId } = req.params;
    const {
      policy_type,
      sum_insured,
      premium_amount,
      start_date,
      end_date
    } = req.body;

    console.log(`📈 Upgrading policy ID: ${policyId}, Agent ID: ${req.user.userId}`);
    console.log('Upgrade data:', { policy_type, sum_insured, premium_amount });

    // Check if policy belongs to this agent
    const policyCheck = await db.query(
      `SELECT p.*, c.agent_id FROM policy p
       JOIN customer c ON p.customer_id = c.customer_id
       WHERE p.policy_id = $1 AND c.agent_id = $2`,
      [policyId, req.user.userId]
    );

    if (policyCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Policy not found or not assigned to you' 
      });
    }

    // Update policy with new details
    const result = await db.query(
      `UPDATE policy 
       SET policy_type = $1, sum_insured = $2, premium_amount = $3,
           start_date = $4, end_date = $5, updated_at = NOW()
       WHERE policy_id = $6
       RETURNING *`,
      [policy_type, sum_insured, premium_amount, start_date, end_date, policyId]
    );

    // Update commission based on new premium
    const commissionRate = 30;
    const commissionAmount = (premium_amount * commissionRate) / 100;
    
    await db.query(
      `UPDATE commission 
       SET amount = $1, rate = $2, premium_amount = $3, updated_at = NOW()
       WHERE policy_id = $4 AND status = 'pending'`,
      [commissionAmount, commissionRate, premium_amount, policyId]
    );

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('agent', $1, 'upgrade_policy', 'policy', $2, NOW())`,
      [req.user.userId, policyId]
    );

    console.log(`✅ Policy ${policyId} upgraded successfully`);

    res.json({
      success: true,
      message: 'Policy upgraded successfully!',
      policy: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error upgrading policy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});
// ==================== COMMISSION TRACKING ROUTES ====================

// Get commission summary for agent
router.get('/commissions/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const agentId = req.user.userId;
    console.log(`📊 Fetching commission summary for agent ID: ${agentId}`);

    const result = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= DATE_TRUNC('month', NOW()) THEN amount ELSE 0 END), 0) as this_month_earned,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        MAX(paid_at) as last_payment_date,
        (SELECT amount FROM commission WHERE agent_id = $1 AND status = 'paid' ORDER BY paid_at DESC LIMIT 1) as last_payment_amount
      FROM commission
      WHERE agent_id = $1`,
      [agentId]
    );

    const summary = result.rows[0];
    
    res.json({
      success: true,
      summary: {
        total_earned: parseFloat(summary.total_earned) || 0,
        pending_commission: parseFloat(summary.total_pending) || 0,
        this_month_earned: parseFloat(summary.this_month_earned) || 0,
        pending_count: parseInt(summary.pending_count) || 0,
        paid_count: parseInt(summary.paid_count) || 0,
        last_payment_date: summary.last_payment_date,
        last_payment_amount: parseFloat(summary.last_payment_amount) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get commission list for agent
router.get('/commissions/list', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const agentId = req.user.userId;
    const { limit = 100, offset = 0 } = req.query;
    
    console.log(`📋 Fetching commission list for agent ID: ${agentId}`);

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
        c.premium_amount,
        p.policy_id,
        p.policy_type,
        p.premium_amount as policy_premium,
        CONCAT(cust.first_name, ' ', cust.last_name) as customer_name
      FROM commission c
      JOIN policy p ON c.policy_id = p.policy_id
      JOIN customer cust ON p.customer_id = cust.customer_id
      WHERE c.agent_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3`,
      [agentId, limit, offset]
    );

    console.log(`✅ Found ${result.rows.length} commission records`);

    const commissions = result.rows.map(comm => ({
      commission_id: comm.commission_id,
      amount: parseFloat(comm.amount),
      rate: parseFloat(comm.rate),
      status: comm.status,
      created_at: comm.created_at,
      paid_at: comm.paid_at,
      payment_reference: comm.payment_reference,
      is_renewal: comm.is_renewal,
      renewal_year: comm.renewal_year,
      premium_amount: parseFloat(comm.policy_premium || comm.premium_amount),
      policy_id: comm.policy_id,
      policy_type: comm.policy_type,
      customer_name: comm.customer_name
    }));

    res.json({
      success: true,
      commissions: commissions,
      count: commissions.length
    });

  } catch (error) {
    console.error('Error fetching commission list:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get upcoming commissions (pending)
router.get('/commissions/upcoming', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const agentId = req.user.userId;
    console.log(`⏰ Fetching upcoming commissions for agent ID: ${agentId}`);

    const result = await db.query(
      `SELECT 
        c.commission_id,
        c.amount,
        c.rate,
        c.created_at,
        c.premium_amount,
        p.policy_id,
        p.policy_type,
        p.premium_amount as policy_premium,
        CONCAT(cust.first_name, ' ', cust.last_name) as customer_name
      FROM commission c
      JOIN policy p ON c.policy_id = p.policy_id
      JOIN customer cust ON p.customer_id = cust.customer_id
      WHERE c.agent_id = $1 AND c.status = 'pending'
      ORDER BY c.created_at ASC`,
      [agentId]
    );

    console.log(`✅ Found ${result.rows.length} upcoming commissions`);

    const upcoming = result.rows.map(comm => ({
      commission_id: comm.commission_id,
      amount: parseFloat(comm.amount),
      rate: parseFloat(comm.rate),
      created_at: comm.created_at,
      premium_amount: parseFloat(comm.policy_premium || comm.premium_amount),
      policy_id: comm.policy_id,
      policy_type: comm.policy_type,
      customer_name: comm.customer_name
    }));

    res.json({
      success: true,
      upcoming: upcoming,
      count: upcoming.length
    });

  } catch (error) {
    console.error('Error fetching upcoming commissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get monthly breakdown
router.get('/commissions/monthly', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const agentId = req.user.userId;
    console.log(`📅 Fetching monthly breakdown for agent ID: ${agentId}`);

    const result = await db.query(
      `SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month_name,
        COUNT(*) as policies_count,
        COALESCE(SUM(amount), 0) as total_commission,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_commission,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commission
      FROM commission
      WHERE agent_id = $1
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12`,
      [agentId]
    );

    console.log(`✅ Found ${result.rows.length} months of data`);

    const monthlyData = result.rows.map(row => ({
      month: row.month,
      month_name: row.month_name,
      policies_count: parseInt(row.policies_count),
      total_commission: parseFloat(row.total_commission),
      paid_commission: parseFloat(row.paid_commission),
      pending_commission: parseFloat(row.pending_commission)
    }));

    res.json({
      success: true,
      monthlyData: monthlyData
    });

  } catch (error) {
    console.error('Error fetching monthly breakdown:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get single commission details
router.get('/commissions/:commissionId', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'agent') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }

    const agentId = req.user.userId;
    const { commissionId } = req.params;

    console.log(`🔍 Fetching commission details for ID: ${commissionId}`);

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
        c.premium_amount,
        c.cancelled_at,
        c.cancel_reason,
        p.policy_id,
        p.policy_type,
        p.premium_amount as policy_premium,
        p.sum_insured,
        p.start_date,
        p.end_date,
        CONCAT(cust.first_name, ' ', cust.last_name) as customer_name,
        cust.email as customer_email,
        cust.phone as customer_phone
      FROM commission c
      JOIN policy p ON c.policy_id = p.policy_id
      JOIN customer cust ON p.customer_id = cust.customer_id
      WHERE c.commission_id = $1 AND c.agent_id = $2`,
      [commissionId, agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commission not found' 
      });
    }

    const commission = result.rows[0];
    
    res.json({
      success: true,
      commission: {
        commission_id: commission.commission_id,
        amount: parseFloat(commission.amount),
        rate: parseFloat(commission.rate),
        status: commission.status,
        created_at: commission.created_at,
        paid_at: commission.paid_at,
        payment_reference: commission.payment_reference,
        is_renewal: commission.is_renewal,
        renewal_year: commission.renewal_year,
        premium_amount: parseFloat(commission.policy_premium || commission.premium_amount),
        cancelled_at: commission.cancelled_at,
        cancel_reason: commission.cancel_reason,
        policy_id: commission.policy_id,
        policy_type: commission.policy_type,
        sum_insured: parseFloat(commission.sum_insured),
        start_date: commission.start_date,
        end_date: commission.end_date,
        customer_name: commission.customer_name,
        customer_email: commission.customer_email,
        customer_phone: commission.customer_phone
      }
    });

  } catch (error) {
    console.error('Error fetching commission details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});
module.exports = router;