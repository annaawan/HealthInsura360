// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { 
  registerCustomer, 
  registerAgent, 
  registerHospital, 
  registerAdmin,
  login,
  verifyToken,
  getProfile
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.post('/register/customer', registerCustomer);
router.post('/register/agent', registerAgent);
router.post('/register/hospital', registerHospital);
router.post('/login', login);
router.get('/verify', verifyToken);

// Protected routes (require authentication)
router.get('/profile', authMiddleware, getProfile);

// Admin registration (protected - only accessible internally)
// Note: This would typically be protected by admin middleware
router.post('/register/admin', registerAdmin);

module.exports = router;