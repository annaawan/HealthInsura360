const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { authMiddleware } = require('../middleware/auth');
const { uploadClaimDocuments } = require('../middleware/upload');

// ============================================
// Test route - no authentication required
// ============================================
router.get('/test', (req, res) => {
    console.log('Claims test route called at', new Date().toISOString());
    res.json({
        success: true,
        message: 'Claim routes working',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Debug auth route - to test authentication
// ============================================
router.get('/debug-auth', authMiddleware, (req, res) => {
    console.log('🔐 Debug auth endpoint hit!');
    res.json({
        success: true,
        message: 'Auth is working!',
        user: req.user
    });
});

// ============================================
// Submit a new reimbursement claim (Customer)
// ============================================
router.post('/submit', 
    authMiddleware, 
    uploadClaimDocuments,
    claimController.submitClaim
);

// ============================================
// Submit cashless claim (Hospital)
// ============================================
router.post('/cashless',
    authMiddleware,
    claimController.submitCashlessClaim
);

// ============================================
// Get user's claims (Customer)
// ============================================
router.get('/my-claims', 
    authMiddleware, 
    claimController.getUserClaims
);

// ============================================
// Get claims for a hospital
// ============================================
router.get('/hospital/:hospitalId', 
    authMiddleware, 
    claimController.getHospitalClaims
);

// ============================================
// Get single claim by ID
// ============================================
router.get('/:id', 
    authMiddleware, 
    claimController.getClaimById
);

module.exports = router;