// backend/scripts/linkClaimDocuments.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'healthinsura360',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function linkClaimDocuments() {
    console.log('🔍 Starting document linking process...\n');
    
    // First, get all existing claim IDs from database
    const claimsResult = await pool.query('SELECT claim_id FROM claim');
    const validClaimIds = new Set(claimsResult.rows.map(r => r.claim_id.toString()));
    console.log(`✅ Found ${validClaimIds.size} valid claim IDs in database:`, [...validClaimIds]);
    
    const uploadsDir = path.join(__dirname, '../uploads/claims');
    
    if (!fs.existsSync(uploadsDir)) {
        console.log('❌ Uploads directory not found:', uploadsDir);
        return;
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log(`📁 Found ${files.length} files in uploads folder\n`);
    
    let linkedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
        console.log(`\n--- Processing file: ${file} ---`);
        
        // Try multiple patterns to extract claim ID
        let claimId = null;
        
        // Pattern 1: claim_27_xxx.pdf (exact match with underscore after claim number)
        let match = file.match(/claim_(\d+)_/);
        if (match) {
            claimId = match[1];
            console.log(`   Pattern 1 match (claim_XXX_): claim_id = ${claimId}`);
        }
        
        // Pattern 2: look for a number that is a valid claim ID (1-1000 range, not timestamp)
        if (!claimId) {
            const allNumbers = file.match(/\d+/g);
            if (allNumbers) {
                for (const num of allNumbers) {
                    const numInt = parseInt(num);
                    // Claim IDs are typically small numbers (1-1000), not timestamps (13+ digits)
                    if (validClaimIds.has(num) && numInt < 10000) {
                        claimId = num;
                        console.log(`   Pattern 2 match (valid claim ID ${claimId})`);
                        break;
                    }
                }
            }
        }
        
        if (!claimId) {
            console.log(`   ⚠️ Could not extract valid claim ID from filename`);
            skippedCount++;
            continue;
        }
        
        // Check if claim exists
        try {
            const claimCheck = await pool.query(
                'SELECT claim_id, documents FROM claim WHERE claim_id = $1',
                [claimId]
            );
            
            if (claimCheck.rows.length === 0) {
                console.log(`   ❌ Claim ${claimId} not found`);
                errorCount++;
                continue;
            }
            
            const filePath = path.join(uploadsDir, file);
            const stat = fs.statSync(filePath);
            
            // Get original name (remove claim_id prefix)
            let originalName = file;
            if (file.match(/^claim_\d+_/)) {
                originalName = file.replace(/^claim_\d+_/, '');
            }
            
            const newDocument = {
                filename: file,
                originalName: originalName,
                path: `/uploads/claims/${file}`,
                type: getMimeType(file),
                size: stat.size,
                uploadedAt: stat.birthtime || new Date()
            };
            
            let existingDocuments = [];
            const currentDocField = claimCheck.rows[0].documents;
            
            if (currentDocField) {
                try {
                    existingDocuments = typeof currentDocField === 'string' 
                        ? JSON.parse(currentDocField) 
                        : currentDocField;
                } catch (e) {
                    existingDocuments = [];
                }
            }
            
            const alreadyExists = existingDocuments.some(doc => doc.filename === file);
            
            if (alreadyExists) {
                console.log(`   ⏭️ Already linked`);
                skippedCount++;
                continue;
            }
            
            existingDocuments.push(newDocument);
            
            await pool.query(
                `UPDATE claim 
                 SET documents = $1, updated_at = NOW()
                 WHERE claim_id = $2`,
                [JSON.stringify(existingDocuments), claimId]
            );
            
            console.log(`   ✅ Linked to claim ${claimId}`);
            linkedCount++;
            
        } catch (error) {
            console.error(`   ❌ Error:`, error.message);
            errorCount++;
        }
    }
    
    console.log('\n========== SUMMARY ==========');
    console.log(`✅ Linked: ${linkedCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    await pool.end();
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

linkClaimDocuments()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Script failed:', err);
        process.exit(1);
    });