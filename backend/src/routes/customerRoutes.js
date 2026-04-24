const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const policyController = require('../controllers/policyController');
const claimController = require('../controllers/claimController');
const authController = require('../controllers/authController');
const notificationController = require('../controllers/notificationController');
const upload = require('../middleware/upload');

// ==================== POLICY ROUTES ====================
router.get('/policies/my-policies', authMiddleware, policyController.getMyPolicies);
router.get('/insurance-plans', authMiddleware, policyController.getInsurancePlans);
router.post('/policies/purchase', authMiddleware, policyController.purchasePolicy);
router.post('/policies/renew', authMiddleware, policyController.renewPolicy);

// ==================== CLAIM ROUTES ====================
router.get('/claims/my-claims', authMiddleware, claimController.getMyClaims);
router.post('/claims/submit', authMiddleware, upload.array('documents', 10), claimController.submitClaim);

// ==================== PROFILE ROUTES ====================
router.get('/auth/profile', authMiddleware, authController.getProfile);
router.put('/profile/update', authMiddleware, upload.single('profilePicture'), authController.updateProfile);
router.delete('/profile/picture', authMiddleware, authController.deleteProfilePicture);

// ==================== NOTIFICATION ROUTES ====================
router.get('/notifications', authMiddleware, notificationController.getNotifications);
router.put('/notifications/:id/read', authMiddleware, notificationController.markAsRead);
router.put('/notifications/read-all', authMiddleware, notificationController.markAllAsRead);
router.delete('/notifications/:id', authMiddleware, notificationController.deleteNotification);

module.exports = router;