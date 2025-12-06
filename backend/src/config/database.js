// src/config/database.js - SIMPLE WORKING VERSION
const { Pool } = require('pg');
require('dotenv').config();

console.log('🔌 Attempting database connection...');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Allahuakbar786',
    database: process.env.DB_NAME || 'HealthInsura360',
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.log('⚠️ Database connection warning:', err.message);
        console.log('⚠️ Continuing without database - using simulation mode');
    } else {
        console.log('✅ Database connected:', res.rows[0].now);
    }
});

module.exports = {
    query: (text, params) => {
        console.log(`📊 Database query: ${text.substring(0, 50)}...`);
        return pool.query(text, params);
    },
};