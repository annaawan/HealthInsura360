const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Allahuakbar786',
    database: process.env.DB_NAME || 'HealthInsura360'
});

async function checkClaimsTable() {
    try {
        console.log('Checking claims table structure...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'claims'
            ORDER BY ordinal_position;
        `);

        console.log('Claims table columns:');
        result.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable})`);
        });

        // Also check if treatment_detail table exists
        const treatmentResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = 'treatment_detail';
        `);

        if (treatmentResult.rows.length > 0) {
            console.log('\nTreatment_detail table exists');
        } else {
            console.log('\nTreatment_detail table does NOT exist');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkClaimsTable();