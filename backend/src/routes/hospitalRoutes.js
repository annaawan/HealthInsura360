const express = require('express');
const router = express.Router();

// Database
const db = require('../config/database');
const pool = db.pool;

// Middleware
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadHospitalDocuments, getDocumentPath, uploadClaimDocuments } = require('../middleware/upload');

// Services
const emailService = require('../services/emailServices');
const { generateRegistrationNumber } = require('../utils/registrationGenerator');

// Core modules
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================
// Helper function to process claim documents (UPDATED to match customer format)
// ============================================
const processClaimDocuments = async (claimId, files, hospitalId) => {
    const documentUrls = [];
    
    if (!files || files.length === 0) {
        return documentUrls;
    }
    
    for (const file of files) {
        const oldPath = file.path;
        
        // Get file extension
        const ext = path.extname(file.originalname);
        
        // Create safe filename (remove special characters)
        let safeName = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_');
        
        // Format: claim_{claimId}_{safeName} (matching customer format)
        const newFilename = `claim_${claimId}_${safeName}`;
        const newPath = path.join(path.dirname(oldPath), newFilename);
        
        try {
            // Rename the file
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
                console.log(`✅ Renamed: ${file.originalname} -> ${newFilename}`);
            }
            
            // Store in the SAME format as customer claims
            documentUrls.push({
                filename: newFilename,
                originalName: file.originalname,
                path: `/uploads/claims/${newFilename}`,
                type: file.mimetype,
                size: file.size,
                uploadedAt: new Date(),
                uploadedBy: hospitalId,
                uploadedByType: 'hospital'
            });
        } catch (renameError) {
            console.error(`❌ Rename failed: ${renameError.message}`);
            // Fallback: use original temp filename
            documentUrls.push({
                filename: file.filename,
                originalName: file.originalname,
                path: `/uploads/claims/${file.filename}`,
                type: file.mimetype,
                size: file.size,
                uploadedAt: new Date(),
                uploadedBy: hospitalId,
                uploadedByType: 'hospital'
            });
        }
    }
    
    console.log(`📄 Processed ${documentUrls.length} documents for claim ${claimId}`);
    return documentUrls;
};

// // ----------------------------------------
// // GET: Fetch all hospitals
// // ----------------------------------------
// router.get("/", async (req, res) => {
//   try {
//     const result = await db.query("SELECT * FROM hospital ORDER BY hospital_id DESC");
//     res.json(result.rows);
//   } catch (err) {
//     console.error("Error fetching hospitals:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });
// ----------------------------------------
// GET: Fetch all hospitals
// ----------------------------------------
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        hospital_id,
        name,
        email,
        phone,
        contact_person,
        registration_number,
        street,
        city,
        state,
        zipcode,
        specialization,
        status,
        verified_status,
        verified_at,
        created_at,
        updated_at,
        documents  -- ✅ IMPORTANT: Include the documents column
      FROM hospital 
      ORDER BY hospital_id DESC
    `);
    
    // ✅ Parse documents JSON for each hospital
    const hospitals = result.rows.map(hospital => ({
      ...hospital,
      documents: hospital.documents ? (
        typeof hospital.documents === 'string' 
          ? JSON.parse(hospital.documents) 
          : hospital.documents
      ) : []
    }));
    
    res.json({
      success: true,
      hospitals: hospitals
    });
  } catch (err) {
    console.error("Error fetching hospitals:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ----------------------------------------
// GET: Fetch pending hospital applications (for admin)
// ----------------------------------------
router.get("/pending", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM hospital WHERE status = 'pending' ORDER BY created_at DESC"
    );
    res.json({
      success: true,
      count: result.rows.length,
      hospitals: result.rows
    });
  } catch (err) {
    console.error("Error fetching pending hospitals:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ----------------------------------------
// POST: Upload hospital documents
// ----------------------------------------
router.post("/upload-documents", (req, res, next) => {
  // Use uploadHospitalDocuments middleware
  uploadHospitalDocuments(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('📁 Files received:', req.files);
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    // Get file information for each uploaded file
    const uploadedFiles = req.files.map(file => {
      // Generate URL for the file
      const fileUrl = getDocumentPath ? getDocumentPath(file.filename) : `/uploads/hospital-documents/${file.filename}`;
      
      return {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: fileUrl,
        fieldname: file.fieldname // Add fieldname to identify file type
      };
    });

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} file(s)`);

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles,
      // Group files by fieldname if needed
      filesByType: req.files.reduce((acc, file) => {
        if (!acc[file.fieldname]) acc[file.fieldname] = [];
        acc[file.fieldname].push({
          filename: file.filename,
          originalName: file.originalname,
          url: getDocumentPath ? getDocumentPath(file.filename) : `/uploads/hospital-documents/${file.filename}`
        });
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('❌ Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading documents: ' + error.message
    });
  }
});

// ----------------------------------------
// PUT: Approve hospital with registration number
// ----------------------------------------


router.put("/approve/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || 1;

  try {
    await db.query('BEGIN');

    // Check if hospital exists and is pending
    const checkResult = await db.query(
      "SELECT hospital_id, name, email, status FROM hospital WHERE hospital_id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }

    const hospital = checkResult.rows[0];
    
    if (hospital.status !== 'pending') {
      await db.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: `Hospital is already ${hospital.status}` 
      });
    }

    // Generate unique registration number
    const registrationNumber = await generateRegistrationNumber();

    // Update hospital record
    const updateResult = await db.query(
      `UPDATE hospital 
       SET status = 'verified',
           verified_status = true,
           verified_at = CURRENT_TIMESTAMP,
           registration_number = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE hospital_id = $2
       RETURNING hospital_id, name, email, registration_number, status, verified_at`,
      [registrationNumber, id]
    );

    await db.query('COMMIT');

    // To:
const emailResult = await emailService.sendHospitalApprovalEmail(hospital.email, hospital.name, registrationNumber);

    if (!emailResult.success) {
      console.warn('⚠️ Hospital approved but email notification failed:', emailResult.error);
    }

    res.json({ 
      success: true, 
      message: "Hospital approved successfully. Notification email sent.",
      hospital: updateResult.rows[0],
      emailStatus: emailResult.success ? 'sent' : 'failed'
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Error approving hospital:", err);
    res.status(500).json({ success: false, error: "Server error: " + err.message });
  }
});

// ----------------------------------------
// PUT: Reject hospital
// ----------------------------------------
router.put("/reject/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    // Start transaction
    await db.query('BEGIN');

    // Check if hospital exists and is pending
    const checkResult = await db.query(
      "SELECT hospital_id, name, email, status FROM hospital WHERE hospital_id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }

    const hospital = checkResult.rows[0];
    
    if (hospital.status !== 'pending') {
      await db.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: `Hospital is already ${hospital.status}` 
      });
    }

    // Update hospital record
    const updateResult = await db.query(
      `UPDATE hospital 
       SET status = 'not-verified',
           verified_status = false,
           verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE hospital_id = $1
       RETURNING hospital_id, name, email, status, verified_at`,
      [id]
    );

    // Commit transaction
    await db.query('COMMIT');

   await emailService.sendHospitalRejectionEmail(hospital.email, hospital.name, reason);


    res.json({ 
      success: true, 
      message: "Hospital rejected successfully",
      hospital: updateResult.rows[0]
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Error rejecting hospital:", err);
    res.status(500).json({ success: false, error: "Server error: " + err.message });
  }
});

// ----------------------------------------
// PUT: Update hospital status (legacy - keep for backward compatibility)
// ----------------------------------------
router.put("/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const result = await db.query(
      `UPDATE hospital 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE hospital_id = $2
       RETURNING hospital_id, name, email, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }

    res.json({ success: true, message: "Hospital status updated", hospital: result.rows[0] });
  } catch (err) {
    console.error("Error updating hospital status:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
// ============================================
// GET: Get all active customers (for dashboard list)
// ============================================
router.get("/customers", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        customer_id as id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) as full_name,
        email,
        phone,
        city,
        state,
        status,
        created_at
       FROM customer 
       WHERE status = 'active'
       ORDER BY first_name ASC
       LIMIT 50`
    );
    
    res.json({
      success: true,
      customers: result.rows
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// ============================================
// PUT: Update hospital (for admin editing)
// ============================================
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    zip_code,
    registration_number,
    contact_person,
    specialization,
    status
  } = req.body;

  try {
    // Check if hospital exists
    const checkResult = await db.query(
      "SELECT hospital_id FROM hospital WHERE hospital_id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Hospital not found" 
      });
    }

    // Update query
    const result = await db.query(
      `UPDATE hospital 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           street = COALESCE($4, street),
           city = COALESCE($5, city),
           state = COALESCE($6, state),
           zipcode = COALESCE($7, zipcode),
           registration_number = COALESCE($8, registration_number),
           contact_person = COALESCE($9, contact_person),
           specialization = COALESCE($10, specialization),
           status = COALESCE($11, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE hospital_id = $12
       RETURNING *`,
      [
        name, email, phone, address, city, state, 
        zip_code, registration_number, contact_person, 
        specialization, status, id
      ]
    );

    res.json({
      success: true,
      message: "Hospital updated successfully",
      hospital: result.rows[0]
    });

  } catch (err) {
    console.error("Error updating hospital:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error: " + err.message 
    });
  }
});
// ============================================
// GET: Get hospital by ID (for dashboard - accessible by hospital themselves)
// // ============================================
// router.get("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     console.log(`📋 Fetching hospital with ID: ${id}`);
    
//     // Check if token is provided (for authenticated requests)
//     const token = req.headers.authorization?.split(' ')[1];
//     let isAuthorized = false;
//     let userId = null;
    
//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Allahuakbar786');
//         userId = decoded.id;
//         isAuthorized = (userId === parseInt(id));
//         console.log(`🔐 Token verified. User ID: ${userId}, Hospital ID: ${id}, Authorized: ${isAuthorized}`);
//       } catch (err) {
//         console.log('⚠️ Token verification failed:', err.message);
//         // Continue as unauthorized
//       }
//     }
    
//     // For hospital dashboard, we want to return full profile if authorized
//     let query;
//     let params = [id];
    
//     if (isAuthorized) {
//       // Authorized hospital - return full profile
//       query = `SELECT 
//         hospital_id as id,
//         name, 
//         email, 
//         registration_number,
//         phone, 
//         street, 
//         city, 
//         state, 
//         zipcode,
//         contact_person,
//         specialization,
//         status,
//         verified_status,
//         verified_at,
//         created_at,
//         updated_at
//         FROM hospital WHERE hospital_id = $1`;
//       console.log('📊 Returning full profile for authorized hospital');
//     } else {
//       // Public/non-authorized - return limited info
//       query = `SELECT 
//         hospital_id as id,
//         name, 
//         email, 
//         registration_number,
//         phone, 
//         city, 
//         state,
//         status
//         FROM hospital WHERE hospital_id = $1`;
//       console.log('📊 Returning limited profile for public request');
//     }
    
//     const result = await db.query(query, params);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "Hospital not found" 
//       });
//     }

//     console.log(`✅ Hospital found: ${result.rows[0].name}`);
    
//     res.json({
//       success: true,
//       hospital: result.rows[0]
//     });
    
//   } catch (err) {
//     console.error("Error fetching hospital:", err);
//     res.status(500).json({ 
//       success: false, 
//       message: "Server error: " + err.message 
//     });
//   }
// });
// ============================================
// GET: Get hospital by ID
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Fetching hospital with ID: ${id}`);
    
    // Check if token is provided (for authenticated requests)
    const token = req.headers.authorization?.split(' ')[1];
    let isAuthorized = false;
    let userId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Allahuakbar786');
        userId = decoded.id;
        isAuthorized = (userId === parseInt(id));
        console.log(`🔐 Token verified. User ID: ${userId}, Hospital ID: ${id}, Authorized: ${isAuthorized}`);
      } catch (err) {
        console.log('⚠️ Token verification failed:', err.message);
      }
    }
    
    // For hospital dashboard, return full profile if authorized
    let query;
    let params = [id];
    
    if (isAuthorized) {
      // Authorized hospital - return full profile including documents
      query = `SELECT 
        hospital_id as id,
        name, 
        email, 
        registration_number,
        phone, 
        street, 
        city, 
        state, 
        zipcode,
        contact_person,
        specialization,
        status,
        verified_status,
        verified_at,
        created_at,
        updated_at,
        documents  -- ✅ Include documents
        FROM hospital WHERE hospital_id = $1`;
      console.log('📊 Returning full profile for authorized hospital');
    } else {
      // Public/non-authorized - return limited info (no documents)
      query = `SELECT 
        hospital_id as id,
        name, 
        email, 
        registration_number,
        phone, 
        city, 
        state,
        status
        FROM hospital WHERE hospital_id = $1`;
      console.log('📊 Returning limited profile for public request');
    }
    
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Hospital not found" 
      });
    }

    // ✅ Parse documents if they exist
    if (isAuthorized && result.rows[0].documents) {
      result.rows[0].documents = typeof result.rows[0].documents === 'string' 
        ? JSON.parse(result.rows[0].documents) 
        : result.rows[0].documents;
    }

    console.log(`✅ Hospital found: ${result.rows[0].name}`);
    
    res.json({
      success: true,
      hospital: result.rows[0]
    });
    
  } catch (err) {
    console.error("Error fetching hospital:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error: " + err.message 
    });
  }
});
// ----------------------------------------
// GET: Verify password setup token
// ----------------------------------------
router.get("/verify-setup-token", async (req, res) => {
  const { token, email } = req.query;
  
  try {
    const result = await db.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 
       AND email = $2 
       AND user_type = 'hospital'
       AND used = FALSE 
       AND expires_at > NOW()`,
      [token, email]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        valid: false, 
        message: 'Invalid or expired token' 
      });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(500).json({ 
      valid: false, 
      message: 'Server error' 
    });
  }
});

// ----------------------------------------
// POST: Setup hospital password
// ----------------------------------------
router.post("/setup-password", async (req, res) => {
  const { token, email, password } = req.body;
  
  if (!token || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Token, email, and password are required' 
    });
  }

  try {
    await db.query('BEGIN');

    // Verify token
    const tokenResult = await db.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 
       AND email = $2 
       AND user_type = 'hospital'
       AND used = FALSE 
       AND expires_at > NOW()`,
      [token, email]
    );

    if (tokenResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    // Hash the password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update hospital password
    const updateResult = await db.query(
      `UPDATE hospital 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE email = $2 
       RETURNING hospital_id, name, email`,
      [hashedPassword, email]
    );

    if (updateResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Hospital not found' 
      });
    }

    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
      [token]
    );

    await db.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'Password set successfully',
      hospital: updateResult.rows[0]
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error setting password:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
});

// ----------------------------------------
// POST: Hospital Login (with Email + Password + Registration Number)
// ----------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password, registrationNumber } = req.body;

    // Validate input
    if (!email || !password || !registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and registration number are required'
      });
    }

    // Find hospital by email AND registration number
    const result = await db.query(
      `SELECT 
        hospital_id, 
        name, 
        email, 
        registration_number, 
        password_hash, 
        status,
        verified_status,
        city,
        phone
       FROM hospital 
       WHERE email = $1 AND registration_number = $2`,
      [email, registrationNumber]
    );

    // Check if hospital exists
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or registration number combination'
      });
    }

    const hospital = result.rows[0];

    // Check if hospital is verified
    if (hospital.status !== 'verified' || !hospital.verified_status) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not verified yet. Please wait for admin approval.'
      });
    }

    // Check if password is set (password_hash exists)
    if (!hospital.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Password not set. Please use the password setup link from your email.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, hospital.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: hospital.hospital_id,
        email: hospital.email,
        role: 'hospital',
        registrationNumber: hospital.registration_number
      },
      process.env.JWT_SECRET || 'Allahuakbar786',
      { expiresIn: '24h' }
    );

    // Remove sensitive data from response
    delete hospital.password_hash;

    // Log successful login (optional)
    console.log(`✅ Hospital logged in: ${hospital.name} (${hospital.registration_number})`);

    // Send success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      hospital: {
        id: hospital.hospital_id,
        name: hospital.name,
        email: hospital.email,
        registrationNumber: hospital.registration_number,
        status: hospital.status,
        city: hospital.city,
        phone: hospital.phone
      }
    });

  } catch (error) {
    console.error('❌ Hospital login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// ----------------------------------------
// GET: Get hospital profile (protected route)
// ----------------------------------------
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // authMiddleware should set req.user
    const hospitalId = req.user.id;

    const result = await db.query(
      `SELECT 
        hospital_id,
        name,
        email,
        registration_number,
        phone,
        street,
        city,
        state,
        zipcode,
        contact_person,
        specialization,
        status,
        verified_status,
        verified_at,
        created_at
       FROM hospital 
       WHERE hospital_id = $1`,
      [hospitalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.json({
      success: true,
      hospital: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching hospital profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ----------------------------------------
// POST: Register new hospital (NO PASSWORD)
// ----------------------------------------
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      contactPerson,
      registrationNumber, // Optional government registration number
      street,
      city,
      state,
      zipcode,
      documents // Array of uploaded documents
    } = req.body;

    console.log('📝 Hospital registration request received:', { email, name });

    // Validate required fields
    if (!name || !email || !phone || !contactPerson || !street || !city || !state || !zipcode) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    // Check if hospital already exists
    const existingHospital = await db.query(
      'SELECT hospital_id FROM hospital WHERE email = $1',
      [email]
    );

    if (existingHospital.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hospital with this email already exists'
      });
    }

    // Insert new hospital with pending status (NO PASSWORD)
    const result = await db.query(
      `INSERT INTO hospital (
        name, email, phone, contact_person, government_reg_number,
        street, city, state, zipcode, documents,
        status, verified_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING hospital_id, name, email, status`,
      [
        name, 
        email, 
        phone, 
        contactPerson, 
        registrationNumber || null,
        street, 
        city, 
        state, 
        zipcode,
        JSON.stringify(documents || []), // Store documents as JSON
        'pending', 
        false
      ]
    );

    // Send notification to admin about new registration
    try {
      const { sendHospitalRegistrationNotification } = require('../utils/emailService');
      await sendHospitalRegistrationNotification({
        name,
        email,
        phone,
        contactPerson,
        city,
        state
      });
      console.log('✅ Admin notification sent for new hospital registration');
    } catch (emailErr) {
      console.log('⚠️ Admin notification email failed:', emailErr.message);
      // Don't fail the registration if email fails
    }

    console.log('✅ Hospital registered successfully:', result.rows[0].hospital_id);

    res.status(201).json({
      success: true,
      message: 'Hospital registered successfully. Pending admin approval.',
      hospital: {
        id: result.rows[0].hospital_id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        status: result.rows[0].status
      }
    });

  } catch (error) {
    console.error('❌ Hospital registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during hospital registration'
    });
  }
});

// ============================================
// GET: Get hospital claims (only cashless claims for this hospital)
// ============================================
router.get("/:id/claims", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Fetching cashless claims for hospital ID: ${id}`);
    
    const result = await db.query(`
      SELECT 
        c.claim_id as id,
        c.claim_type,
        c.claim_amount,
        c.approved_amount,
        LOWER(c.status) as status,
        c.filing_date as created_at,
        td.diagnosis,
        td.treatment_description,
        td.doctor_name,
        td.treatment_date,
        td.treatment_cost,
        CONCAT(cust.first_name, ' ', cust.last_name) as patient_name,
        cust.email as patient_email,
        cust.phone as patient_phone
      FROM claim c
      LEFT JOIN treatment_detail td ON c.claim_id = td.claim_id
      LEFT JOIN customer cust ON c.customer_id = cust.customer_id
      WHERE c.hospital_id = $1
      ORDER BY c.filing_date DESC
    `, [id]);
    
    console.log(`✅ Found ${result.rows.length} cashless claims for hospital ${id}`);

    const claims = result.rows.map(row => ({
      id: row.id,
      patientName: row.patient_name || 'Unknown Patient',
      patientEmail: row.patient_email,
      patientPhone: row.patient_phone,
      diagnosis: row.diagnosis || 'Not specified',
      treatmentDescription: row.treatment_description || 'Not specified',
      doctorName: row.doctor_name || 'Not specified',
      treatmentDate: row.treatment_date || row.created_at,
      treatmentCost: parseFloat(row.treatment_cost || row.claim_amount) || 0,
      status: row.status || 'pending',
      claimType: row.claim_type,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      claims: claims
    });

  } catch (error) {
    console.error('❌ Error fetching hospital claims:', error);
    res.status(200).json({
      success: true,
      claims: [],
      message: 'No claims found'
    });
  }
});

// ============================================
// POST: Submit cashless claim (by hospital)
// ============================================
router.post('/claims/cashless', authMiddleware, async (req, res) => {
  try {
    const {
      policyId,
      diagnosis,
      treatmentDescription,
      doctorName,
      treatmentDate,
      treatmentCost,
      documents,
      hospitalId
    } = req.body;

    if (!policyId || !diagnosis || !treatmentDescription || !doctorName || !treatmentDate || !treatmentCost) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Start transaction
    await db.query('BEGIN');

    // Get customer ID from policy
    const policyResult = await db.query(
      'SELECT customer_id FROM policy WHERE policy_id = $1',
      [policyId]
    );

    if (policyResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    const customerId = policyResult.rows[0].customer_id;

    // 1. Insert into claim table
    const claimResult = await db.query(
      `INSERT INTO claim (
        policy_id,
        customer_id,
        hospital_id,
        claim_type,
        claim_amount,
        status,
        filing_date
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING claim_id`,
      [
        policyId,
        customerId,
        hospitalId,
        'cashless', // Mark as cashless claim
        treatmentCost,
        'pending'
      ]
    );

    const claimId = claimResult.rows[0].claim_id;

    // 2. Insert into treatment_detail table
    await db.query(
      `INSERT INTO treatment_detail (
        claim_id,
        diagnosis,
        treatment_description,
        doctor_name,
        treatment_cost,
        treatment_date
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        claimId,
        diagnosis,
        treatmentDescription,
        doctorName,
        treatmentCost,
        treatmentDate
      ]
    );

    // Commit transaction
    await db.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Cashless claim submitted successfully',
      claimId: claimId
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error submitting cashless claim:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET: Generate claim report
// ============================================
router.get('/:id/claims/report', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📊 Generating PDF claim report for hospital ID: ${id}`);
    
    // Get hospital name
    const hospitalResult = await db.query(
      'SELECT name FROM hospital WHERE hospital_id = $1',
      [id]
    );
    
    const hospitalName = hospitalResult.rows[0]?.name || 'Hospital';
    
    // Get claims data
    const result = await db.query(
      `SELECT 
        c.claim_id as id,
        c.claim_type,
        c.claim_amount,
        c.approved_amount,
        c.status,
        c.filing_date,
        td.diagnosis,
        td.treatment_description,
        td.doctor_name,
        td.treatment_date,
        td.treatment_cost,
        CONCAT(cust.first_name, ' ', cust.last_name) as patient_name,
        cust.email as patient_email,
        p.policy_number
      FROM claim c
      LEFT JOIN treatment_detail td ON c.claim_id = td.claim_id
      LEFT JOIN customer cust ON c.customer_id = cust.customer_id
      LEFT JOIN policies p ON c.policy_id = p.id
      WHERE c.hospital_id = $1
      ORDER BY c.filing_date DESC`,
      [id]
    );
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=claim_report_${hospitalName}_${Date.now()}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('HealthInsura360 - Claim Report', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Hospital: ${hospitalName}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    
    doc.moveDown();
    doc.moveDown();
    
    // Add summary
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Summary');
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Total Claims: ${result.rows.length}`);
    doc.text(`Pending: ${result.rows.filter(r => r.status === 'pending').length}`);
    doc.text(`Approved: ${result.rows.filter(r => r.status === 'approved').length}`);
    doc.text(`Rejected: ${result.rows.filter(r => r.status === 'rejected').length}`);
    
    doc.moveDown();
    
    // Add claims table
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Claims Details');
    
    doc.moveDown();
    
    // Table headers
    const startX = 50;
    let currentY = doc.y;
    
    doc.fontSize(9)
       .font('Helvetica-Bold');
    
    doc.text('Claim ID', startX, currentY);
    doc.text('Patient', startX + 80, currentY);
    doc.text('Diagnosis', startX + 180, currentY);
    doc.text('Amount', startX + 280, currentY);
    doc.text('Status', startX + 350, currentY);
    doc.text('Date', startX + 420, currentY);
    
    doc.moveDown();
    currentY = doc.y;
    
    // Table rows
    doc.font('Helvetica');
    result.rows.forEach((claim) => {
      if (doc.y > 700) {
        doc.addPage();
        currentY = doc.y;
      }
      
      doc.text(claim.id.toString(), startX, currentY);
      doc.text((claim.patient_name || 'N/A').substring(0, 15), startX + 80, currentY);
      doc.text((claim.diagnosis || 'N/A').substring(0, 20), startX + 180, currentY);
      doc.text(`USD ${claim.claim_amount || 0}`, startX + 280, currentY);
      doc.text(claim.status || 'N/A', startX + 350, currentY);
      doc.text(new Date(claim.filing_date).toLocaleDateString(), startX + 420, currentY);
      
      doc.moveDown();
      currentY = doc.y;
    });
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add to Route File 1 (after the existing routes)

// TEMPORARY DEBUG ROUTE - Test authentication
router.get("/test-auth", authMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Authentication working!', 
    user: req.user 
  });
});
// ============================================
// GET: Search active customers (for hospital to file claims)
// ============================================

// ============================================
// GET: Get all active customers (for dashboard display)
// ============================================
router.get("/customers/all", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        customer_id as id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) as full_name,
        email,
        phone,
        city,
        state,
        zipcode,
        status,
        created_at
       FROM customer 
       WHERE status = 'active'
       ORDER BY created_at DESC
       LIMIT 20`
    );
    
    res.json({
      success: true,
      customers: result.rows
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.get("/customers/search", authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const result = await db.query(
      `SELECT 
        customer_id as id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) as full_name,
        email,
        phone,
        city,
        state,
        status
       FROM customer 
       WHERE status = 'active' 
       AND (LOWER(first_name) LIKE $1 
            OR LOWER(last_name) LIKE $1 
            OR LOWER(email) LIKE $1
            OR CONCAT(first_name, ' ', last_name) ILIKE $1)
       ORDER BY first_name
       LIMIT 50`,
      [searchTerm]
    );

    res.json({
      success: true,
      customers: result.rows
    });

  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET: Get customer policies with details
// ============================================
router.get("/customers/:customerId/policies", authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Get all active policies for this customer with policy plan details
    const result = await db.query(
      `SELECT 
        p.policy_id,
        p.policy_type,
        p.plan_id,
        p.sum_insured,
        p.premium_amount,
        p.start_date,
        p.end_date,
        p.status,
        p.remaining_coverage,
        p.used_coverage,
        p.deductible_amount,
        p.co_pay_percentage,
        pp.plan_name,
        pp.description as plan_description,
        pp.coverage_details,
        pp.max_claim_limit,
        pp.waiting_period_days,
        pp.exclusions,
        pp.benefits,
        pp.deductible as plan_deductible
      FROM policy p
      LEFT JOIN policy_plans pp ON p.plan_id = pp.plan_id  -- ✅ Use plan_id, not policy_type
      WHERE p.customer_id = $1 
        AND p.status = 'active'
        AND p.end_date > CURRENT_DATE
      ORDER BY p.start_date DESC`,
      [customerId]
    );

    // Also get customer details
    const customerResult = await db.query(
      `SELECT 
        customer_id as id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) as full_name,
        email,
        phone,
        city,
        state
       FROM customer 
       WHERE customer_id = $1`,
      [customerId]
    );

    res.json({
      success: true,
      customer: customerResult.rows[0] || null,
      policies: result.rows
    });

  } catch (error) {
    console.error('Error fetching customer policies:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ============================================
// POST: Submit claim with validation and documents (Hospital)
// ============================================
router.post("/claims/submit", authMiddleware, uploadClaimDocuments, async (req, res) => {
    let client;
    
    try {
        const {
            policyId,
            customerId,
            diagnosis,
            treatmentDescription,
            doctorName,
            treatmentDate,
            treatmentCost
        } = req.body;

        const hospitalId = req.user.id;

        // Validate required fields
        if (!policyId || !customerId || !diagnosis || !treatmentDescription || 
            !doctorName || !treatmentDate || !treatmentCost) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be filled"
            });
        }

        // Get a client from the pool for transaction
        client = await pool.connect();
        
        // Start transaction
        await client.query('BEGIN');

        // 1. Get policy details (to validate remaining coverage)
        const policyResult = await client.query(
            `SELECT 
                policy_id,
                sum_insured,
                remaining_coverage,
                deductible_amount,
                co_pay_percentage,
                customer_id,
                agent_id
             FROM policy 
             WHERE policy_id = $1 AND status = 'active'`,
            [policyId]
        );

        if (policyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Active policy not found"
            });
        }

        const policy = policyResult.rows[0];

        // 2. Validate customer matches policy
        if (policy.customer_id !== parseInt(customerId)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Policy does not belong to this customer"
            });
        }

        const claimAmount = parseFloat(treatmentCost);
        const remainingCoverage = parseFloat(policy.remaining_coverage);

        // 3. Validate claim amount against remaining coverage
        if (claimAmount > remainingCoverage) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Claim amount ($${claimAmount}) exceeds remaining coverage ($${remainingCoverage})`,
                remainingCoverage: remainingCoverage,
                claimAmount: claimAmount
            });
        }

        // Get hospital name
        const hospitalResult = await client.query(
            'SELECT name FROM hospital WHERE hospital_id = $1',
            [hospitalId]
        );
        const hospitalName = hospitalResult.rows[0]?.name || 'Hospital';

        // Get customer details for patient name
        const customerResult = await client.query(
            'SELECT first_name, last_name, email FROM customer WHERE customer_id = $1',
            [customerId]
        );
        const patientName = customerResult.rows[0] 
            ? `${customerResult.rows[0].first_name} ${customerResult.rows[0].last_name}`
            : 'Unknown Patient';

        // 4. Insert claim record - STORE FULL AMOUNT, NO DEDUCTIBLE CALCULATION HERE
        const claimResult = await client.query(
            `INSERT INTO claim (
                policy_id,
                customer_id,
                hospital_id,
                claim_type,
                claim_amount,
                diagnosis,
                description,
                service_date,
                status,
                filing_date,
                deductible_applied,
                co_pay_amount,
                insurance_paid,
                client_responsibility,
                patient_name,
                hospital_name,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, NOW())
            RETURNING claim_id`,
            [
                policyId,
                customerId,
                hospitalId,
                'cashless',
                claimAmount,        // ← Store FULL treatment cost
                diagnosis,
                treatmentDescription,
                treatmentDate,
                'pending',
                0,                  // deductible_applied (agent will set)
                0,                  // co_pay_amount (agent will set)
                0,                  // insurance_paid (agent will set)
                0,                  // client_responsibility (agent will set)
                patientName,
                hospitalName
            ]
        );

        const claimId = claimResult.rows[0].claim_id;
        console.log(`✅ Claim ${claimId} created for hospital ${hospitalId} with amount $${claimAmount}`);

        // 5. Insert treatment details (store full treatment cost)
        await client.query(
            `INSERT INTO treatment_detail (
                claim_id,
                diagnosis,
                treatment_description,
                doctor_name,
                treatment_cost,
                treatment_date
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                claimId,
                diagnosis,
                treatmentDescription,
                doctorName,
                claimAmount,  // Full treatment cost stored here
                treatmentDate
            ]
        );

        // // 6. Process and link uploaded documents
        // let documentUrls = [];
        // if (req.files && req.files.length > 0) {
        //     console.log(`📄 Processing ${req.files.length} uploaded file(s)...`);
            
        //     for (const file of req.files) {
        //         const oldPath = file.path;
        //         let safeName = file.originalname
        //             .replace(/[^a-zA-Z0-9.-]/g, '_')
        //             .replace(/_+/g, '_');
                
        //         const newFilename = `claim_${claimId}_${safeName}`;
        //         const newPath = path.join(path.dirname(oldPath), newFilename);
                
        //         try {
        //             if (fs.existsSync(oldPath)) {
        //                 fs.renameSync(oldPath, newPath);
        //                 console.log(`✅ Renamed: ${file.originalname} -> ${newFilename}`);
        //             }
                    
        //             documentUrls.push({
        //                 filename: newFilename,
        //                 originalName: file.originalname,
        //                 path: `/uploads/claims/${newFilename}`,
        //                 type: file.mimetype,
        //                 size: file.size,
        //                 uploadedAt: new Date(),
        //                 uploadedBy: hospitalId,
        //                 uploadedByType: 'hospital'
        //             });
        //         } catch (renameError) {
        //             console.error(`❌ Rename failed: ${renameError.message}`);
        //             documentUrls.push({
        //                 filename: file.filename,
        //                 originalName: file.originalname,
        //                 path: `/uploads/claims/${file.filename}`,
        //                 type: file.mimetype,
        //                 size: file.size,
        //                 uploadedAt: new Date(),
        //                 uploadedBy: hospitalId,
        //                 uploadedByType: 'hospital'
        //             });
        //         }
        //     }
            
        //     if (documentUrls.length > 0) {
        //         await client.query(
        //             `UPDATE claim 
        //              SET documents = $1, updated_at = NOW()
        //              WHERE claim_id = $2`,
        //             [JSON.stringify(documentUrls), claimId]
        //         );
        //         console.log(`✅ Linked ${documentUrls.length} document(s) to claim ${claimId}`);
        //     }
        // }
// 6. Process and link uploaded documents
let documentUrls = [];
if (req.files && req.files.length > 0) {
    console.log(`📄 Processing ${req.files.length} uploaded file(s)...`);
    
    for (const file of req.files) {
        const oldPath = file.path;
        
        // Log file details for debugging
        console.log(`📁 Processing file: ${file.originalname}`);
        console.log(`   Temp path: ${oldPath}`);
        console.log(`   File size: ${file.size} bytes`);
        
        // Check if temp file exists and has content
        if (!fs.existsSync(oldPath)) {
            console.error(`❌ Temp file not found: ${oldPath}`);
            continue;
        }
        
        const tempStats = fs.statSync(oldPath);
        if (tempStats.size === 0) {
            console.error(`❌ Temp file is empty: ${oldPath}`);
            continue;
        }
        
        // Create safe filename
        let safeName = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_');
        
        // Format: claim_{claimId}_{safeName}
        const newFilename = `claim_${claimId}_${safeName}`;
        const newPath = path.join(path.dirname(oldPath), newFilename);
        
        try {
            // ✅ FIX: Use copy instead of rename to preserve original
            // First copy the file
            fs.copyFileSync(oldPath, newPath);
            console.log(`✅ Copied: ${file.originalname} -> ${newFilename}`);
            
            // Then delete the temp file
            fs.unlinkSync(oldPath);
            console.log(`🗑️ Deleted temp file: ${file.filename}`);
            
            // Verify the new file has content
            const newStats = fs.statSync(newPath);
            console.log(`✅ New file size: ${newStats.size} bytes`);
            
            documentUrls.push({
                filename: newFilename,
                originalName: file.originalname,
                path: `/uploads/claims/${newFilename}`,
                type: file.mimetype,
                size: file.size,
                uploadedAt: new Date(),
                uploadedBy: hospitalId,
                uploadedByType: 'hospital'
            });
        } catch (copyError) {
            console.error(`❌ Copy failed: ${copyError.message}`);
            // Fallback: use original temp path
            documentUrls.push({
                filename: file.filename,
                originalName: file.originalname,
                path: `/uploads/claims/${file.filename}`,
                type: file.mimetype,
                size: file.size,
                uploadedAt: new Date(),
                uploadedBy: hospitalId,
                uploadedByType: 'hospital'
            });
        }
    }
    
    if (documentUrls.length > 0) {
        await client.query(
            `UPDATE claim 
             SET documents = $1, updated_at = NOW()
             WHERE claim_id = $2`,
            [JSON.stringify(documentUrls), claimId]
        );
        console.log(`✅ Linked ${documentUrls.length} document(s) to claim ${claimId}`);
    }
}
        // 7. Update policy remaining coverage
        const newRemainingCoverage = remainingCoverage - claimAmount;
        const newUsedCoverage = (parseFloat(policy.sum_insured) - newRemainingCoverage);

        await client.query(
            `UPDATE policy 
             SET remaining_coverage = $1,
                 used_coverage = $2,
                 updated_at = NOW()
             WHERE policy_id = $3`,
            [newRemainingCoverage, newUsedCoverage, policyId]
        );

        // Commit transaction
        await client.query('COMMIT');

        // Create notification for customer
        const createNotification = async (userId, userType, type, title, message, relatedId) => {
            try {
                await db.query(
                    `INSERT INTO notifications (user_id, user_type, type, title, message, related_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [userId, userType, type, title, message, relatedId]
                );
            } catch (err) {
                console.error('Notification error:', err.message);
            }
        };

        const formattedAmount = claimAmount.toLocaleString('en-US');
        await createNotification(
            customerId,
            'customer',
            'claim_submitted',
            'Cashless Claim Request Received',
            `A cashless claim request for $${formattedAmount} has been submitted by ${hospitalName}. We will process it shortly.`,
            claimId
        );

        res.status(201).json({
            success: true,
            message: "Claim submitted successfully",
            claimId: claimId,
            claimNumber: `CLM-${claimId}`,
            documents: documentUrls,
            claimDetails: {
                totalTreatmentCost: claimAmount,
                remainingCoverage: newRemainingCoverage
            }
        });

    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackErr) {
                console.error('Rollback error:', rollbackErr);
            }
        }
        console.error('Error submitting claim:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        if (client) {
            try {
                client.release();
            } catch (releaseErr) {
                console.error('Release error:', releaseErr);
            }
        }
    }
});
// ============================================
// GET: Get hospital dashboard stats
// ============================================
// ============================================
// GET: Get hospital dashboard stats
// ============================================
router.get("/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const hospitalId = req.user.id;

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END) as pending_claims,
        COUNT(CASE WHEN LOWER(status) IN ('approved', 'paid') THEN 1 END) as approved_claims,
        COUNT(CASE WHEN LOWER(status) IN ('rejected', 'disapproved') THEN 1 END) as rejected_claims,
        COALESCE(SUM(claim_amount), 0) as total_claimed_amount,
        COALESCE(SUM(insurance_paid), 0) as total_insurance_paid
       FROM claim 
       WHERE hospital_id = $1`,
      [hospitalId]
    );

    // Get recent claims
    const recentClaims = await db.query(
      `SELECT 
        c.claim_id as id,
        c.claim_amount,
        c.status,
        c.filing_date,
        c.diagnosis,
        CONCAT(cust.first_name, ' ', cust.last_name) as patient_name,
        td.treatment_date
       FROM claim c
       LEFT JOIN customer cust ON c.customer_id = cust.customer_id
       LEFT JOIN treatment_detail td ON c.claim_id = td.claim_id
       WHERE c.hospital_id = $1
       ORDER BY c.filing_date DESC
       LIMIT 10`,
      [hospitalId]
    );

    res.json({
      success: true,
      stats: result.rows[0],
      recentClaims: recentClaims.rows
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// ============================================
// HOSPITAL PAYMENT ACCOUNT ROUTES
// ============================================

// Get hospital payout account
router.get("/payment/account", authMiddleware, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    
    const result = await db.query(
      `SELECT 
        id,
        hospital_id,
        account_holder_name,
        bank_name,
        account_number,
        routing_number,
        is_default,
        status,
        created_at,
        updated_at
       FROM hospital_payout_account 
       WHERE hospital_id = $1 AND status = 'active'`,
      [hospitalId]
    );
    
    res.json({
      success: true,
      account: result.rows[0] || null
    });
    
  } catch (error) {
    console.error('Error fetching payout account:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create or update hospital payout account
router.post("/payment/account", authMiddleware, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const { account_holder_name, bank_name, account_number, routing_number } = req.body;
    
    if (!account_holder_name || !bank_name || !account_number) {
      return res.status(400).json({
        success: false,
        message: "Account holder name, bank name, and account number are required"
      });
    }
    
    // Check if account exists
    const existingAccount = await db.query(
      "SELECT id FROM hospital_payout_account WHERE hospital_id = $1",
      [hospitalId]
    );
    
    let result;
    
    if (existingAccount.rows.length > 0) {
      // Update existing account
      result = await db.query(
        `UPDATE hospital_payout_account 
         SET account_holder_name = $1,
             bank_name = $2,
             account_number = $3,
             routing_number = $4,
             updated_at = NOW()
         WHERE hospital_id = $5
         RETURNING *`,
        [account_holder_name, bank_name, account_number, routing_number || null, hospitalId]
      );
    } else {
      // Create new account
      result = await db.query(
        `INSERT INTO hospital_payout_account (
          hospital_id, account_holder_name, bank_name, account_number, routing_number, is_default, status
        ) VALUES ($1, $2, $3, $4, $5, true, 'active')
        RETURNING *`,
        [hospitalId, account_holder_name, bank_name, account_number, routing_number || null]
      );
    }
    
    res.json({
      success: true,
      message: "Payment account saved successfully",
      account: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error saving payout account:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get hospital payment history - WITHOUT Transaction ID column
router.get("/payment/history", authMiddleware, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    
    const result = await db.query(
      `SELECT 
        claim_id,
        patient_name,
        insurance_paid as amount,
        status,
        transfer_status,
        payment_status,
        payment_transfer_date as payment_date,
        filing_date as claim_date,
        deductible_applied,
        co_pay_amount,
        client_responsibility
       FROM claim
       WHERE hospital_id = $1 
         AND insurance_paid IS NOT NULL 
         AND insurance_paid > 0
         AND status IN ('approved', 'paid')
       ORDER BY payment_transfer_date DESC NULLS LAST, filing_date DESC
       LIMIT 100`,
      [hospitalId]
    );
    
    let totalPaid = 0;
    let completedCount = 0;
    
    const payments = result.rows.map(row => {
      const amount = parseFloat(row.amount) || 0;
      const isCompleted = row.transfer_status === 'completed' || row.payment_status === 'completed';
      const paymentDate = row.payment_date ? new Date(row.payment_date).toLocaleDateString() : 
                          (row.transfer_status === 'completed' ? new Date(row.claim_date).toLocaleDateString() : 'N/A');
      
      if (isCompleted) {
        totalPaid += amount;
        completedCount++;
      }
      
      return {
        claim_id: row.claim_id,
        patient_name: row.patient_name || 'N/A',
        amount: amount,
        status: isCompleted ? 'Paid' : 'Processing',
        payment_date: paymentDate,
        deductible_applied: parseFloat(row.deductible_applied) || 0,
        client_responsibility: parseFloat(row.client_responsibility) || 0
      };
    });
    
    const summary = {
      paid_amount: totalPaid,
      total_claims: payments.length,
      completed_payouts: completedCount,
      pending_payouts: payments.length - completedCount,
      pending_amount: 0
    };
    
    res.json({
      success: true,
      payments: payments,
      summary: summary
    });
    
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get payment summary for dashboard - DIRECT FROM CLAIM TABLE
router.get("/payment/summary", authMiddleware, async (req, res) => {
  try {
    const hospitalId = req.user.id;
    
    // Get paid amounts from claim table
    const paidResult = await db.query(
      `SELECT 
        COALESCE(SUM(insurance_paid), 0) as paid_amount,
        COUNT(*) as completed_payouts
       FROM claim
       WHERE hospital_id = $1 
         AND (transfer_status = 'completed' OR payment_status = 'completed')
         AND insurance_paid > 0`,
      [hospitalId]
    );
    
    // Get pending claims (approved but payment not yet completed)
    const pendingResult = await db.query(
      `SELECT 
        COUNT(*) as pending_payouts,
        COALESCE(SUM(insurance_paid), 0) as pending_amount
       FROM claim
       WHERE hospital_id = $1 
         AND status = 'approved'
         AND (transfer_status IS NULL OR transfer_status != 'completed')
         AND insurance_paid > 0`,
      [hospitalId]
    );
    
    // Check if payout account exists
    const accountExists = await db.query(
      "SELECT id FROM hospital_payout_account WHERE hospital_id = $1 AND status = 'active'",
      [hospitalId]
    );
    
    res.json({
      success: true,
      summary: {
        paid_amount: parseFloat(paidResult.rows[0].paid_amount) || 0,
        completed_payouts: parseInt(paidResult.rows[0].completed_payouts) || 0,
        pending_amount: parseFloat(pendingResult.rows[0].pending_amount) || 0,
        pending_payouts: parseInt(pendingResult.rows[0].pending_payouts) || 0
      },
      has_payout_account: accountExists.rows.length > 0
    });
    
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// DEBUG: Check file integrity
router.get('/debug/check-file/:filename', authMiddleware, async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../uploads/claims', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.json({ exists: false, path: filePath });
        }
        
        const stats = fs.statSync(filePath);
        res.json({
            exists: true,
            path: filePath,
            size: stats.size,
            isFile: stats.isFile(),
            created: stats.birthtime,
            modified: stats.mtime
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;