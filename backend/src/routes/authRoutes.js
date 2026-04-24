// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  registerCustomer, 
  registerAgent, 
  registerHospital, 
  registerAdmin,
  login,
  loginHospital,
  verifyToken,
  getProfile,
  updateProfile,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  testEmailEndpoint
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// ========== MULTER CONFIGURATION FOR PROFILE PICTURE UPLOADS ==========

// Ensure uploads directory exists
const fs = require('fs');
const uploadDir = 'uploads/profiles/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadDir);
}

// Configure storage for profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    // Get user ID from authenticated request
    const userId = req.user?.userId || req.user?.id || Date.now();
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile_${userId}_${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'));
  }
};

// Create multer upload instance
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

console.log('✅ Multer configured for profile picture uploads');

// ========== PUBLIC ROUTES ==========

// Registration routes
router.post('/register/customer', registerCustomer);
router.post('/register/agent', registerAgent);
router.post('/register/hospital', registerHospital);

// Login routes
router.post('/login', login);
router.post('/login/hospital', loginHospital);

// Password reset routes
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Test email route (remove in production)
// router.post('/test-email', testEmailEndpoint);

// Token verification
router.get('/verify', verifyToken);

// ========== PROTECTED ROUTES ==========

// User profile
router.get('/profile', authMiddleware, getProfile);
// ✅ UPDATED: Added multer middleware for file upload
router.put('/profile', authMiddleware, upload.single('profilePicture'), updateProfile);

// Admin registration (protected - only accessible internally)
router.post('/register/admin', registerAdmin);
// ========== PROFILE PICTURE MANAGEMENT ==========

// Delete profile picture
router.delete('/profile/picture', authMiddleware, async (req, res) => {
    try {
        const { userId, userType } = req.user;
        
        if (userType !== 'customer') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only customers can delete profile pictures' 
            });
        }
        
        const db = require('../config/database');
        
        // Get current profile picture path to delete the file
        const currentResult = await db.query(
            `SELECT profile_picture FROM customer WHERE customer_id = $1`,
            [userId]
        );
        
        const currentPicture = currentResult.rows[0]?.profile_picture;
        
        // Delete the physical file if it exists
        if (currentPicture) {
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', currentPicture);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted profile picture: ${filePath}`);
            }
        }
        
        // Update database to remove profile_picture
        await db.query(
            `UPDATE customer 
             SET profile_picture = NULL, updated_at = NOW()
             WHERE customer_id = $1`,
            [userId]
        );
        
        console.log(`✅ Profile picture deleted for customer ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'Profile picture removed successfully' 
        });
        
    } catch (error) {
        console.error('Delete profile picture error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete profile picture' 
        });
    }
});
module.exports = router;