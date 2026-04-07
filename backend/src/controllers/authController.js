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

  // After getting customerId, ADD THIS:
const tokenData = {
  userId: customerId,
  email: result.rows[0].email,
  userType: 'customer'
};

const token = jwt.sign(
  tokenData,
  process.env.JWT_SECRET || 'Allahuakbar786',
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
    date_of_birth
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
    console.log('dob:', date_of_birth, 'exists:', !!date_of_birth);
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
                created_at, updated_at, date_of_birth`,
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
        date_of_birth || null
      ]
    );

    const agentId = result.rows[0].agent_id;
// After getting agentId, ADD THIS:
const tokenData = {
  userId: agentId,
  email: result.rows[0].email,
  userType: 'agent'
};

const token = jwt.sign(
  tokenData,
  process.env.JWT_SECRET || 'Allahuakbar786',
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
// After getting adminId, ADD THIS:
const tokenData = {
  userId: adminId,
  email: result.rows[0].email,
  userType: 'admin',
  role: result.rows[0].role
};

const token = jwt.sign(
  tokenData,
  process.env.JWT_SECRET || 'Allahuakbar786',
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
    // ============= STEP 1: REQUEST RECEIVED =============
    console.log('\n🔵 ============ LOGIN ATTEMPT ============');
    console.log('📧 Email:', email);
    console.log('👤 User Type:', userType);
    console.log('🔑 Password provided:', password ? '✅ YES' : '❌ NO');
    console.log('📦 Full request body:', { email, password: password ? '***' : undefined, userType });
    
    // Validate inputs
    if (!email || !password || !userType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and user type'
      });
    }

    // ============= STEP 2: DETERMINE TABLE =============
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
      default:
        console.log('❌ Invalid user type:', userType);
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }
    console.log('📋 Table selected:', tableName);
    console.log('🔑 ID field:', idField);

    // ============= STEP 3: SEARCH FOR USER =============
    console.log(`🔍 Searching for user in ${tableName} with email:`, email.toLowerCase());
    
    const result = await db.query(
      `SELECT * FROM ${tableName} WHERE email = $1`,
      [email.toLowerCase()]
    );

    console.log(`📊 Query returned ${result.rows.length} rows`);

    if (result.rows.length === 0) {
      console.log('❌ User NOT FOUND in database');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const dbUser = result.rows[0];
    console.log('✅ User FOUND in database');
    console.log('  User ID:', dbUser[idField]);
    console.log('  Email:', dbUser.email);
    
    // Show user-specific fields
    if (userType === 'admin') {
      console.log('  Full Name:', dbUser.full_name);
      console.log('  Role:', dbUser.role);
    } else if (userType === 'customer' || userType === 'agent') {
      console.log('  First Name:', dbUser.first_name);
      console.log('  Last Name:', dbUser.last_name);
    }

    // ============= STEP 4: PASSWORD HASH DEBUG =============
    console.log('\n🔐 ============ PASSWORD DEBUG ============');
    console.log('Stored password hash:', dbUser.password_hash);
    console.log('Hash algorithm:', dbUser.password_hash?.substring(0, 4));
    console.log('Hash length:', dbUser.password_hash?.length);
    console.log('Hash format valid:', dbUser.password_hash?.startsWith('$2a$') || dbUser.password_hash?.startsWith('$2b$') ? '✅' : '❌');
    
    console.log('\nInput password:', password);
    console.log('Input password length:', password.length);
    console.log('Input password type:', typeof password);

    // ============= STEP 5: TEST PASSWORD COMPARISON =============
    console.log('\n🔄 Attempting bcrypt.compare...');
    
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, dbUser.password_hash);
      console.log('✅ bcrypt.compare executed successfully');
    } catch (compareError) {
      console.log('❌ bcrypt.compare threw error:', compareError.message);
      throw compareError;
    }
    
    console.log('🔐 Password valid:', isValidPassword ? '✅ YES' : '❌ NO');

    if (!isValidPassword) {
      console.log('❌ Password mismatch!');
      
      // ============= STEP 6: EXTRA DEBUG FOR PASSWORD MISMATCH =============
      console.log('\n🔧 PASSWORD MISMATCH DEBUG:');
      
      // Test if the hash is from a different password
      const commonPasswords = ['admin123', 'password', '123456', 'Admin@123', 'admin'];
      console.log('Testing common passwords:');
      
      for (const testPwd of commonPasswords) {
        try {
          const testResult = await bcrypt.compare(testPwd, dbUser.password_hash);
          console.log(`  Password "${testPwd}": ${testResult ? '✅ MATCH' : '❌ no match'}`);
        } catch (e) {
          console.log(`  Password "${testPwd}": ❌ error - ${e.message}`);
        }
      }
      
      // Generate a new hash for the attempted password to see what it would look like
      const testSalt = await bcrypt.genSalt(10);
      const newHashForAttempt = await bcrypt.hash(password, testSalt);
      console.log('\n📝 New hash for your attempted password:', newHashForAttempt);
      console.log('Note: This will be different every time due to salt');
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // ============= STEP 7: PASSWORD CORRECT - GENERATE TOKEN =============
    console.log('\n🎟️ Password correct! Generating JWT token...');
    
    const tokenData = {
      userId: dbUser[idField],
      email: dbUser.email,
      userType: userType
    };

    if (userType === 'admin') {
      tokenData.role = dbUser.role;
    }

    const token = jwt.sign(
  tokenData,
  process.env.JWT_SECRET || 'Allahuakbar786',
  { expiresIn: '7d' }
);

    
    console.log('✅ Token generated successfully');
    console.log('Token preview:', token.substring(0, 20) + '...');

    // ============= STEP 8: PREPARE USER DATA =============
    const userData = {
      id: dbUser[idField],
      email: dbUser.email,
      userType: userType
    };

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

    // ============= STEP 9: LOG AUDIT =============
    try {
      await db.query(
        `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
         VALUES ($1, $2, 'login', $1, $2, NOW())`,
        [userType, dbUser[idField]]
      );
      console.log('📝 Audit log created');
    } catch (auditError) {
      console.log('⚠️ Audit log failed (non-critical):', auditError.message);
    }

    // ============= STEP 10: SUCCESS =============
    console.log('\n✅ ============ LOGIN SUCCESSFUL ============');
    console.log('👤 User:', userData.email);
    console.log('🎭 Type:', userData.userType);
    console.log('🆔 ID:', userData.id);
    if (userData.fullName) console.log('📛 Name:', userData.fullName);
    console.log('=====================================\n');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('\n💥 ============ LOGIN ERROR ============');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=====================================\n');
    
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};
// // Login for Customers, Agents, and Admins
// exports.login = async (req, res) => {
//   const { email, password, userType } = req.body;

//   try {
//     // ADD THESE DEBUG LOGS:
//     console.log('=== LOGIN ATTEMPT ===');
//     console.log('Email:', email);
//     console.log('User Type:', userType);
//     console.log('Password provided:', password ? '[PROVIDED]' : '[MISSING]');
//     // Validate inputs
//     if (!email || !password || !userType) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide email, password, and user type'
//       });
//     }

//     let tableName, idField;

//     // Determine which table to query based on userType
//     switch (userType) {
//       case 'customer':
//         tableName = 'customer';
//         idField = 'customer_id';
//         break;
//       case 'agent':
//         tableName = 'agent';
//         idField = 'agent_id';
//         break;
//       case 'admin':
//         tableName = 'admin';
//         idField = 'admin_id';
//         break;
//       default:
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid user type'
//         });
//     }

//     // Find user
//     const result = await db.query(
//       `SELECT * FROM ${tableName} WHERE email = $1`,
//       [email.toLowerCase()]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     const dbUser = result.rows[0];

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, dbUser.password_hash);
//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     // Prepare user data for token
//     const tokenData = {
//       userId: dbUser[idField],
//       email: dbUser.email,
//       userType: userType
//     };

//     // Add role for admin
//     if (userType === 'admin') {
//       tokenData.role = dbUser.role;
//     }

//     // Create JWT token
//     const token = jwt.sign(
//       tokenData,
//       process.env.JWT_SECRET || 'Allahuakbar786',
//       { expiresIn: '7d' }
//     );

//     // Prepare user data for response
//     const userData = {
//       id: dbUser[idField],
//       email: dbUser.email,
//       userType: userType
//     };

//     // Add user-specific fields
//     if (userType === 'customer' || userType === 'agent') {
//       userData.firstName = dbUser.first_name;
//       userData.lastName = dbUser.last_name;
//       userData.fullName = `${dbUser.first_name} ${dbUser.last_name}`;
      
//       if (userType === 'agent') {
//         userData.licenseNumber = dbUser.license_number;
//       }
//     } else if (userType === 'admin') {
//       userData.fullName = dbUser.full_name;
//       userData.role = dbUser.role;
//     }

//     // Log audit with timestamp column
//     await db.query(
//       `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
//        VALUES ($1, $2, 'login', $1, $2, NOW())`,
//       [userType, dbUser[idField]]
//     );

//     res.json({
//       success: true,
//       message: 'Login successful',
//       token,
//       user: userData
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during login'
//     });
//   }
// };

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
      process.env.JWT_SECRET || 'Allahuakbar786',
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

exports.verifyToken = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    // USE THE SAME SECRET AS LOGIN AND MIDDLEWARE!
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Allahuakbar786');  // ← MUST MATCH
    
    // ... rest of your code
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
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

// Request Password Reset
exports.requestPasswordReset = async (req, res) => {
  const { email, userType } = req.body;

  try {
    console.log('Password reset request for:', { email, userType });

    // Validate inputs
    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Email and user type are required'
      });
    }

    let tableName, idField, nameField;

    // Determine table based on user type
    switch (userType) {
      case 'customer':
        tableName = 'customer';
        idField = 'customer_id';
        nameField = 'first_name';
        break;
      case 'agent':
        tableName = 'agent';
        idField = 'agent_id';
        nameField = 'first_name';
        break;
      case 'admin':
        tableName = 'admin';
        idField = 'admin_id';
        nameField = 'full_name';
        break;
      case 'hospital':
        tableName = 'hospital';
        idField = 'hospital_id';
        nameField = 'name';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }

    // Check if user exists
    const userResult = await db.query(
      `SELECT ${idField}, email, ${nameField} FROM ${tableName} WHERE email = $1`,
      [email.toLowerCase()]
    );

    // For security, don't reveal if email exists or not
    if (userResult.rows.length === 0) {
      console.log('Email not found in database:', email);
      return res.json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link within a few minutes.'
      });
    }

    const user = userResult.rows[0];
    const userId = user[idField];
    const userName = user[nameField] || 'User';

    const resetToken = jwt.sign(
  {
    userId: userId,
    email: user.email,
    userType: userType,
    purpose: 'password_reset'
  },
  process.env.JWT_SECRET || 'Allahuakbar786',  // ✅ CORRECT SECRET
  { expiresIn: '1h' }
);

    // Send password reset email
    const { sendPasswordResetEmail } = require('../utils/emailService');
    const emailSent = await sendPasswordResetEmail(user.email, userName, resetToken, userType);

    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
      // Still return success to user for security
      console.log('Password reset token (email failed):', resetToken);
      
      // For development: Log the reset link
      const encodedToken = Buffer.from(resetToken).toString('base64');
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${encodedToken}&type=${userType}`;
      console.log('🔗 Development Reset Link (use in browser):', resetLink);
    } else {
      console.log('✅ Password reset email sent successfully to:', user.email);
    }

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ($1, $2, 'request_password_reset', $1, $2, NOW())`,
      [userType, userId]
    );

    res.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link within a few minutes. Please check your spam folder if you don\'t see it.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
};

// Verify Reset Token
exports.verifyResetToken = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    // Decode base64 token
    let decodedToken;
    try {
      decodedToken = Buffer.from(token, 'base64').toString('ascii');
    } catch (decodeError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token format'
      });
    }

    // Verify JWT token
    let verifiedToken;
    try {
      verifiedToken = jwt.verify(decodedToken, process.env.JWT_SECRET || 'Allahuakbar786');
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          message: 'Reset link has expired. Please request a new one.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check token purpose
    if (verifiedToken.purpose !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token purpose'
      });
    }

    // Check if user still exists
    let tableName, idField;
    
    switch (verifiedToken.userType) {
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

    const userResult = await db.query(
      `SELECT ${idField}, email FROM ${tableName} WHERE ${idField} = $1 AND email = $2`,
      [verifiedToken.userId, verifiedToken.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      email: verifiedToken.email,
      userType: verifiedToken.userType
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying reset token'
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  try {
    // Validate inputs
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Password strength validation
// To this (allows all common special characters):
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      });
    }

    // Decode and verify token
    let decodedToken;
    try {
      decodedToken = Buffer.from(token, 'base64').toString('ascii');
    } catch (decodeError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token format'
      });
    }

    let verifiedToken;
    try {
      verifiedToken = jwt.verify(decodedToken, process.env.JWT_SECRET || 'Allahuakbar786');
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          message: 'Reset link has expired. Please request a new one.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    if (verifiedToken.purpose !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token purpose'
      });
    }

    // Determine table
    let tableName, idField;
    switch (verifiedToken.userType) {
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

    // Check if user exists
    const userResult = await db.query(
      `SELECT ${idField}, email FROM ${tableName} WHERE ${idField} = $1 AND email = $2`,
      [verifiedToken.userId, verifiedToken.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await db.query(
      `UPDATE ${tableName} 
       SET password_hash = $1, updated_at = NOW()
       WHERE ${idField} = $2`,
      [passwordHash, verifiedToken.userId]
    );

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ($1, $2, 'password_reset', $1, $2, NOW())`,
      [verifiedToken.userType, verifiedToken.userId]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

// Test Email Endpoint (for development only)
exports.testEmailEndpoint = async (req, res) => {
  try {
    console.log('Test email endpoint called');
    
    // For now, just return success (implement emailService later)
    res.json({
      success: true,
      message: 'Test email endpoint is working (email not sent - implement emailService first)'
    });
    
  } catch (error) {
    console.error('Test email endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed'
    });
  }
};