const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadHospitalDocuments, getDocumentPath } = require('../middleware/upload');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/emailService');
const { generateRegistrationNumber } = require('../utils/registrationGenerator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ----------------------------------------
// GET: Fetch all hospitals
// ----------------------------------------
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM hospital ORDER BY hospital_id DESC");
    res.json(result.rows);
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
// PUT: Approve hospital with registration number (PROTECTED ROUTE)
// ----------------------------------------
router.put("/approve/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || 1;

  console.log('🔐 Approve hospital request received for ID:', id);
  console.log('👤 Admin user:', req.user);

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

    // Send approval email
    try {
      const { sendApprovalEmail } = require('../utils/emailService');
      await sendApprovalEmail(hospital.email, hospital.name, registrationNumber);
      console.log('✅ Approval email sent to:', hospital.email);
    } catch (emailErr) {
      console.warn('⚠️ Email sending failed:', emailErr.message);
    }

    res.json({ 
      success: true, 
      message: "Hospital approved successfully. Notification email sent.",
      hospital: updateResult.rows[0],
      emailStatus: 'sent'
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

    // Send rejection email
    sendRejectionEmail(hospital.email, hospital.name, reason)
      .catch(err => console.error('Email sending failed:', err));

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

// ----------------------------------------
// GET: Fetch single hospital by ID
// ----------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM hospital WHERE hospital_id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }

    res.json({ success: true, hospital: result.rows[0] });
  } catch (err) {
    console.error("Error fetching hospital:", err);
    res.status(500).json({ success: false, error: "Server error" });
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
      process.env.JWT_SECRET || 'your-secret-key-change-this',
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

// TEMPORARY DEBUG ROUTE - Test authentication
router.get("/test-auth", authMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Authentication working!', 
    user: req.user 
  });
});

// ============================================
// GET: Get hospital by ID (for dashboard)
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT 
        hospital_id as id,
        name,
        email,
        registration_number,
        phone,
        city
       FROM hospital 
       WHERE hospital_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Hospital not found" 
      });
    }

    res.json({
      success: true,
      hospital: result.rows[0]
    });
  } catch (err) {
    console.error("Error fetching hospital:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// ============================================
// GET: Get hospital claims (FIXED ENDPOINT)
// ============================================
router.get("/:id/claims", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Fetching claims for hospital ID: ${id}`);
    
    // Try to get claims from database
    let result;
    
    try {
      // Try the claim table structure
      result = await db.query(
        `SELECT 
          c.claim_id as id,
          c.claim_type,
          c.claim_amount as treatment_cost,
          c.approved_amount,
          c.status,
          c.filing_date as created_at,
          c.diagnosis,
          c.treatment_description,
          c.doctor_name,
          c.treatment_date,
          c.documents,
          p.policy_number,
          CONCAT(cust.first_name, ' ', cust.last_name) as patient_name,
          cust.email as patient_email
         FROM claim c
         LEFT JOIN policy p ON c.policy_id = p.policy_id
         LEFT JOIN customer cust ON c.customer_id = cust.customer_id
         WHERE c.hospital_id = $1
         ORDER BY c.filing_date DESC`,
        [id]
      );
      
      console.log(`✅ Found ${result.rows.length} claims for hospital ${id}`);
      
    } catch (dbError) {
      console.log("⚠️ Error querying claims table:", dbError.message);
      // Return empty array if table doesn't exist
      result = { rows: [] };
    }

    // Format the claims for the frontend
    const claims = result.rows.map(row => ({
      id: row.id,
      patientName: row.patient_name || 'Unknown Patient',
      patientEmail: row.patient_email,
      diagnosis: row.diagnosis || 'Not specified',
      treatmentDescription: row.treatment_description || 'Not specified',
      doctorName: row.doctor_name || 'Not specified',
      treatmentDate: row.treatment_date || row.created_at,
      treatmentCost: parseFloat(row.treatment_cost) || 0,
      status: row.status || 'pending',
      policyNumber: row.policy_number,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      claims: claims
    });

  } catch (error) {
    console.error('❌ Error fetching hospital claims:', error);
    // Return empty array instead of error
    res.status(200).json({
      success: true,
      claims: [],
      message: 'No claims found'
    });
  }
});

// ============================================
// POST: Submit cashless claim
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

    // Validate required fields
    if (!policyId || !diagnosis || !treatmentDescription || !doctorName || !treatmentDate || !treatmentCost) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get customer ID from policy
    const policyResult = await db.query(
      'SELECT customer_id FROM policy WHERE policy_id = $1',
      [policyId]
    );

    if (policyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    const customerId = policyResult.rows[0].customer_id;

    // Insert claim
    const result = await db.query(
      `INSERT INTO claim (
        policy_id,
        customer_id,
        hospital_id,
        claim_type,
        claim_amount,
        diagnosis,
        treatment_description,
        doctor_name,
        treatment_date,
        documents,
        status,
        filing_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING claim_id as id`,
      [
        policyId,
        customerId,
        hospitalId,
        'cashless',
        treatmentCost,
        diagnosis,
        treatmentDescription,
        doctorName,
        treatmentDate,
        JSON.stringify(documents || []),
        'pending'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully',
      claimId: result.rows[0].id
    });

  } catch (error) {
    console.error('Error submitting claim:', error);
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
    
    // Get all claims for this hospital
    const result = await db.query(
      `SELECT 
        c.claim_id,
        c.claim_type,
        c.claim_amount,
        c.approved_amount,
        c.status,
        c.filing_date,
        c.diagnosis,
        c.treatment_description,
        c.treatment_date,
        CONCAT(cust.first_name, ' ', cust.last_name) as patient_name,
        p.policy_number
       FROM claim c
       LEFT JOIN customer cust ON c.customer_id = cust.customer_id
       LEFT JOIN policy p ON c.policy_id = p.policy_id
       WHERE c.hospital_id = $1
       ORDER BY c.filing_date DESC`,
      [id]
    );

    res.json({
      success: true,
      report: {
        generatedAt: new Date(),
        hospitalId: id,
        totalClaims: result.rows.length,
        claims: result.rows
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;