const db = require('./src/config/database');

(async () => {
  try {
    // Get hospital table columns
    const columnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'hospital'
      ORDER BY ordinal_position
    `);
    
    console.log('🏥 Hospital table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Get agent table columns
    const agentColumnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agent'
      ORDER BY ordinal_position
    `);
    
    console.log('\n👨‍💼 Agent table columns:');
    agentColumnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Get customer table columns
    const customerColumnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer'
      ORDER BY ordinal_position
    `);
    
    console.log('\n👤 Customer table columns:');
    customerColumnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
