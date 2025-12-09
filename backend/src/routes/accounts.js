const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const auditController = require('../controllers/auditController');

// Test route within accounts
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Accounts API is working!',
    timestamp: new Date().toISOString()
  });
});

// Apply authentication and admin middleware to all routes except test
router.use((req, res, next) => {
  if (req.path === '/test') {
    return next();
  }
  authMiddleware(req, res, next);
});

router.use((req, res, next) => {
  if (req.path === '/test') {
    return next();
  }
  adminMiddleware(req, res, next);
});

// Get all customers from PostgreSQL
router.get('/customers', async (req, res) => {
  try {
    console.log('📋 Fetching customers from PostgreSQL...');
    const result = await db.query(`
      SELECT 
        customer_id as id,
        CONCAT(first_name, ' ', last_name) as name,
        gender,
        email,
        phone,
        TO_CHAR(dob, 'YYYY-MM-DD') as dob,
        street as address,
        city,
        state,
        zipcode as zip_code,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD') as updated_at,
        status
      FROM customer 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${result.rowCount} customers`);
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch customers',
      error: error.message 
    });
  }
});

// Get all agents from PostgreSQL
router.get('/agents', async (req, res) => {
  try {
    console.log('📋 Fetching agents from PostgreSQL...');
    const result = await db.query(`
      SELECT 
        agent_id as id,
        CONCAT(first_name, ' ', last_name) as name,
        gender,
        email,
        phone,
        license_number,
        commission_rate,
        street as address,
        city,
        state,
        zipcode as zip_code,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD') as updated_at,
        TO_CHAR(date_of_birth, 'YYYY-MM-DD') as dob,
        total_sales,
        status
      FROM agent 
      ORDER BY created_at DESC
    `);
    
    // Format commission rate as percentage
    const formattedAgents = result.rows.map(agent => ({
      ...agent,
      commission_rate: agent.commission_rate ? `${agent.commission_rate}%` : '0%'
    }));
    
    console.log(`✅ Found ${result.rowCount} agents`);
    res.json({
      success: true,
      data: formattedAgents,
      count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error fetching agents:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch agents',
      error: error.message 
    });
  }
});

// Get all hospitals from PostgreSQL
router.get('/hospitals', async (req, res) => {
  try {
    console.log('📋 Fetching hospitals from PostgreSQL...');
    const result = await db.query(`
      SELECT 
        hospital_id as id,
        name,
        email,
        phone,
        registration_number,
        street as address,
        city,
        state,
        zipcode as zip_code,
        TO_CHAR(created_at, 'YYYY-MM-DD') as created_at,
        verified_status,
        TO_CHAR(verified_at, 'YYYY-MM-DD') as verified_at,
        contact_person,
        specialization,
        status,
        TO_CHAR(updated_at, 'YYYY-MM-DD') as updated_at
      FROM hospital 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${result.rowCount} hospitals`);
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error fetching hospitals:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch hospitals',
      error: error.message 
    });
  }
});

// Create new account
router.post('/', async (req, res) => {
  try {
    console.log('➕ Creating new account:', req.body);
    const { type, data } = req.body;
    const adminId = req.user.userId || req.user.id|| 1; // ✅ Define adminId here

    if (!type || !data) {
      return res.status(400).json({ 
        success: false,
        message: 'Type and data are required' 
      });
    }
    
    let result;
    const now = new Date();
    
    switch (type) {
      case 'customers':
        // Split name into first_name and last_name
        const nameParts = data.name ? data.name.split(' ') : ['', ''];
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        
        if (!firstName || !data.email || !data.password_hash) {
          return res.status(400).json({
            success: false,
            message: 'Name, email and password are required'
          });
        }
        
        // Hash the password with bcrypt
        const customerPasswordHash = await bcrypt.hash(data.password_hash, 10);
        
        result = await db.query(`
          INSERT INTO customer (
            first_name, last_name, gender, email, phone, dob, password_hash,
            street, city, state, zipcode, created_at, updated_at, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING customer_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            email, phone, gender,
            TO_CHAR(dob, 'YYYY-MM-DD') as dob,
            street as address,
            city, state, zipcode as zip_code,
            status,
            TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
        `, [
          firstName, lastName, 
          data.gender || null, 
          data.email, 
          data.phone || null, 
          data.dob || null, 
          customerPasswordHash,
          data.address || null, 
          data.city || null, 
          data.state || null, 
          data.zip_code || null,
          now, // created_at
          now, // updated_at
          data.status || 'active'
        ]);
        break;
        
      case 'agents':
        // Split name into first_name and last_name
        const agentNameParts = data.name ? data.name.split(' ') : ['', ''];
        const agentFirstName = agentNameParts[0];
        const agentLastName = agentNameParts.slice(1).join(' ') || '';
        
        if (!agentFirstName || !data.email || !data.password_hash) {
          return res.status(400).json({
            success: false,
            message: 'Name, email and password are required'
          });
        }
        
        // Hash the password with bcrypt
        const agentPasswordHash = await bcrypt.hash(data.password_hash, 10);
        
        result = await db.query(`
          INSERT INTO agent (
            first_name, last_name, gender, email, phone, password_hash, license_number,
            commission_rate, street, city, state, zipcode, created_at, updated_at, 
            date_of_birth, total_sales, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING agent_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            email, phone, gender, license_number,
            commission_rate,
            TO_CHAR(date_of_birth, 'YYYY-MM-DD') as dob,
            street as address,
            city, state, zipcode as zip_code,
            total_sales,
            status,
            TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
        `, [
          agentFirstName, agentLastName,
          data.gender || null,
          data.email,
          data.phone || null,
          agentPasswordHash,
          data.license_number || null,
          data.commission_rate || 0,
          data.address || null,
          data.city || null,
          data.state || null,
          data.zip_code || null,
          now, // created_at
          now, // updated_at
          data.dob || null,
          data.total_sales || 0,
          data.status || 'active'
        ]);
        break;
        
      case 'hospitals':
        if (!data.name || !data.email) {
          return res.status(400).json({
            success: false,
            message: 'Hospital name and email are required'
          });
        }
        
        const hospitalStatus = data.status === 'verified' ? 'verified' : 'pending';
        
        result = await db.query(`
          INSERT INTO hospital (
            name, email, phone, registration_number, street, city, state, zipcode,
            created_at, verified_status, verified_at, contact_person, specialization, 
            status, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING hospital_id as id,
            name, email, phone, registration_number,
            street as address,
            city, state, zipcode as zip_code,
            verified_status,
            TO_CHAR(verified_at, 'YYYY-MM-DD') as verified_at,
            contact_person, specialization,
            status,
            TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
        `, [
          data.name,
          data.email,
          data.phone || null,
          data.registration_number || null,
          data.address || null,
          data.city || null,
          data.state || null,
          data.zip_code || null,
          now, // created_at
          hospitalStatus === 'verified' ? true : false,
          hospitalStatus === 'verified' ? now : null,
          data.contact_person || null,
          data.specialization || null,
          hospitalStatus,
          now  // updated_at
        ]);
        break;
        
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid account type' 
        });
    }
    
    console.log(`✅ Account created with ID: ${result.rows[0].id}`);
    try {
      console.log('📝 Creating audit log for new account...');
      await auditController.createAuditLog(
        'admin',
        adminId,
        `CREATE_${type.toUpperCase()}`,
        type.slice(0, -1), // singular form
        result.rows[0].id, // ✅ Use result.rows[0].id instead of newAccount.id
        {
          account_name: data.name,
          account_email: data.email,
          account_type: type,
          ip_address: req.ip
        }
      );
      console.log('✅ Audit log created successfully');
    } catch (auditError) {
      console.error('⚠️ Audit log failed (but account created):', auditError.message);
      // Don't throw - account creation succeeded
    }
    // Format response based on account type
    let responseData = result.rows[0];
    
    if (type === 'agents' && responseData.commission_rate) {
      responseData.commission_rate = `${responseData.commission_rate}%`;
    }
    
    res.status(201).json({ 
      success: true, 
      message: `${type.slice(0, -1)} created successfully`,
      data: responseData
    });
  
  } catch (error) {
    console.error('❌ Error creating account:', error);
    
    // Handle duplicate email error
    if (error.code === '23505') {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Handle missing column errors
    if (error.code === '42703') {
      return res.status(400).json({ 
        success: false,
        message: 'Database schema mismatch. Please check required fields.',
        error: error.message
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to create account',
      error: error.message 
    });
  }
});

// Update account
router.put('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const data = req.body;
    const adminId = req.user?.userId || req.user?.id || 1; // ✅ Add adminId
    
    console.log(`✏️ Updating ${type} with ID: ${id}`, data);
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid ID is required' 
      });
    }
    
    let result;
    let table;
    let idColumn;
    
    switch (type) {
      case 'customers':
        table = 'customer';
        idColumn = 'customer_id';
        break;
      case 'agents':
        table = 'agent';
        idColumn = 'agent_id';
        break;
      case 'hospitals':
        table = 'hospital';
        idColumn = 'hospital_id';
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid account type' 
        });
    }
    
    // Build dynamic SET clause
    const setClauses = [];
    const values = [];
    let valueIndex = 1;
    
    // Handle name splitting if provided - ONLY for customers and agents
if (data.name && table !== 'hospital') {  // ❌ ADD THIS CHECK
  const nameParts = data.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';
  
  setClauses.push(`first_name = $${valueIndex}`);
  values.push(firstName);
  valueIndex++;
  
  setClauses.push(`last_name = $${valueIndex}`);
  values.push(lastName);
  valueIndex++;
}

// For hospitals, handle name differently
if (data.name && table === 'hospital') {  // ✅ ADD THIS SECTION
  setClauses.push(`name = $${valueIndex}`);
  values.push(data.name);
  valueIndex++;
}
    // Handle password hashing if provided
    if (data.password_hash && data.password_hash.trim() !== '') {
      // SKIP PASSWORD FOR HOSPITALS
      if (table !== 'hospital') {
        try {
          // Hash the password with bcrypt
          const hashedPassword = await bcrypt.hash(data.password_hash, 10);
          setClauses.push(`password_hash = $${valueIndex}`);
          values.push(hashedPassword);
          valueIndex++;
          console.log(`🔐 Password updated and hashed for ${type} ID: ${id}`);
        } catch (hashError) {
          console.error('❌ Error hashing password:', hashError);
          return res.status(500).json({
            success: false,
            message: 'Error processing password',
            error: hashError.message
          });
        }
      } else {
        console.log('⚠️ Skipping password update for hospital (no password column)');
      }
    }
    
    // Handle other fields
    const fieldMappings = {
      email: 'email',
      phone: 'phone',
      gender: 'gender',
      dob: 'dob',
      address: 'street',
      city: 'city',
      state: 'state',
      zip_code: 'zipcode',
      status: 'status',
      license_number: 'license_number',
      commission_rate: 'commission_rate',
      specialization: 'specialization',
      contact_person: 'contact_person',
      registration_number: 'registration_number',
      total_sales: 'total_sales'
    };
    
    Object.keys(data).forEach(key => {
      // Skip name and password_hash (already handled)
      if (key !== 'name' && key !== 'password_hash' && 
          data[key] !== undefined && data[key] !== '' && 
          fieldMappings[key]) {
        const dbColumn = fieldMappings[key];
        
        // Special handling for status field
        if (key === 'status' && table === 'hospital') {
          // For hospitals, also update verified_status and verified_at
          if (data.status === 'verified') {
            setClauses.push(`verified_status = $${valueIndex}`);
            values.push(true);
            valueIndex++;
            
            setClauses.push(`verified_at = $${valueIndex}`);
            values.push(new Date());
            valueIndex++;
          } else if (data.status === 'pending') {
            setClauses.push(`verified_status = $${valueIndex}`);
            values.push(false);
            valueIndex++;
            
            setClauses.push(`verified_at = $${valueIndex}`);
            values.push(null);
            valueIndex++;
          }
        }
        
        setClauses.push(`${dbColumn} = $${valueIndex}`);
        
        // Convert commission_rate to number if needed
        if (key === 'commission_rate' && typeof data[key] === 'string') {
          values.push(parseFloat(data[key]) || 0);
        } 
        // Convert total_sales to number if needed
        else if (key === 'total_sales' && typeof data[key] === 'string') {
          values.push(parseFloat(data[key]) || 0);
        }
        // Handle dob conversion
        else if (key === 'dob' && !data[key]) {
          values.push(null);
        }
        else {
          values.push(data[key]);
        }
        valueIndex++;
      }
    });
    
    if (setClauses.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No data provided for update' 
      });
    }
    
    // Add updated_at timestamp
    setClauses.push(`updated_at = $${valueIndex}`);
    values.push(new Date());
    valueIndex++;
    
    // Add ID to values
    values.push(parseInt(id));
    
    const query = `
      UPDATE ${table} 
      SET ${setClauses.join(', ')}
      WHERE ${idColumn} = $${valueIndex}
      RETURNING ${idColumn} as id
    `;
    
    console.log('📝 Update query:', query);
    console.log('📝 Update values:', values);
    
    result = await db.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Account not found' 
      });
    }
    
    console.log(`✅ Account updated successfully`);
    
    // Fetch the updated account data to return
    const fetchQuery = `SELECT * FROM ${table} WHERE ${idColumn} = $1`;
    const updatedAccount = await db.query(fetchQuery, [parseInt(id)]);
    
    try {
      await auditController.createAuditLog(
        'admin',
        adminId,
        `UPDATE_${type.toUpperCase()}`,
        type.slice(0, -1),
        id,
        {
          account_name: data.name || updatedAccount.rows[0]?.name,
          changes: Object.keys(data),
          ip_address: req.ip
        }
      );
    } catch (auditError) {
      console.error('⚠️ Audit log failed:', auditError.message);
    }

    res.json({ 
      success: true, 
      message: 'Account updated successfully',
      data: updatedAccount.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating account:', error);
    
    // Handle duplicate email error
    if (error.code === '23505') {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Handle foreign key constraint error
    if (error.code === '23503') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot update: Related data exists'
      });
    }
    
    // Handle invalid input syntax
    if (error.code === '22P02') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid data format'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to update account',
      error: error.message 
    });
  }
});

// Delete account
router.delete('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const adminId = req.user?.userId || req.user?.id || 1; // ✅ Add adminId
    
    console.log(`🗑️ Deleting ${type} with ID: ${id}`);
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid ID is required' 
      });
    }
    
    let table;
    let idColumn;
    let nameQuery;
    
    switch (type) {
      case 'customers':
        table = 'customer';
        idColumn = 'customer_id';
        nameQuery = 'CONCAT(first_name, \' \', last_name) as name';
        break;
      case 'agents':
        table = 'agent';
        idColumn = 'agent_id';
        nameQuery = 'CONCAT(first_name, \' \', last_name) as name';
        break;
      case 'hospitals':
        table = 'hospital';
        idColumn = 'hospital_id';
        nameQuery = 'name';
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid account type' 
        });
    }
    
    // ✅ FIRST: Get account details BEFORE deletion for audit log
    const accountResult = await db.query(
      `SELECT ${idColumn} as id, ${nameQuery}, email FROM ${table} WHERE ${idColumn} = $1`,
      [parseInt(id)]
    );
    
    if (accountResult.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Account not found' 
      });
    }
    
    const account = accountResult.rows[0];

    const result = await db.query(
      `DELETE FROM ${table} WHERE ${idColumn} = $1 RETURNING ${idColumn} as id, ${nameQuery}, email`,
      [parseInt(id)]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Account not found' 
      });
    }
    
    console.log(`✅ Account deleted successfully`);

    try {
      await auditController.createAuditLog(
        'admin',
        adminId,
        `DELETE_${type.toUpperCase()}`,
        type.slice(0, -1),
        id,
        {
          account_name: account.name,
          account_email: account.email,
          ip_address: req.ip
        }
      );
    } catch (auditError) {
      console.error('⚠️ Audit log failed:', auditError.message);
    }
 
    res.json({ 
      success: true, 
      message: 'Account deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deleting account:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete account',
      error: error.message 
    });
  }
});

// Get single account by ID
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid ID is required' 
      });
    }
    
    let table;
    let idColumn;
    let query;
    
    switch (type) {
      case 'customers':
        table = 'customer';
        idColumn = 'customer_id';
        query = `
          SELECT 
            customer_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            gender,
            email,
            phone,
            TO_CHAR(dob, 'YYYY-MM-DD') as dob,
            street as address,
            city,
            state,
            zipcode as zip_code,
            TO_CHAR(created_at, 'YYYY-MM-DD') as created_at,
            TO_CHAR(updated_at, 'YYYY-MM-DD') as updated_at,
            status
          FROM ${table} 
          WHERE ${idColumn} = $1
        `;
        break;
      case 'agents':
        table = 'agent';
        idColumn = 'agent_id';
        query = `
          SELECT 
            agent_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            gender,
            email,
            phone,
            license_number,
            commission_rate,
            street as address,
            city,
            state,
            zipcode as zip_code,
            TO_CHAR(created_at, 'YYYY-MM-DD') as created_at,
            TO_CHAR(updated_at, 'YYYY-MM-DD') as updated_at,
            TO_CHAR(dob, 'YYYY-MM-DD') as dob,
            total_sales,
            status
          FROM ${table} 
          WHERE ${idColumn} = $1
        `;
        break;
      case 'hospitals':
        table = 'hospital';
        idColumn = 'hospital_id';
        query = `
          SELECT 
            hospital_id as id,
            name,
            email,
            phone,
            street as address,
            city,
            state,
            zipcode as zip_code,
            TO_CHAR(created_at, 'YYYY-MM-DD') as created_at,
            verified_status,
            TO_CHAR(verified_at, 'YYYY-MM-DD') as verified_at,
            contact_person,
            specialization,
            status,
            TO_CHAR(updated_at, 'YYYY-MM-DD') as updated_at
          FROM ${table} 
          WHERE ${idColumn} = $1
        `;
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid account type' 
        });
    }
    
    const result = await db.query(query, [parseInt(id)]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Account not found' 
      });
    }
    
    // Format commission rate for agents
    let data = result.rows[0];
    if (type === 'agents' && data.commission_rate) {
      data.commission_rate = `${data.commission_rate}%`;
    }
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('❌ Error fetching account:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch account',
      error: error.message 
    });
  }
});

module.exports = router;