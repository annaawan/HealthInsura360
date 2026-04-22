const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Allahuakbar786',
    database: process.env.DB_NAME || 'HealthInsura360'
});

async function checkCustomerTable() {
    try {
        console.log('Checking customer table structure...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'customer'
            ORDER BY ordinal_position;
        `);

        console.log('Customer table columns:');
        result.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable})`);
        });

        // Check some sample data
        const dataResult = await pool.query('SELECT customer_id, first_name, last_name FROM customer LIMIT 3');
        console.log('\nSample customer data:');
        dataResult.rows.forEach(row => {
            console.log(`ID: ${row.customer_id}, Name: ${row.first_name} ${row.last_name}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkCustomerTable();