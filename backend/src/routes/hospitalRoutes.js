const express = require('express');
const router = express.Router();
const db = require('../config/database'); // This is correct, use 'db' not 'pool'
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/hospital-documents/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'hospital-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadHospitalDocuments = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed'));
    }
  }
}).array('documents', 10); // Max 10 files

// Helper function to get document path
const getDocumentPath = (filename) => {
  return `/uploads/hospital-documents/${filename}`;
};

// ----------------------------------------
// GET: Fetch all hospitals
// ----------------------------------------
router.get("/hospitals", async (req, res) => {
  try {
    // FIXED: Changed 'pool' to 'db' and 'id' to 'hospital_id'
    const result = await db.query(`
      SELECT 
        hospital_id as id,
        name,
        email,
        phone,
        registration_number,
        street,
        city,
        state,
        zipcode,
        created_at,
        verified_status,
        verified_at,
        contact_person,
        specialization,
        status::text as status,
        updated_at
      FROM hospital 
      ORDER BY hospital_id DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("Error fetching hospitals:", err);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      message: err.message 
    });
  }
});

// ----------------------------------------
// GET: Fetch single hospital by ID
// ----------------------------------------
router.get("/hospitals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        hospital_id as id,
        name,
        email,
        phone,
        registration_number,
        street,
        city,
        state,
        zipcode,
        created_at,
        verified_status,
        verified_at,
        contact_person,
        specialization,
        status::text as status,
        updated_at
      FROM hospital 
      WHERE hospital_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error fetching hospital:", err);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      message: err.message 
    });
  }
});

// ----------------------------------------
// POST: Upload hospital documents (Integrated with document table)
// ----------------------------------------
router.post("/hospitals/:id/documents", authMiddleware, (req, res) => {
  uploadHospitalDocuments(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'Upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const { id } = req.params;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded"
        });
      }

      // Check if hospital exists
      const hospitalCheck = await db.query(
        'SELECT hospital_id, name FROM hospital WHERE hospital_id = $1',
        [id]
      );
      
      if (hospitalCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      // Save each document to the existing document table
      const savedDocuments = [];
      
      for (const file of req.files) {
        const fileUrl = getDocumentPath(file.filename);
        
        const result = await db.query(
          `INSERT INTO document 
           (hospital_id, file_name, file_url, document_type, uploaded_at, uploaded_by, uploaded_by_type)
           VALUES ($1, $2, $3, $4, NOW(), $5, $6)
           RETURNING document_id, file_name, file_url, document_type, uploaded_at`,
          [
            id,
            file.originalname,
            fileUrl,
            req.body.document_type || 'hospital_document', // Allow passing document type
            req.user?.userId || null,
            req.user?.userType || 'hospital'
          ]
        );
        
        savedDocuments.push({
          ...result.rows[0],
          file_size: file.size,
          mimetype: file.mimetype
        });
      }

      // Log audit
      await db.query(
        `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, detail, timestamp)
         VALUES ($1, $2, 'upload_documents', 'hospital', $3, $4, NOW())`,
        [
          req.user?.userType || 'system', 
          req.user?.userId || 0, 
          id, 
          `Uploaded ${savedDocuments.length} document(s) for hospital: ${hospitalCheck.rows[0].name}`
        ]
      );

      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${savedDocuments.length} document(s)`,
        documents: savedDocuments
      });

    } catch (error) {
      console.error('Error saving hospital documents:', error);
      res.status(500).json({
        success: false,
        message: 'Error saving document information',
        error: error.message
      });
    }
  });
});

// ----------------------------------------
// GET: Fetch all documents for a hospital
// ----------------------------------------
router.get("/hospitals/:id/documents", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        document_id,
        file_name,
        file_url,
        document_type,
        TO_CHAR(uploaded_at, 'YYYY-MM-DD HH24:MI:SS') as uploaded_at,
        uploaded_by,
        uploaded_by_type
      FROM document
      WHERE hospital_id = $1 AND (is_deleted = false OR is_deleted IS NULL)
      ORDER BY uploaded_at DESC`,
      [id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      documents: result.rows
    });
  } catch (error) {
    console.error('Error fetching hospital documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message
    });
  }
});

// ----------------------------------------
// DELETE: Delete a hospital document
// ----------------------------------------
router.delete("/documents/:documentId", authMiddleware, async (req, res) => {
  const { documentId } = req.params;

  try {
    // First get the document info
    const docResult = await db.query(
      'SELECT file_name, file_url FROM document WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Soft delete - mark as deleted
    const result = await db.query(
      `UPDATE document 
       SET is_deleted = true 
       WHERE document_id = $1
       RETURNING document_id`,
      [documentId]
    );

    // Optionally delete the physical file
    try {
      const fileName = docResult.rows[0].file_url.split('/').pop();
      const filePath = path.join(__dirname, '../uploads/hospital-documents/', fileName);
      
      if (require('fs').existsSync(filePath)) {
        require('fs').unlinkSync(filePath);
        console.log(`✅ Deleted physical file: ${fileName}`);
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
      // Continue even if file deletion fails
    }

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, detail, timestamp)
       VALUES ($1, $2, 'delete_document', 'hospital_document', $3, $4, NOW())`,
      [
        req.user?.userType || 'system', 
        req.user?.userId || 0, 
        documentId,
        `Deleted document: ${docResult.rows[0].file_name}`
      ]
    );

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message
    });
  }
});

// ----------------------------------------
// PUT: Update hospital status (verify / reject)
// ----------------------------------------
router.put("/hospitals/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ 
      success: false,
      error: "Status is required" 
    });
  }

  try {
    // FIXED: Changed 'pool' to 'db' and 'id' to 'hospital_id'
    const result = await db.query(
      `UPDATE hospital 
       SET status = $1::hospital_status, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE hospital_id = $2
       RETURNING hospital_id, status::text`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.json({ 
      success: true, 
      message: "Hospital status updated successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error updating hospital status:", err);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      message: err.message 
    });
  }
});

// ----------------------------------------
// PUT: Update hospital verified status
// ----------------------------------------
router.put("/hospitals/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { verified_status } = req.body;

  if (verified_status === undefined) {
    return res.status(400).json({ 
      success: false,
      error: "Verified status is required" 
    });
  }

  try {
    const result = await db.query(
      `UPDATE hospital 
       SET verified_status = $1,
           verified_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE hospital_id = $2
       RETURNING hospital_id, verified_status`,
      [verified_status === true || verified_status === 'true', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.json({ 
      success: true, 
      message: `Hospital ${result.rows[0].verified_status ? 'verified' : 'unverified'} successfully`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error updating hospital verified status:", err);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      message: err.message 
    });
  }
});

// ----------------------------------------
// DELETE: Remove hospital
// ----------------------------------------
router.delete("/hospitals/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete - just mark as deleted
    const result = await db.query(
      `UPDATE hospital 
       SET is_deleted = true, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE hospital_id = $1
       RETURNING hospital_id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Log audit
    await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ($1, $2, 'delete', 'hospital', $3, NOW())`,
      [req.user.userType, req.user.userId, id]
    );

    res.json({ 
      success: true, 
      message: "Hospital deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting hospital:", err);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      message: err.message 
    });
  }
});

module.exports = router;