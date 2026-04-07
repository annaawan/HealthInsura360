const db = require('../config/database');

// Submit a comprehensive reimbursement claim (Customer)
exports.submitClaim = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'User not authenticated' 
            });
        }
        
        // Extract claim data
        const {
            policy_id,
            claim_type = 'reimbursement',
            patient_name,
            patient_dob,
            patient_contact,
            insured_name,
            insured_relation,
            hospital_name,
            provider_name,
            diagnosis,
            service_date,
            admission_date,
            discharge_date,
            claim_amount,
            claim_date,
            description,
            reason_for_claim,
            bank_account_number,
            ifsc_code,
            bank_name,
            account_holder_name,
            cpt_codes,
            icd_codes
        } = req.body;
        
        // Validate required fields
        if (!policy_id || !claim_amount || !patient_name || !hospital_name) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: policy_id, claim_amount, patient_name, hospital_name' 
            });
        }

        // Handle document uploads
        let documentUrls = [];
        if (req.files && req.files.length > 0) {
            documentUrls = req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                path: `/uploads/claims/${file.filename}`,
                type: file.mimetype,
                size: file.size,
                uploadedAt: new Date()
            }));
        }
        
        // Generate claim number
        const claimNumber = 'CLM' + Date.now();
        
        // ✅ Insert into claims table (customer reimbursement claims)
        const claimResult = await db.query(
            `INSERT INTO claims 
             (
                claim_number, customer_id, policy_id, claim_type, patient_name, 
                patient_dob, patient_contact, insured_name, insured_relation, 
                hospital_name, provider_name, diagnosis, service_date, 
                admission_date, discharge_date, amount, claim_date, description, 
                reason_for_claim, bank_account_number, ifsc_code, bank_name, 
                account_holder_name, cpt_codes, icd_codes, documents, status, 
                created_at, updated_at
             )
             VALUES 
             ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
              $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'pending', NOW(), NOW())
             RETURNING *`,
            [
                claimNumber, userId, policy_id, claim_type, patient_name,
                patient_dob || null, patient_contact, insured_name || null, 
                insured_relation || null, hospital_name, provider_name || null,
                diagnosis || null, service_date || null, admission_date || null,
                discharge_date || null, claim_amount, claim_date || new Date(),
                description || null, reason_for_claim || null, bank_account_number || null,
                ifsc_code || null, bank_name || null, account_holder_name || null,
                cpt_codes || null, icd_codes || null, JSON.stringify(documentUrls)
            ]
        );
        
        console.log(`✅ Reimbursement claim submitted successfully: ${claimNumber}`);
        console.log(`   Documents uploaded: ${documentUrls.length}`);
        
        res.status(201).json({
            success: true,
            message: 'Claim submitted successfully',
            claim: claimResult.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Claim submission error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit claim: ' + error.message 
        });
    }
};


// ============================================
// Submit Cashless Claim (Hospital) - FINAL FIXED VERSION
// ============================================
exports.submitCashlessClaim = async (req, res) => {
    try {
        // Get hospital ID from token
        const hospitalId = req.user?.id || req.user?.userId;
        const userType = req.user?.role || req.user?.userType;

        console.log('🔍 Token user data:', req.user);
        console.log('🏥 Hospital ID:', hospitalId);
        console.log('👤 User Type:', userType);

        // Verify this is a hospital user
        if (userType !== 'hospital') {
            return res.status(403).json({
                success: false,
                message: 'Only hospitals can submit cashless claims'
            });
        }

        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'Hospital ID not found. Please login again.'
            });
        }

        const {
            policyId,
            diagnosis,
            treatmentDescription,
            doctorName,
            treatmentDate,
            treatmentCost,
            documents
        } = req.body;

        console.log('📋 Cashless claim data:', { policyId, diagnosis, treatmentCost });

        // Validate required fields
        if (!policyId || !diagnosis || !treatmentDescription || !doctorName || !treatmentDate || !treatmentCost) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // ✅ Get customer_id from policies table (plural) using 'id' column
        const policyResult = await db.query(
            'SELECT customer_id FROM policies WHERE id = $1',
            [policyId]
        );

        if (policyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Policy with ID ${policyId} not found in policies table`
            });
        }

        const customerId = policyResult.rows[0].customer_id;

        // Get customer name for patient_name
        const customerResult = await db.query(
            'SELECT first_name, last_name FROM customer WHERE customer_id = $1',
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const patientName = `${customerResult.rows[0].first_name} ${customerResult.rows[0].last_name}`;

        // Start transaction
        await db.query('BEGIN');

        // ✅ Insert into claim table (policy_id now matches the foreign key)
        const claimResult = await db.query(
            `INSERT INTO claim (
                policy_id,
                customer_id,
                hospital_id,
                claim_type,
                claim_amount,
                status,
                filing_date,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING claim_id`,
            [
                policyId,
                customerId,
                hospitalId,
                'cashless',
                treatmentCost,
                'pending'
            ]
        );

        const claimId = claimResult.rows[0].claim_id;
        console.log('✅ Cashless claim created with ID:', claimId);

        // Insert into treatment_detail table
        await db.query(
            `INSERT INTO treatment_detail (
                claim_id,
                diagnosis,
                treatment_description,
                doctor_name,
                treatment_cost,
                treatment_date
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                claimId,
                diagnosis,
                treatmentDescription,
                doctorName,
                treatmentCost,
                treatmentDate
            ]
        );
        console.log('✅ Treatment details saved to treatment_detail table');

        // Commit the transaction
        await db.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Cashless claim submitted successfully!',
            claimId: claimId
        });

    } catch (error) {
        console.error('❌ Error submitting cashless claim:', error);
        
        // Rollback if error occurred
        try {
            await db.query('ROLLBACK');
        } catch (rollbackError) {
            console.log('Rollback error:', rollbackError);
        }
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================
// Get Hospital's Claims - UPDATED
// ============================================
exports.getHospitalClaims = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const authHospitalId = req.user?.id || req.user?.userId;

        console.log('📋 Fetching claims for hospital:', hospitalId);

        // ✅ Query using policies table with id column
        const result = await db.query(
            `SELECT 
                c.claim_id as id,
                c.policy_id,
                c.customer_id,
                c.hospital_id,
                c.claim_type,
                c.claim_amount as treatment_cost,
                c.status,
                c.filing_date as created_at,
                td.diagnosis,
                td.treatment_description,
                td.doctor_name,
                td.treatment_date,
                td.treatment_cost,
                CONCAT(cu.first_name, ' ', cu.last_name) as patient_name,
                cu.email as patient_email,
                cu.phone as patient_phone,
                pol.policy_number
            FROM claim c
            LEFT JOIN treatment_detail td ON c.claim_id = td.claim_id
            LEFT JOIN customer cu ON c.customer_id = cu.customer_id
            LEFT JOIN policies pol ON c.policy_id = pol.id  -- ✅ Using policies table with id
            WHERE c.hospital_id = $1
            ORDER BY c.filing_date DESC`,
            [hospitalId]
        );

        console.log(`✅ Retrieved ${result.rows.length} claims for hospital ${hospitalId}`);

        const claims = result.rows.map(row => ({
            id: row.id,
            patientName: row.patient_name || 'Unknown Patient',
            patientEmail: row.patient_email,
            patientPhone: row.patient_phone,
            diagnosis: row.diagnosis || 'Not specified',
            treatmentDescription: row.treatment_description || 'Not specified',
            doctorName: row.doctor_name || 'Not specified',
            treatmentDate: row.treatment_date,
            treatmentCost: parseFloat(row.treatment_cost) || 0,
            status: row.status,
            claimType: row.claim_type,
            createdAt: row.created_at,
            policyNumber: row.policy_number
        }));

        res.json({
            success: true,
            claims: claims,
            count: claims.length
        });

    } catch (error) {
        console.error('❌ Get hospital claims error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get claims: ' + error.message
        });
    }
};

// ============================================
// Get User's Claims (Customer)
// ============================================
exports.getUserClaims = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Unauthorized' 
            });
        }
        
        // Get reimbursement claims from claims table
        const result = await db.query(
            `SELECT * FROM claims 
             WHERE customer_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );
        
        console.log(`✅ Retrieved ${result.rows.length} reimbursement claims for customer ${userId}`);
        
        const claims = result.rows.map(claim => {
            let documents = [];
            if (claim.documents) {
                try {
                    if (typeof claim.documents === 'object') {
                        documents = claim.documents;
                    } else if (typeof claim.documents === 'string') {
                        documents = JSON.parse(claim.documents);
                    }
                } catch (e) {
                    documents = [];
                }
            }
            
            return {
                ...claim,
                amount: parseFloat(claim.amount) || 0,
                claim_amount: parseFloat(claim.amount) || 0,
                documents: documents
            };
        });
        
        res.json({
            success: true,
            claims: claims,
            count: claims.length
        });
        
    } catch (error) {
        console.error('❌ Get claims error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get claims: ' + error.message 
        });
    }
};

// ============================================
// Get Single Claim by ID
// ============================================
exports.getClaimById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        
        // First try to get from claims table (reimbursement)
        let result = await db.query(
            `SELECT * FROM claims 
             WHERE id = $1 AND customer_id = $2`,
            [id, userId]
        );
        
        // If not found, try from claim table (cashless)
        if (result.rows.length === 0) {
            result = await db.query(
                `SELECT 
                    c.*,
                    td.diagnosis,
                    td.treatment_description,
                    td.doctor_name,
                    td.treatment_date,
                    CONCAT(cu.first_name, ' ', cu.last_name) as patient_name
                 FROM claim c
                 LEFT JOIN treatment_detail td ON c.claim_id = td.claim_id
                 LEFT JOIN customer cu ON c.customer_id = cu.customer_id
                 WHERE c.claim_id = $1 AND c.customer_id = $2`,
                [id, userId]
            );
        }
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Claim not found'
            });
        }
        
        const claim = result.rows[0];
        
        // Parse documents if present
        if (claim.documents && typeof claim.documents === 'string') {
            claim.documents = JSON.parse(claim.documents);
        }
        
        res.json({
            success: true,
            claim
        });
        
    } catch (error) {
        console.error('❌ Get claim error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get claim' 
        });
    }
};

