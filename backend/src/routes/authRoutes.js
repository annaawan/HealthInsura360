// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { 
  registerCustomer, 
  registerAgent, 
  registerHospital, 
  registerAdmin,
  login,
  loginHospital,
  verifyToken,
  getProfile,
  requestPasswordReset,    // ADD THIS
  verifyResetToken,        // ADD THIS
  resetPassword,          // ADD THIS
  testEmailEndpoint       // Optional - remove in production
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

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

// Admin registration (protected - only accessible internally)
router.post('/register/admin', registerAdmin);

module.exports = router;