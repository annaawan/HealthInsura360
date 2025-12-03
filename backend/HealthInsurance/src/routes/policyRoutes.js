const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authenticate } = require('../middleware/auth');

// Public
router.get('/plans', policyController.getPlans);

// Protected
router.get('/my-policies', authenticate, policyController.getUserPolicies);
router.post('/purchase', authenticate, policyController.purchasePolicy);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Policy routes working' });
});

module.exports = router;