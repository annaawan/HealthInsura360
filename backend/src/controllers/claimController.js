const db = require('../config/database');
const { createNotification } = require('../routes/notificationRoutes');
const fs = require('fs');
const path = require('path');

exports.submitClaim = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'User not authenticated' 
            });
        }
        
        console.log('📋 Claim submission received:');
        console.log('   userId:', userId);
        console.log('   req.body:', req.body);
        console.log('   req.files:', req.files ? req.files.length : 0);
        
        const {
            policy_id,
            claim_type = 'reimbursement',
            patient_name,
            hospital_name,
            diagnosis,
            service_date,
            claim_amount,
            description,
            reason_for_claim
        } = req.body;
        
        if (!policy_id || !claim_amount) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: policy_id and claim_amount are required' 
            });
        }

        // Verify policy
        const policyCheck = await db.query(
            `SELECT policy_id, remaining_coverage FROM policy 
             WHERE policy_id = $1 AND customer_id = $2 AND status = 'active'`,
            [policy_id, userId]
        );
        
        if (policyCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Active policy not found'
            });
        }
        
        const policy = policyCheck.rows[0];
        const claimAmountNum = parseFloat(claim_amount);
        
        if (claimAmountNum > policy.remaining_coverage) {
            return res.status(400).json({
                success: false,
                error: `Claim amount exceeds remaining coverage of $${policy.remaining_coverage}`
            });
        }

        // ============================================
        // STEP 1: INSERT CLAIM FIRST TO GET CLAIM_ID
        // ============================================
        const claimResult = await db.query(
            `INSERT INTO claim (
                policy_id, customer_id, claim_type, claim_amount, status,
                filing_date, patient_name, hospital_name, diagnosis,
                service_date, description, reason_for_claim, updated_at
            ) VALUES ($1, $2, $3, $4, 'pending', NOW(), $5, $6, $7, $8, $9, $10, NOW())
            RETURNING claim_id`,
            [
                policy_id, userId, claim_type, claimAmountNum,
                patient_name || null, hospital_name || null,
                diagnosis || null, service_date || null,
                description || null, reason_for_claim || null
            ]
        );
        
        const claimId = claimResult.rows[0].claim_id;
        const claimNumber = 'CLM-' + claimId;
        
        console.log(`✅ Claim ${claimNumber} created with ID: ${claimId}`);

        // ============================================
        // STEP 2: PROCESS AND RENAME UPLOADED FILES
        // ============================================
        let documentUrls = [];
        
        if (req.files && req.files.length > 0) {
            console.log(`📄 Processing ${req.files.length} uploaded files...`);
            
            for (const file of req.files) {
                const oldPath = file.path;
                // Get file extension
                const ext = path.extname(file.originalname);
                // Create safe filename (remove special characters, spaces)
                let safeName = file.originalname
                    .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace special chars with underscore
                    .replace(/_+/g, '_');              // Replace multiple underscores with single
                
                // Create new filename: claim_{claimId}_{originalname}
                const newFilename = `claim_${claimId}_${safeName}`;
                const newPath = path.join(path.dirname(oldPath), newFilename);
                
                try {
                    // Rename the file
                    fs.renameSync(oldPath, newPath);
                    console.log(`   ✅ Renamed: ${file.originalname} -> ${newFilename}`);
                    
                    documentUrls.push({
                        filename: newFilename,
                        originalName: file.originalname,
                        path: `/uploads/claims/${newFilename}`,
                        type: file.mimetype,
                        size: file.size,
                        uploadedAt: new Date()
                    });
                } catch (renameError) {
                    console.error(`   ❌ Rename failed: ${renameError.message}`);
                    // Fallback: use original filename
                    documentUrls.push({
                        filename: file.filename,
                        originalName: file.originalname,
                        path: `/uploads/claims/${file.filename}`,
                        type: file.mimetype,
                        size: file.size,
                        uploadedAt: new Date()
                    });
                }
            }
        }
        
        console.log(`📄 Saving ${documentUrls.length} document reference(s)`);

        // ============================================
        // STEP 3: UPDATE CLAIM WITH DOCUMENTS
        // ============================================
        if (documentUrls.length > 0) {
            await db.query(
                `UPDATE claim 
                 SET documents = $1, updated_at = NOW()
                 WHERE claim_id = $2`,
                [JSON.stringify(documentUrls), claimId]
            );
            console.log(`✅ Linked ${documentUrls.length} document(s) to claim ${claimId}`);
        }
        
        // Create notification
        const formattedAmount = claimAmountNum.toLocaleString();
        
        await createNotification(
            userId,
            'customer',
            'claim_submitted',
            'Claim Submitted Successfully',
            `Your claim #${claimNumber} for $${formattedAmount} has been submitted successfully.`,
            claimId
        ).catch(err => console.log('Notification error:', err.message));
        
        res.status(201).json({
            success: true,
            message: 'Claim submitted successfully',
            claim: {
                id: claimId,
                claim_number: claimNumber,
                status: 'pending',
                documents: documentUrls
            }
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
// Submit Cashless Claim (Hospital)
// ============================================
exports.submitCashlessClaim = async (req, res) => {
    try {
        const hospitalId = req.user?.id || req.user?.userId;
        const userType = req.user?.role || req.user?.userType;

        console.log('🔍 Token user data:', req.user);
        console.log('🏥 Hospital ID:', hospitalId);
        console.log('👤 User Type:', userType);

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
            treatmentCost
        } = req.body;

        console.log('📋 Cashless claim data:', { policyId, diagnosis, treatmentCost });

        if (!policyId || !diagnosis || !treatmentDescription || !doctorName || !treatmentDate || !treatmentCost) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // ✅ Get customer_id from YOUR policy table
        const policyResult = await db.query(
            `SELECT customer_id, remaining_coverage FROM policy WHERE policy_id = $1`,
            [policyId]
        );

        if (policyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Policy with ID ${policyId} not found`
            });
        }

        const customerId = policyResult.rows[0].customer_id;
        const remainingCoverage = policyResult.rows[0].remaining_coverage;

        // Check if treatment cost exceeds remaining coverage
        if (parseFloat(treatmentCost) > remainingCoverage) {
            return res.status(400).json({
                success: false,
                message: `Treatment cost exceeds remaining coverage of $${remainingCoverage}`
            });
        }

        const customerResult = await db.query(
            'SELECT first_name, last_name, email FROM customer WHERE customer_id = $1',
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const patientName = `${customerResult.rows[0].first_name} ${customerResult.rows[0].last_name}`;
        const customerEmail = customerResult.rows[0].email;

        await db.query('BEGIN');

        // ✅ Insert into YOUR claim table
        const claimResult = await db.query(
            `INSERT INTO claim (
                policy_id,
                customer_id,
                hospital_id,
                claim_type,
                claim_amount,
                status,
                filing_date,
                patient_name,
                hospital_name,
                diagnosis,
                service_date,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), $6, 
                      (SELECT name FROM hospital WHERE hospital_id = $3), 
                      $7, $8, NOW())
            RETURNING claim_id`,
            [
                policyId,
                customerId,
                hospitalId,
                'cashless',
                treatmentCost,
                patientName,
                diagnosis,
                treatmentDate || new Date()
            ]
        );

        const claimId = claimResult.rows[0].claim_id;
        console.log('✅ Cashless claim created with ID:', claimId);

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

        await db.query('COMMIT');
        
        const formattedCost = parseFloat(treatmentCost).toLocaleString();
        
        await createNotification(
            customerId,
            'customer',
            'claim_submitted',
            'Cashless Claim Request Received',
            `A cashless claim request for $${formattedCost} has been submitted by ${patientName} at the hospital. We will process it shortly.`,
            claimId
        ).catch(err => console.log('Notification error:', err.message));
        
        console.log(`📧 Notification sent to customer ${customerId} for cashless claim submission`);

        res.status(201).json({
            success: true,
            message: 'Cashless claim submitted successfully!',
            claimId: claimId,
            claim_number: 'CLM-' + claimId
        });

    } catch (error) {
        console.error('❌ Error submitting cashless claim:', error);
        
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
// Get Hospital's Claims
// ============================================
exports.getHospitalClaims = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        
        console.log('📋 Fetching claims for hospital:', hospitalId);

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
                c.patient_name,
                c.hospital_name,
                COALESCE(td.diagnosis, c.diagnosis) as diagnosis,
                td.treatment_description,
                td.doctor_name,
                td.treatment_date,
                td.treatment_cost,
                CONCAT(cu.first_name, ' ', cu.last_name) as patient_name,
                cu.email as patient_email,
                cu.phone as patient_phone
            FROM claim c
            LEFT JOIN treatment_detail td ON c.claim_id = td.claim_id
            LEFT JOIN customer cu ON c.customer_id = cu.customer_id
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
            createdAt: row.created_at
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
// FIXED: Queries YOUR 'claim' table, not 'claims'
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
        
        // ✅ Query YOUR claim table (singular)
        const result = await db.query(
            `SELECT 
                claim_id as id,
                'CLM-' || claim_id::TEXT as claim_number,
                policy_id,
                claim_type,
                claim_amount as amount,
                status,
                filing_date as created_at,
                COALESCE(patient_name, claim_type, 'reimbursement') as patient_name,
                COALESCE(hospital_name, 'Unknown Hospital') as hospital_name,
                diagnosis,
                service_date,
                description,
                documents,
                COALESCE(approved_amount, 0) as approved_amount,
                filing_date as service_date
            FROM claim 
            WHERE customer_id = $1 
            ORDER BY filing_date DESC`,
            [userId]
        );
        
        console.log(`✅ Retrieved ${result.rows.length} claims for customer ${userId}`);
        
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
        res.json({ 
            success: true, 
            claims: [], 
            count: 0,
            message: 'No claims found'
        });
    }
};

// ============================================
// Get Single Claim by ID
// FIXED: Queries YOUR 'claim' table
// ============================================
exports.getClaimById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        
        // ✅ Query YOUR claim table
        let result = await db.query(
            `SELECT 
                c.claim_id as id,
                'CLM-' || c.claim_id::TEXT as claim_number,
                c.policy_id,
                c.customer_id,
                c.claim_type,
                c.claim_amount as amount,
                c.status,
                c.filing_date as created_at,
                c.patient_name,
                c.hospital_name,
                c.diagnosis,
                c.service_date,
                c.description,
                c.documents,
                c.approved_amount,
                td.treatment_description,
                td.doctor_name,
                td.treatment_date,
                td.treatment_cost
            FROM claim c
            LEFT JOIN treatment_detail td ON c.claim_id = td.claim_id
            WHERE c.claim_id = $1 AND c.customer_id = $2`,
            [id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Claim not found'
            });
        }
        
        const claim = result.rows[0];
        
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

// ============================================
// UPDATE CLAIM STATUS (Admin/Staff)
// FIXED: Updates YOUR 'claim' table
// ============================================
exports.updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason, approved_amount } = req.body;
        const adminId = req.user?.userId;
        
        const validStatuses = ['pending', 'processing', 'approved', 'rejected', 'paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status value'
            });
        }
        
        // ✅ Query YOUR claim table
        const claimResult = await db.query(
            `SELECT claim_id, customer_id, claim_amount, claim_number 
             FROM claim WHERE claim_id = $1`,
            [id]
        );
        
        if (claimResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Claim not found'
            });
        }
        
        const claim = claimResult.rows[0];
        const customerId = claim.customer_id;
        const claimNumber = claim.claim_number || `CLM-${id}`;
        const claimAmount = parseFloat(claim.claim_amount) || 0;
        
        // ✅ Update YOUR claim table
        let updateResult;
        
        if (status === 'approved') {
            updateResult = await db.query(
                `UPDATE claim 
                 SET status = $1, 
                     approved_amount = $2,
                     reviewed_by = $3,
                     reviewed_at = NOW(),
                     updated_at = NOW()
                 WHERE claim_id = $4
                 RETURNING *`,
                [status, approved_amount || claimAmount, adminId, id]
            );
        } else {
            updateResult = await db.query(
                `UPDATE claim 
                 SET status = $1, 
                     reviewed_by = $2,
                     reviewed_at = NOW(),
                     updated_at = NOW()
                 WHERE claim_id = $3
                 RETURNING *`,
                [status, adminId, id]
            );
        }
        
        console.log(`✅ Claim ${id} status updated to: ${status}`);
        
        const formattedAmount = claimAmount.toLocaleString();
        let notificationTitle, notificationMessage;
        
        switch (status) {
            case 'processing':
                notificationTitle = 'Claim Under Review';
                notificationMessage = `Your claim #${claimNumber} for $${formattedAmount} is now being reviewed.`;
                break;
            case 'approved':
                const approvedAmt = approved_amount ? parseFloat(approved_amount).toLocaleString('en-US') : formattedAmount;
                notificationTitle = 'Claim Approved! 🎉';
                notificationMessage = `Your claim #${claimNumber} for $${approvedAmt} has been APPROVED.`;
                break;
            case 'rejected':
                notificationTitle = 'Claim Rejected';
                notificationMessage = `Your claim #${claimNumber} for $${formattedAmount} has been REJECTED. Reason: ${rejection_reason || 'Please contact support.'}`;
                break;
            case 'paid':
                notificationTitle = 'Claim Payment Disbursed';
                notificationMessage = `The payment of $${formattedAmount} for claim #${claimNumber} has been disbursed.`;
                break;
            default:
                notificationTitle = `Claim Status Updated`;
                notificationMessage = `Your claim #${claimNumber} status has been updated to: ${status.toUpperCase()}.`;
        }
        
        await createNotification(
            customerId,
            'customer',
            `claim_${status}`,
            notificationTitle,
            notificationMessage,
            id
        ).catch(err => console.log('Notification error:', err.message));
        
        res.json({
            success: true,
            message: `Claim status updated to ${status}`,
            claim: updateResult.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Update claim status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update claim status: ' + error.message
        });
    }
};
// exports.getClaimDocument = async (req, res) => {
//     try {
//         const { claimId, filename } = req.params;
        
//         // Check for token in headers OR query parameter
//         let userId = req.user?.userId;
//         let userRole = req.user?.role || req.user?.userType;
        
//         // If no user in request (direct URL access), check query parameter token
//         if (!userId && req.query.token) {
//             const jwt = require('jsonwebtoken');
//             try {
//                 const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
//                 userId = decoded.userId;
//                 userRole = decoded.userType;
//                 console.log('✅ Token verified from query param for user:', userId);
//             } catch (err) {
//                 console.log('❌ Invalid token in query param:', err.message);
//             }
//         }
        
//         if (!userId) {
//             return res.status(401).json({ success: false, error: 'Unauthorized. No valid token provided.' });
//         }
        
//         console.log(`📄 Document request - Claim: ${claimId}, File: ${filename}, User: ${userId}, Role: ${userRole}`);
        
//         // Check access based on user role
//         let hasAccess = false;
        
//         if (userRole === 'agent') {
//             const accessCheck = await db.query(
//                 `SELECT c.claim_id 
//                  FROM claim c
//                  JOIN policy p ON c.policy_id = p.policy_id
//                  WHERE c.claim_id = $1 AND p.agent_id = $2`,
//                 [claimId, userId]
//             );
//             hasAccess = accessCheck.rows.length > 0;
//         } else if (userRole === 'admin') {
//             hasAccess = true;
//         } else if (userRole === 'customer') {
//             const accessCheck = await db.query(
//                 `SELECT claim_id FROM claim WHERE claim_id = $1 AND customer_id = $2`,
//                 [claimId, userId]
//             );
//             hasAccess = accessCheck.rows.length > 0;
//         }
        
//         if (!hasAccess) {
//             console.log(`❌ Access denied for user ${userId} to claim ${claimId}`);
//             return res.status(403).json({ success: false, error: 'Access denied' });
//         }
        
//         // Get claim to verify document exists
//         const claimResult = await db.query(
//             `SELECT documents FROM claim WHERE claim_id = $1`,
//             [claimId]
//         );
        
//         if (claimResult.rows.length === 0) {
//             return res.status(404).json({ success: false, error: 'Claim not found' });
//         }
        
//         let documents = [];
//         const docField = claimResult.rows[0].documents;
        
//         if (docField) {
//             try {
//                 documents = typeof docField === 'string' ? JSON.parse(docField) : docField;
//             } catch (e) {
//                 documents = [];
//             }
//         }
        
//         // Find the document
//         const document = documents.find(doc => 
//             doc.filename === filename || 
//             doc.path?.includes(filename)
//         );
        
//         if (!document) {
//             return res.status(404).json({ success: false, error: 'Document not found' });
//         }
        
//         // ✅ FIX: Correct path - files are in backend/uploads/claims/
//         const fs = require('fs');
//         const path = require('path');
        
//         // __dirname is backend/src/controllers
//         // Go up 2 levels to backend root, then to uploads/claims
//         const backendRoot = path.join(__dirname, '../..');
//         const fullPath = path.join(backendRoot, 'uploads', 'claims', filename);
        
//         console.log(`📄 Serving document from: ${fullPath}`);
        
//         if (!fs.existsSync(fullPath)) {
//             console.log(`❌ File not found: ${fullPath}`);
//             return res.status(404).json({ success: false, error: 'File not found on server' });
//         }
        
//         const ext = path.extname(filename).toLowerCase();
//         const contentTypes = {
//             '.pdf': 'application/pdf',
//             '.jpg': 'image/jpeg',
//             '.jpeg': 'image/jpeg',
//             '.png': 'image/png',
//             '.gif': 'image/gif',
//             '.doc': 'application/msword',
//             '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//         };
        
//         const contentType = contentTypes[ext] || 'application/octet-stream';
//         res.setHeader('Content-Type', contentType);
//         res.setHeader('Content-Disposition', `inline; filename="${document.originalName || filename}"`);
        
//         res.sendFile(fullPath);
        
//     } catch (error) {
//         console.error('❌ Error serving document:', error);
//         res.status(500).json({ success: false, error: 'Failed to retrieve document: ' + error.message });
//     }
// };

exports.getClaimDocument = async (req, res) => {
    try {
        const { claimId, filename } = req.params;
        
        console.log('========== DOCUMENT REQUEST ==========');
        console.log('Claim ID:', claimId);
        console.log('Filename:', filename);
        
        // ... existing access control code ...
        
        // After finding the document and constructing fullPath
        const backendRoot = path.join(__dirname, '../..');
        const fullPath = path.join(backendRoot, 'uploads', 'claims', filename);
        
        console.log('Full path:', fullPath);
        
        // Check if file exists and get its size
        if (!fs.existsSync(fullPath)) {
            console.log('❌ File not found:', fullPath);
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        
        const stats = fs.statSync(fullPath);
        console.log('File size:', stats.size, 'bytes');
        
        if (stats.size === 0) {
            console.log('❌ File is empty!');
            return res.status(500).json({ success: false, error: 'File is empty' });
        }
        
        const ext = path.extname(filename).toLowerCase();
        const contentTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif'
        };
        
        const contentType = contentTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        
        // Use createReadStream for better performance
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);
        
        fileStream.on('error', (err) => {
            console.error('Stream error:', err);
            res.status(500).json({ success: false, error: 'Error streaming file' });
        });
        
    } catch (error) {
        console.error('❌ Error serving document:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve document: ' + error.message });
    }
};
// ============================================
exports.getAgentClientClaims = async (req, res) => {
     console.log('🟢🟢🟢 getAgentClientClaims WAS CALLED! 🟢🟢🟢');
    console.log('   Params:', req.params);
    console.log('   User:', req.user?.userId);
    try {
        const agentId = req.user?.userId;
        const { customerId } = req.params;
        const { status } = req.query;
        
        console.log('========== DEBUG: getAgentClientClaims ==========');
        console.log('Agent ID:', agentId);
        console.log('Customer ID:', customerId);
        console.log('Status filter:', status);
        
        if (!agentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        let query = `
            SELECT 
                c.claim_id,
                c.policy_id,
                c.customer_id,
                c.hospital_id,
                c.claim_type,
                c.claim_amount,
                c.status,
                c.filing_date,
                c.approved_amount,
                c.approval_notes,
                c.documents,
                c.description,
                c.hospital_name,
                c.patient_name,
                c.diagnosis,
                c.service_date,
                p.sum_insured,
                p.remaining_coverage,
                p.used_coverage,
                p.deductible_amount,
                p.co_pay_percentage,
                cust.first_name as customer_first_name,
                cust.last_name as customer_last_name,
                (p.used_coverage / NULLIF(p.sum_insured, 0) * 100) as coverage_used_percentage
            FROM claim c
            JOIN policy p ON c.policy_id = p.policy_id
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            WHERE p.agent_id = $1 AND c.customer_id = $2
        `;
        
        const params = [agentId, customerId];
        
        if (status && status !== 'all') {
            query += ` AND c.status = $3`;
            params.push(status);
        }
        
        query += ` ORDER BY c.filing_date DESC`;
        
        console.log('Executing query:', query);
        console.log('Params:', params);
        
        const result = await db.query(query, params);
        
        console.log(`Query returned ${result.rows.length} rows`);
        
        // Log the FIRST row's raw documents field
        if (result.rows.length > 0) {
            console.log('RAW first row documents field:', result.rows[0].documents);
            console.log('Type of documents field:', typeof result.rows[0].documents);
            console.log('Documents field is null?', result.rows[0].documents === null);
            console.log('Documents field is undefined?', result.rows[0].documents === undefined);
        }
        
        // Parse documents JSON for each claim
        const claims = result.rows.map(claim => {
            let documents = [];
            console.log(`\n--- Processing claim ${claim.claim_id} ---`);
            console.log('Raw documents value:', claim.documents);
            
            if (claim.documents) {
                try {
                    if (typeof claim.documents === 'string') {
                        console.log('Documents is string, parsing JSON...');
                        documents = JSON.parse(claim.documents);
                        console.log('Parsed documents:', documents);
                    } else if (typeof claim.documents === 'object') {
                        console.log('Documents is already an object');
                        documents = claim.documents;
                    } else {
                        console.log('Documents is unknown type:', typeof claim.documents);
                    }
                } catch (e) {
                    console.log('ERROR parsing documents:', e.message);
                    documents = [];
                }
            } else {
                console.log('No documents found for this claim');
            }
            
            return {
                ...claim,
                documents,
                claim_amount: parseFloat(claim.claim_amount),
                approved_amount: parseFloat(claim.approved_amount) || 0,
                sum_insured: parseFloat(claim.sum_insured),
                remaining_coverage: parseFloat(claim.remaining_coverage),
                used_coverage: parseFloat(claim.used_coverage),
                deductible_amount: parseFloat(claim.deductible_amount),
                co_pay_percentage: parseFloat(claim.co_pay_percentage),
                customer: claim.customer_id ? {
                    customer_id: claim.customer_id,
                    first_name: claim.customer_first_name,
                    last_name: claim.customer_last_name
                } : null
            };
        });
        
        // Log final claims documents
        console.log('\n========== FINAL CLAIMS DATA ==========');
        claims.forEach(claim => {
            console.log(`Claim ${claim.claim_id}: documents count = ${claim.documents?.length || 0}`);
            if (claim.documents?.length > 0) {
                console.log(`  Documents:`, claim.documents.map(d => d.filename));
            }
        });
        
        // Get stats
       // Fix the stats query - add table aliases to status column
const statsQuery = `
    SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN c.status = 'disapproved' THEN 1 END) as disapproved_count,
        COUNT(CASE WHEN c.status = 'paid' THEN 1 END) as paid_count,
        COALESCE(SUM(CASE WHEN c.status IN ('approved', 'paid') THEN c.approved_amount ELSE 0 END), 0) as total_approved_amount
    FROM claim c
    JOIN policy p ON c.policy_id = p.policy_id
    WHERE p.agent_id = $1 AND c.customer_id = $2
`;
        
        const statsResult = await db.query(statsQuery, [agentId, customerId]);
        
        res.json({
            success: true,
            data: claims,
            stats: statsResult.rows[0],
            count: claims.length
        });
        
    } catch (error) {
        console.error('Error fetching agent client claims:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch claims: ' + error.message
        });
    }
};