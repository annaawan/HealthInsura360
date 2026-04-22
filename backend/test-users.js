const db = require('./src/config/database');

async function testUsers() {
  try {
    console.log('🔍 Testing database tables...\n');

    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
      ORDER BY table_name
    `;
    
    const tablesResult = await db.query(tablesQuery);
    console.log('📊 Available tables:');
    tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Try to fetch customers
    console.log('\n👥 Testing customers table...');
    try {
      const customersResult = await db.query('SELECT * FROM customer LIMIT 1');
      console.log(`✅ Customers table exists. Count: ${customersResult.rowCount}`);
      if (customersResult.rows.length > 0) {
        console.log('Sample customer:', customersResult.rows[0]);
      }
    } catch (err) {
      console.log(`❌ Customers table error: ${err.message}`);
    }

    // Try to fetch agents
    console.log('\n👨‍💼 Testing agents table...');
    try {
      const agentsResult = await db.query('SELECT * FROM agent LIMIT 1');
      console.log(`✅ Agents table exists. Count: ${agentsResult.rowCount}`);
      if (agentsResult.rows.length > 0) {
        console.log('Sample agent:', agentsResult.rows[0]);
      }
    } catch (err) {
      console.log(`❌ Agents table error: ${err.message}`);
    }

    // Try to fetch hospitals
    console.log('\n🏥 Testing hospitals table...');
    try {
      const hospitalsResult = await db.query('SELECT * FROM hospital LIMIT 1');
      console.log(`✅ Hospitals table exists. Count: ${hospitalsResult.rowCount}`);
      if (hospitalsResult.rows.length > 0) {
        console.log('Sample hospital:', hospitalsResult.rows[0]);
      }
    } catch (err) {
      console.log(`❌ Hospitals table error: ${err.message}`);
    }

    // Try the combined query from userController
    console.log('\n🔗 Testing combined user query...');
    try {
      const customersResult = await db.query(`
        SELECT 
          customer_id as id,
          CONCAT(first_name, ' ', last_name) as name,
          email,
          phone,
          'customer' as role,
          status,
          TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
        FROM customer 
        ORDER BY created_at DESC
      `);
      console.log(`✅ Customer query works. Count: ${customersResult.rowCount}`);
    } catch (err) {
      console.log(`❌ Customer query error: ${err.message}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

testUsers();
