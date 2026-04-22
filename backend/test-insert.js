const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Allahuakbar786',
    database: process.env.DB_NAME || 'HealthInsura360'
});

async function testInsert() {
    try {
        console.log('Testing manual insert...');
        const result = await pool.query(`
            INSERT INTO claims (
                claim_number,
                customer_id,
                policy_id,
                claim_type,
                patient_name,
                hospital_name,
                diagnosis,
                amount,
                claim_date,
                status,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), NOW())
            RETURNING id
        `, [
            'TEST-123',
            2, // customer_id from customer table
            1,
            'cashless',
            'ahmed ali', // patient name
            'Test Hospital',
            'Test Diagnosis',
            5000.00,
            'pending'
        ]);

        console.log('Insert successful:', result.rows[0]);

        // Also test treatment_detail insert
        const treatmentResult = await pool.query(`
            INSERT INTO treatment_detail (
                claim_id,
                diagnosis,
                treatment_description,
                doctor_name,
                treatment_cost,
                treatment_date
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING treatment_id
        `, [
            result.rows[0].id,
            'Test Diagnosis',
            'Test Treatment',
            'Dr. Test',
            5000.00,
            '2024-01-01'
        ]);

        console.log('Treatment detail insert successful:', treatmentResult.rows[0]);

        await pool.end();
    } catch (error) {
        console.error('Insert failed:', error.message);
        console.error('Error details:', error);
        await pool.end();
    }
}

testInsert();