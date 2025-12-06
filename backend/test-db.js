const { Pool } = require('pg');

// Use the same settings from your .env
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Allahuakbar786', // Your password from .env
    database: 'HealthInsura360'
});

console.log('🔍 Testing database connection...');

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.log('❌ Connection FAILED!');
        console.log('Error:', err.message);
        console.log('\nPossible solutions:');
        console.log('1. Check if PostgreSQL is running');
        console.log('2. Check your password in .env');
        console.log('3. Check if database exists');
    } else {
        console.log('✅ Connection SUCCESSFUL!');
        console.log('Database time:', res.rows[0].now);
        console.log('🎉 Ready to build your HealthInsura360!');
    }
    pool.end();
});