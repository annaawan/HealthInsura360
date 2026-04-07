const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create directories for different document types
const baseUploadDir = path.join(__dirname, '../../uploads');
const claimsDir = path.join(baseUploadDir, 'claims');
const hospitalDir = path.join(baseUploadDir, 'hospital-documents');
const profilePicsDir = path.join(baseUploadDir, 'profiles');

// Ensure all directories exist
[baseUploadDir, claimsDir, hospitalDir, profilePicsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// ========== CLAIM DOCUMENTS STORAGE ==========
const claimStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, claimsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `claim_${name}_${uniqueSuffix}${ext}`);
  }
});

// ========== HOSPITAL DOCUMENTS STORAGE ==========
const hospitalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, hospitalDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `hospital_${name}_${uniqueSuffix}${ext}`);
  }
});

// ========== PROFILE PICTURES STORAGE ==========
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const userId = req.user?.userId || req.user?.id || 'user';
    cb(null, `profile_${userId}_${uniqueSuffix}${ext}`);
  }
});

// File filter for all document types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX`));
  }
};

// Create multer instances
const uploadClaim = multer({
  storage: claimStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const uploadHospital = multer({
  storage: hospitalStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Profile picture upload instance
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: (req, file, cb) => {
    const allowedImageMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Profile pictures must be JPG, PNG, or GIF`));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ========== NEW: Multi-field hospital document upload ==========
// This handles multiple different fields like license, registration, tax, etc.
const uploadHospitalFields = uploadHospital.fields([
  { name: 'license', maxCount: 1 },
  { name: 'registration', maxCount: 1 },
  { name: 'tax', maxCount: 1 },
  { name: 'certificate', maxCount: 5 },
  { name: 'other', maxCount: 10 },
  { name: 'documents', maxCount: 10 } // For backward compatibility
]);

// ========== FIXED: Helper functions with proper URLs ==========
const getBaseUrl = () => {
  return process.env.BASE_URL || 'http://localhost:5000';
};

const getDocumentPath = (filename, type = 'hospital') => {
  if (!filename) return null;
  
  switch(type) {
    case 'claim':
      return `${getBaseUrl()}/uploads/claims/${filename}`;
    case 'hospital':
      return `${getBaseUrl()}/uploads/hospital-documents/${filename}`;
    case 'profile':
      return `${getBaseUrl()}/uploads/profiles/${filename}`;
    default:
      return `${getBaseUrl()}/uploads/hospital-documents/${filename}`;
  }
};

// Helper function to get file information with URL
const getFileInfo = (file, type = 'hospital') => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: getDocumentPath(file.filename, type)
  };
};

// Delete document function
const deleteDocument = (filename, type = 'claim') => {
  try {
    let filePath;
    switch(type) {
      case 'claim':
        filePath = path.join(claimsDir, filename);
        break;
      case 'hospital':
        filePath = path.join(hospitalDir, filename);
        break;
      case 'profile':
        filePath = path.join(profilePicsDir, filename);
        break;
      default:
        filePath = path.join(claimsDir, filename);
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted file: ${filename}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error deleting file ${filename}:`, error);
    return false;
  }
};

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Export middleware and helpers
module.exports = {
  // For claim documents (customer claims)
  uploadClaimDocuments: uploadClaim.array('documents', 10),
  
  // For hospital documents - SINGLE FIELD (multiple files)
  uploadHospitalDocuments: uploadHospital.array('documents', 5),
  
  // NEW: For hospital documents - MULTIPLE FIELDS
  uploadHospitalDocumentFields: uploadHospitalFields,
  
  // For profile pictures
  uploadProfilePicture: uploadProfile.single('profilePicture'),
  
  // Helper functions
  getClaimDocumentPath: (filename) => getDocumentPath(filename, 'claim'),
  getHospitalDocumentPath: (filename) => getDocumentPath(filename, 'hospital'),
  getProfilePicturePath: (filename) => getDocumentPath(filename, 'profile'),
  
  // NEW: Generic helper
  getDocumentPath,
  getFileInfo,
  handleUploadError,
  
  deleteDocument
};