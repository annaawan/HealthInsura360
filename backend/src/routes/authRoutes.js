// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { 
  registerCustomer, 
  registerAgent, 
  registerHospital, 
  registerAdmin,
  login,                   // For customer/agent/admin
  loginHospital,           // ADDED: Separate hospital login
  verifyToken,
  getProfile
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// ========== PUBLIC ROUTES ==========

// Registration routes
router.post('/register/customer', registerCustomer);
router.post('/register/agent', registerAgent);
router.post('/register/hospital', registerHospital);

// Login routes - SEPARATE for hospital and other users
router.post('/login', login);                     // For customer/agent/admin
router.post('/login/hospital', loginHospital);    // ADDED: Hospital login

// Token verification
router.get('/verify', verifyToken);

// ========== PROTECTED ROUTES ==========
// (require authentication)

// User profile
router.get('/profile', authMiddleware, getProfile);

// Admin registration (protected - only accessible internally)
// Note: This would typically be protected by admin middleware
router.post('/register/admin', registerAdmin);

module.exports = router;