// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Helper function to generate random registration number
const generateRegistrationNumber = () => {
  const prefix = 'HOSP';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${timestamp}${random}`;
};

// Customer Registration
exports.registerCustomer = async (req, res) => {
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

  try {
    // Validate required fields
    if (!firstName || !lastName || !email || !password || !gender || !dob) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // Check if email exists in any user table
    const existingUser = await db.query(
      'SELECT email FROM customer WHERE email = $1 UNION SELECT email FROM agent WHERE email = $1 UNION SELECT email FROM admin WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    console.log('Registration - Original password:', password);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('Registration - Hashed password:', passwordHash);

    // Start transaction
    await db.query('BEGIN');

    // Insert into customer table WITH CREATED_AT AND UPDATED_AT
    const result = await db.query(
      `INSERT INTO customer (
        first_name, last_name, gender, email, phone, dob, 
        password_hash, street, city, state, zipcode,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING customer_id, first_name, last_name, email, created_at, updated_at`,
      [
        firstName,
        lastName,
        gender,
        email.toLowerCase(),
        phone || null,
        dob,
        passwordHash,
        street || null,
        city || null,
        state || null,
        zipcode || null
      ]
    );

    const customerId = result.rows[0].customer_id;

    // Create JWT token
    const token = jwt.sign(
      {
        userId: customerId,
        email: result.rows[0].email,
        userType: 'customer'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log audit with TIMESTAMP column
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('customer', $1, 'register', 'customer', $1, NOW())`,
      [customerId]
    );

    await db.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      token,
      user: {
        id: customerId,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        email: result.rows[0].email,
        userType: 'customer',
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Customer registration error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Agent Registration
exports.registerAgent = async (req, res) => {
  const {
    firstName,
    lastName,
    gender,
    email,
    phone,
    password,
    street,
    city,
    state,
    zipcode,
    dob
  } = req.body;

  try {
    // DEBUG: Log what backend receives
    console.log('=== BACKEND RECEIVED ===');
    console.log('firstName:', firstName, 'exists:', !!firstName);
    console.log('lastName:', lastName, 'exists:', !!lastName);
    console.log('gender:', gender, 'exists:', !!gender);
    console.log('email:', email, 'exists:', !!email);
    console.log('phone:', phone, 'exists:', !!phone);
    console.log('password:', '[HIDDEN]', 'exists:', !!password);
    console.log('street:', street, 'exists:', !!street);
    console.log('city:', city, 'exists:', !!city);
    console.log('state:', state, 'exists:', !!state);
    console.log('zipcode:', zipcode, 'exists:', !!zipcode);
    console.log('dob:', dob, 'exists:', !!dob);
    console.log('========================');

    // Validate ONLY essential fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields: First Name, Last Name, Email, and Password'
      });
    }

    // Check if email exists
    const existingEmail = await db.query(
      'SELECT email FROM customer WHERE email = $1 UNION SELECT email FROM agent WHERE email = $1 UNION SELECT email FROM admin WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate random license number (format: AGENT-XXXXXXX)
    const generateLicenseNumber = () => {
      const prefix = 'AGENT-';
      const randomPart = Math.random().toString(36).substr(2, 8).toUpperCase();
      return prefix + randomPart;
    };

    const licenseNumber = generateLicenseNumber();
    console.log('Generated license number:', licenseNumber);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Start transaction
    await db.query('BEGIN');

    // Insert into agent table with generated license number and null commission rate
    const result = await db.query(
      `INSERT INTO agent (
        first_name, last_name, gender, email, phone, password_hash,
        license_number, commission_rate, street, city, state, zipcode,
        date_of_birth, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING agent_id, first_name, last_name, email, license_number, 
                 date_of_birth, created_at, updated_at`,
      [
        firstName,
        lastName,
        gender || 'other',
        email.toLowerCase(),
        phone || null,
        passwordHash,
        licenseNumber, // Generated license number
        null, // Commission rate is null (will be set by admin)
        street || null,
        city || null,
        state || null,
        zipcode || null,
        dob || null
      ]
    );

    const agentId = result.rows[0].agent_id;

    // Create JWT token
    const token = jwt.sign(
      {
        userId: agentId,
        email: result.rows[0].email,
        userType: 'agent'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log audit WITH TIMESTAMP
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('agent', $1, 'register', 'agent', $1, NOW())`,
      [agentId]
    );

    await db.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully. License number has been assigned.',
      token,
      user: {
        id: agentId,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        email: result.rows[0].email,
        licenseNumber: result.rows[0].license_number,
        dateOfBirth: result.rows[0].date_of_birth,
        userType: 'agent',
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Agent registration error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      if (error.constraint && error.constraint.includes('license_number')) {
        // If license number conflict, retry with different number
        console.log('License number conflict, retrying registration...');
        return res.status(400).json({
          success: false,
          message: 'Registration failed due to license number conflict. Please try again.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Hospital Registration
exports.registerHospital = async (req, res) => {
  const {
    name,
    email,
    phone,
    street,
    city,
    state,
    zipcode
  } = req.body;

  try {
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Hospital name and email are required'
      });
    }

    // Check if email exists
    const existingEmail = await db.query(
      'SELECT email FROM hospital WHERE email = $1 UNION SELECT email FROM customer WHERE email = $1 UNION SELECT email FROM agent WHERE email = $1 UNION SELECT email FROM admin WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate unique registration number
    let registrationNumber;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    // Keep generating until we get a unique registration number
    while (!isUnique && attempts < maxAttempts) {
      registrationNumber = generateRegistrationNumber();
      const existingReg = await db.query(
        'SELECT registration_number FROM hospital WHERE registration_number = $1',
        [registrationNumber]
      );
      
      if (existingReg.rows.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Could not generate unique registration number'
      });
    }

    // Start transaction
    await db.query('BEGIN');

    // Insert into hospital table WITH CREATED_AT AND UPDATED_AT
    const result = await db.query(
      `INSERT INTO hospital (
        name, email, phone, registration_number,
        street, city, state, zipcode,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING hospital_id, name, email, registration_number, created_at, updated_at`,
      [
        name,
        email.toLowerCase(),
        phone || null,
        registrationNumber,
        street || null,
        city || null,
        state || null,
        zipcode || null
      ]
    );

    const hospitalId = result.rows[0].hospital_id;

    // Log audit WITH TIMESTAMP
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('hospital', $1, 'register', 'hospital', $1, NOW())`,
      [hospitalId]
    );

    await db.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Hospital registration submitted successfully. Admin will verify and provide credentials.',
      hospital: {
        id: hospitalId,
        name: result.rows[0].name,
        email: result.rows[0].email,
        registrationNumber: result.rows[0].registration_number,
        status: 'pending_verification',
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Hospital registration error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Registration number or email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during hospital registration'
    });
  }
};

// Admin Registration (for creating admin accounts internally)
exports.registerAdmin = async (req, res) => {
  const {
    fullName,
    email,
    password,
    role = 'staff'
  } = req.body;

  try {
    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // Check if email exists
    const existingEmail = await db.query(
      'SELECT email FROM admin WHERE email = $1 UNION SELECT email FROM customer WHERE email = $1 UNION SELECT email FROM agent WHERE email = $1 UNION SELECT email FROM hospital WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Start transaction
    await db.query('BEGIN');

    // Insert into admin table WITH CREATED_AT AND UPDATED_AT
    const result = await db.query(
      `INSERT INTO admin (
        full_name, email, password_hash, role,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING admin_id, full_name, email, role, created_at, updated_at`,
      [
        fullName,
        email.toLowerCase(),
        passwordHash,
        role
      ]
    );

    const adminId = result.rows[0].admin_id;

    // Create JWT token
    const token = jwt.sign(
      {
        userId: adminId,
        email: result.rows[0].email,
        userType: 'admin',
        role: result.rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log audit WITH TIMESTAMP
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('admin', $1, 'register', 'admin', $1, NOW())`,
      [adminId]
    );

    await db.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      user: {
        id: adminId,
        fullName: result.rows[0].full_name,
        email: result.rows[0].email,
        role: result.rows[0].role,
        userType: 'admin',
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Admin registration error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during admin registration'
    });
  }
};

// Login for Customers, Agents, and Admins
exports.login = async (req, res) => {
  const { email, password, userType } = req.body;

  try {
    // ADD THESE DEBUG LOGS:
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('User Type:', userType);
    console.log('Password provided:', password ? '[PROVIDED]' : '[MISSING]');
    // Validate inputs
    if (!email || !password || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and user type'
      });
    }

    let tableName, idField;

    // Determine which table to query based on userType
    switch (userType) {
      case 'customer':
        tableName = 'customer';
        idField = 'customer_id';
        break;
      case 'agent':
        tableName = 'agent';
        idField = 'agent_id';
        break;
      case 'admin':
        tableName = 'admin';
        idField = 'admin_id';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }

    // Find user
    const result = await db.query(
      `SELECT * FROM ${tableName} WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const dbUser = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, dbUser.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Prepare user data for token
    const tokenData = {
      userId: dbUser[idField],
      email: dbUser.email,
      userType: userType
    };

    // Add role for admin
    if (userType === 'admin') {
      tokenData.role = dbUser.role;
    }

    // Create JWT token
    const token = jwt.sign(
      tokenData,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare user data for response
    const userData = {
      id: dbUser[idField],
      email: dbUser.email,
      userType: userType
    };

    // Add user-specific fields
    if (userType === 'customer' || userType === 'agent') {
      userData.firstName = dbUser.first_name;
      userData.lastName = dbUser.last_name;
      userData.fullName = `${dbUser.first_name} ${dbUser.last_name}`;
      
      if (userType === 'agent') {
        userData.licenseNumber = dbUser.license_number;
      }
    } else if (userType === 'admin') {
      userData.fullName = dbUser.full_name;
      userData.role = dbUser.role;
    }

    // Log audit with timestamp column
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ($1, $2, 'login', $1, $2, NOW())`,
      [userType, dbUser[idField]]
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// SEPARATE HOSPITAL LOGIN (no password, uses registration number)
exports.loginHospital = async (req, res) => {
  const { email, registrationNumber } = req.body;

  try {
    // Validate inputs
    if (!email || !registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and registration number'
      });
    }

    console.log('Hospital login attempt for:', email, 'Registration:', registrationNumber);

    // Check if hospital exists with matching email AND registration number
    const result = await db.query(
      `SELECT hospital_id, name, email, registration_number, verified_status 
       FROM hospital 
       WHERE email = $1 AND registration_number = $2`,
      [email.toLowerCase(), registrationNumber]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or registration number'
      });
    }

    const hospital = result.rows[0];

    // Check if hospital is verified
    if (!hospital.verified_status) {
      return res.status(403).json({
        success: false,
        message: 'Hospital account is not verified yet. Please contact admin.'
      });
    }

    // Prepare token data
    const tokenData = {
      userId: hospital.hospital_id,
      email: hospital.email,
      userType: 'hospital',
      hospitalName: hospital.name
    };

    // Create JWT token
    const token = jwt.sign(
      tokenData,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare user data for response
    const userData = {
      id: hospital.hospital_id,
      name: hospital.name,
      email: hospital.email,
      registrationNumber: hospital.registration_number,
      verifiedStatus: hospital.verified_status,
      userType: 'hospital'
    };

    // Log audit with timestamp column
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ('hospital', $1, 'login', 'hospital', $1, NOW())`,
      [hospital.hospital_id]
    );

    res.json({
      success: true,
      message: 'Hospital login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Hospital login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during hospital login'
    });
  }
};

// Verify Token (for protected routes)
exports.verifyToken = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists in database
    let tableName, idField;
    
    switch (decoded.userType) {
      case 'customer':
        tableName = 'customer';
        idField = 'customer_id';
        break;
      case 'agent':
        tableName = 'agent';
        idField = 'agent_id';
        break;
      case 'admin':
        tableName = 'admin';
        idField = 'admin_id';
        break;
      case 'hospital':
        tableName = 'hospital';
        idField = 'hospital_id';
        break;
      default:
        return res.status(401).json({
          success: false,
          message: 'Invalid user type'
        });
    }

    const result = await db.query(
      `SELECT ${idField}, email FROM ${tableName} WHERE ${idField} = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: decoded
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get Current User Profile
exports.getProfile = async (req, res) => {
  const { userId, userType } = req.user; // From middleware

  try {
    let tableName, idField;

    switch (userType) {
      case 'customer':
        tableName = 'customer';
        idField = 'customer_id';
        break;
      case 'agent':
        tableName = 'agent';
        idField = 'agent_id';
        break;
      case 'admin':
        tableName = 'admin';
        idField = 'admin_id';
        break;
      case 'hospital':
        tableName = 'hospital';
        idField = 'hospital_id';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }

    const result = await db.query(
      `SELECT * FROM ${tableName} WHERE ${idField} = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    let profileData = {
      id: user[idField],
      email: user.email,
      userType: userType
    };

    // Add user-specific fields
    if (userType === 'customer' || userType === 'agent') {
      profileData.firstName = user.first_name;
      profileData.lastName = user.last_name;
      profileData.fullName = `${user.first_name} ${user.last_name}`;
      profileData.gender = user.gender;
      profileData.phone = user.phone;
      profileData.street = user.street;
      profileData.city = user.city;
      profileData.state = user.state;
      profileData.zipcode = user.zipcode;
      profileData.createdAt = user.created_at;
      profileData.updatedAt = user.updated_at;
      
      if (userType === 'customer') {
        profileData.dob = user.dob;
      } else if (userType === 'agent') {
        profileData.licenseNumber = user.license_number;
        profileData.commissionRate = user.commission_rate;
        profileData.dateOfBirth = user.date_of_birth;
      }
    } else if (userType === 'admin') {
      profileData.fullName = user.full_name;
      profileData.role = user.role;
      profileData.createdAt = user.created_at;
      profileData.updatedAt = user.updated_at;
    } else if (userType === 'hospital') {
      profileData.name = user.name;
      profileData.registrationNumber = user.registration_number;
      profileData.verifiedStatus = user.verified_status;
      profileData.phone = user.phone;
      profileData.street = user.street;
      profileData.city = user.city;
      profileData.state = user.state;
      profileData.zipcode = user.zipcode;
      profileData.createdAt = user.created_at;
      profileData.updatedAt = user.updated_at;
    }

    res.json({
      success: true,
      profile: profileData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};