const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.post('/submit', authenticate, claimController.submitClaim);
router.get('/my-claims', authenticate, claimController.getUserClaims);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Claim routes working' });
});

module.exports = router;