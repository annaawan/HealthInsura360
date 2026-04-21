const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'HealthInsura360',
  password: 'Allahuakbar786',
  port: 5432,
});

async function resetAdminPassword() {
  console.log('\n🔐 Reset Admin Password\n');
  
  rl.question('Enter admin email: ', async (email) => {
    rl.question('Enter new password: ', async (password) => {
      rl.question('Confirm password: ', async (confirmPassword) => {
        
        if (password !== confirmPassword) {
          console.log('\n❌ Passwords do not match!');
          rl.close();
          return;
        }
        
        try {
          // Generate new hash
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(password, salt);
          
          console.log('\n🔄 Updating admin password...');
          
          // Check if admin exists
          const checkResult = await pool.query(
            'SELECT admin_id FROM admin WHERE email = $1',
            [email.toLowerCase()]
          );
          
          if (checkResult.rows.length > 0) {
            // Update existing admin
            await pool.query(
              `UPDATE admin 
               SET password_hash = $1, 
                   created_at = NOW() 
               WHERE email = $2`,
              [passwordHash, email.toLowerCase()]
            );
            console.log(`\n✅ Password updated for admin: ${email}`);
          } else {
            // Create new admin
            await pool.query(
              `INSERT INTO admin (full_name, email, password_hash, role, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, NOW(), NOW())`,
              ['Administrator', email.toLowerCase(), passwordHash, 'super_admin']
            );
            console.log(`\n✅ Admin account created for: ${email}`);
          }
          
          console.log(`\n🔑 New password: ${password}`);
          console.log('You can now login with this password.\n');
          
        } catch (error) {
          console.error('\n❌ Error:', error.message);
        } finally {
          await pool.end();
          rl.close();
        }
      });
    });
  });
}

resetAdminPassword();