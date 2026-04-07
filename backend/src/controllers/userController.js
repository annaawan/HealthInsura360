const db = require('../config/database');
const bcrypt = require('bcrypt');
const auditController = require('./auditController');

// Get all users (from customers, agents, hospitals tables)
exports.getAllUsers = async (req, res) => {
  try {
    console.log('📋 Fetching all users...');
    
    // Query customers
    const customers = await db.query(`
      SELECT 
        customer_id as id,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        phone,
        'customer' as role,
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
      FROM customer 
      ORDER BY created_at DESC
    `);

    // Query agents
    const agents = await db.query(`
      SELECT 
        agent_id as id,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        phone,
        'agent' as role,
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
      FROM agent 
      ORDER BY created_at DESC
    `);

    // Query hospitals
    const hospitals = await db.query(`
      SELECT 
        hospital_id as id,
        name,
        email,
        phone,
        'hospital' as role,
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
      FROM hospital 
      ORDER BY created_at DESC
    `);

    // Combine all users
    const allUsers = [
      ...customers.rows,
      ...agents.rows,
      ...hospitals.rows
    ];

    console.log(`✅ Found ${allUsers.length} total users`);
    res.json({
      success: true,
      users: allUsers,
      count: allUsers.length
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching user with ID: ${id}`);

    // Try to find in customers table first
    let result = await db.query(`
      SELECT 
        customer_id as id,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        phone,
        'customer' as role,
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
      FROM customer 
      WHERE customer_id = $1
    `, [id]);

    if (result.rows.length > 0) {
      console.log('✅ Found user in customers');
      return res.json({
        success: true,
        user: result.rows[0]
      });
    }

    // Try agents table
    result = await db.query(`
      SELECT 
        agent_id as id,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        phone,
        'agent' as role,
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
      FROM agent 
      WHERE agent_id = $1
    `, [id]);

    if (result.rows.length > 0) {
      console.log('✅ Found user in agents');
      return res.json({
        success: true,
        user: result.rows[0]
      });
    }

    // Try hospitals table
    result = await db.query(`
      SELECT 
        hospital_id as id,
        name,
        email,
        phone,
        'hospital' as role,
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
      FROM hospital 
      WHERE hospital_id = $1
    `, [id]);

    if (result.rows.length > 0) {
      console.log('✅ Found user in hospitals');
      return res.json({
        success: true,
        user: result.rows[0]
      });
    }

    console.log('❌ User not found');
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user',
      error: error.message 
    });
  }
};

// Create new user (customer, agent, or hospital)
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, role, status = 'active' } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, role'
      });
    }

    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || 'N/A';

    console.log(`➕ Creating new ${role}...`);

    let result;

    if (role === 'customer') {
      result = await db.query(`
        INSERT INTO customer (first_name, last_name, email, phone, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING customer_id as id, 
                  CONCAT(first_name, ' ', last_name) as name, 
                  email, phone, 'customer' as role, status
      `, [firstName, lastName, email, phone, status]);
    } else if (role === 'agent') {
      result = await db.query(`
        INSERT INTO agent (first_name, last_name, email, phone, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING agent_id as id, 
                  CONCAT(first_name, ' ', last_name) as name, 
                  email, phone, 'agent' as role, status
      `, [firstName, lastName, email, phone, status]);
    } else if (role === 'hospital') {
      result = await db.query(`
        INSERT INTO hospital (name, email, phone, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING hospital_id as id, 
                  name, 
                  email, phone, 'hospital' as role, status
      `, [name, email, phone, status]);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be customer, agent, or hospital'
      });
    }

    console.log(`✅ User created successfully`);
    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create user',
      error: error.message 
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status } = req.body;

    console.log(`✏️ Updating user ${id}...`);

    // Find which table the user is in first
    let result = await db.query(`SELECT customer_id FROM customer WHERE customer_id = $1`, [id]);
    let isCustomer = result.rows.length > 0;

    result = await db.query(`SELECT agent_id FROM agent WHERE agent_id = $1`, [id]);
    let isAgent = result.rows.length > 0;

    result = await db.query(`SELECT hospital_id FROM hospital WHERE hospital_id = $1`, [id]);
    let isHospital = result.rows.length > 0;

    let updateResult;

    if (isCustomer) {
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ') || 'N/A';
      updateResult = await db.query(`
        UPDATE customer 
        SET first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            email = COALESCE($4, email),
            phone = COALESCE($5, phone),
            status = COALESCE($6, status),
            updated_at = NOW()
        WHERE customer_id = $1
        RETURNING customer_id as id, 
                  CONCAT(first_name, ' ', last_name) as name, 
                  email, phone, 'customer' as role, status
      `, [id, firstName, lastName, email, phone, status]);
    } else if (isAgent) {
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ') || 'N/A';
      updateResult = await db.query(`
        UPDATE agent 
        SET first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            email = COALESCE($4, email),
            phone = COALESCE($5, phone),
            status = COALESCE($6, status),
            updated_at = NOW()
        WHERE agent_id = $1
        RETURNING agent_id as id, 
                  CONCAT(first_name, ' ', last_name) as name, 
                  email, phone, 'agent' as role, status
      `, [id, firstName, lastName, email, phone, status]);
    } else if (isHospital) {
      updateResult = await db.query(`
        UPDATE hospital 
        SET name = COALESCE($2, name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE hospital_id = $1
        RETURNING hospital_id as id, 
                  name, 
                  email, phone, 'hospital' as role, status
      `, [id, name, email, phone, status]);
    } else {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User updated successfully');
    res.json({
      success: true,
      message: 'User updated successfully',
      user: updateResult.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update user',
      error: error.message 
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting user ${id}...`);

    // Try deleting from customers
    let result = await db.query(`DELETE FROM customer WHERE customer_id = $1 RETURNING customer_id`, [id]);
    if (result.rows.length > 0) {
      console.log('✅ User deleted from customers');
      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    // Try deleting from agents
    result = await db.query(`DELETE FROM agent WHERE agent_id = $1 RETURNING agent_id`, [id]);
    if (result.rows.length > 0) {
      console.log('✅ User deleted from agents');
      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    // Try deleting from hospitals
    result = await db.query(`DELETE FROM hospital WHERE hospital_id = $1 RETURNING hospital_id`, [id]);
    if (result.rows.length > 0) {
      console.log('✅ User deleted from hospitals');
      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    console.log('❌ User not found');
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete user',
      error: error.message 
    });
  }
};
