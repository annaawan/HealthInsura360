const db = require('../config/database');

// Submit a claim
exports.submitClaim = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { policyId, claimAmount, description, treatmentDetails } = req.body;
        
        // Verify policy belongs to user
        const policyResult = await db.query(
            'SELECT * FROM policies WHERE policy_id = $1 AND customer_id = $2',
            [policyId, userId]
        );
        
        if (policyResult.rows.length === 0) {
            return res.status(403).json({ error: 'Policy not found or access denied' });
        }
        
        // Create claim
        const claimResult = await db.query(
            `INSERT INTO claims 
             (policy_id, claim_amount, claim_date, description, treatment_details, status)
             VALUES ($1, $2, CURRENT_DATE, $3, $4, 'submitted')
             RETURNING *`,
            [policyId, claimAmount, description, treatmentDetails]
        );
        
        res.status(201).json({
            success: true,
            message: 'Claim submitted successfully',
            claim: claimResult.rows[0]
        });
        
    } catch (error) {
        console.error('Claim error:', error);
        res.status(500).json({ error: 'Failed to submit claim' });
    }
};

// Get user's claims
exports.getUserClaims = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await db.query(
            `SELECT c.*, p.policy_number 
             FROM claims c
             JOIN policies p ON c.policy_id = p.policy_id
             WHERE p.customer_id = $1
             ORDER BY c.claim_date DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            claims: result.rows
        });
        
    } catch (error) {
        console.error('Get claims error:', error);
        res.status(500).json({ error: 'Failed to get claims' });
    }
};