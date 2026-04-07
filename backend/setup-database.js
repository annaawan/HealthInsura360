const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Allahuakbar786',
    database: process.env.DB_NAME || 'HealthInsura360'
});

const createTableSQL = `
-- Create insurance_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS insurance_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(100),
    description TEXT,
    premium_amount DECIMAL(10, 2),
    coverage_amount DECIMAL(12, 2),
    deductible DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create policies table if it doesn't exist
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    plan_id INTEGER REFERENCES insurance_plans(plan_id),
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    premium_amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create claims table if it doesn't exist
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    policy_id INTEGER REFERENCES policies(id),
    claim_amount DECIMAL(10, 2),
    claim_date DATE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_policies_customer_id ON policies(customer_id);
CREATE INDEX IF NOT EXISTS idx_claims_customer_id ON claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies(policy_number);

-- Insert default insurance plans if they don't exist
INSERT INTO insurance_plans (plan_name, plan_type, description, premium_amount, coverage_amount, deductible)
SELECT 'Premium Health Coverage', 'Individual', 'Comprehensive health coverage with hospitalization', 5000, 500000, 0
WHERE NOT EXISTS (SELECT 1 FROM insurance_plans WHERE plan_name = 'Premium Health Coverage');

INSERT INTO insurance_plans (plan_name, plan_type, description, premium_amount, coverage_amount, deductible)
SELECT 'Basic Health Plan', 'Family', 'Basic coverage for family members', 3000, 300000, 5000
WHERE NOT EXISTS (SELECT 1 FROM insurance_plans WHERE plan_name = 'Basic Health Plan');

INSERT INTO insurance_plans (plan_name, plan_type, description, premium_amount, coverage_amount, deductible)
SELECT 'Senior Care Plan', 'Individual', 'Specialized plan for senior citizens', 7000, 700000, 0
WHERE NOT EXISTS (SELECT 1 FROM insurance_plans WHERE plan_name = 'Senior Care Plan');
`;

async function setupDatabase() {
    try {
        console.log('🔧 Setting up database tables...');
        console.log('🔍 Connecting to database...');
        
        // Test connection
        const connTest = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', connTest.rows[0].now);
        
        // Create tables
        console.log('📋 Creating tables...');
        await pool.query(createTableSQL);
        console.log('✅ Tables created successfully!');
        
        // Check table contents
        console.log('\n📊 Database Status:');
        
        const plansResult = await pool.query('SELECT COUNT(*) as count FROM insurance_plans');
        console.log(`✅ Insurance Plans: ${plansResult.rows[0].count} records`);
        
        const policiesResult = await pool.query('SELECT COUNT(*) as count FROM policies');
        console.log(`✅ Policies: ${policiesResult.rows[0].count} records`);
        
        const claimsResult = await pool.query('SELECT COUNT(*) as count FROM claims');
        console.log(`✅ Claims: ${claimsResult.rows[0].count} records`);
        
        console.log('\n🎉 Database setup complete!');
        console.log('📝 Note: Your purchased policies and claims are now being stored in the database.');
        console.log('They will persist across server restarts and project changes.');
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup error:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('1. Make sure PostgreSQL is running');
        console.log('2. Check your database credentials in .env file');
        console.log('3. Ensure the database "HealthInsura360" exists');
        console.log('4. Run: npm run setup-db');
        await pool.end();
        process.exit(1);
    }
}

setupDatabase();
