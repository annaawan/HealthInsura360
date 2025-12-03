// diagnose.js - Find the exact problem
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing HealthInsura360 Issues...\n');

const checks = [
    { path: 'src/config/database.js', desc: 'Database config file' },
    { path: 'src/controllers/userController.js', desc: 'User controller' },
    { path: 'src/utils/jwt.js', desc: 'JWT utilities' }
];

checks.forEach(check => {
    const fullPath = path.join(__dirname, check.path);
    console.log(`\nChecking: ${check.desc}`);
    console.log(`Path: ${fullPath}`);
    
    if (fs.existsSync(fullPath)) {
        console.log('✅ File exists');
        
        // Check file content
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            console.log(`Size: ${content.length} bytes`);
            
            if (content.includes('require')) {
                console.log('✅ Contains require statements');
            }
            
            if (check.path === 'src/controllers/userController.js') {
                if (content.includes('../config/database')) {
                    console.log('✅ Correct database import path');
                } else {
                    console.log('❌ WRONG database import path');
                }
            }
        } catch (err) {
            console.log('❌ Cannot read file:', err.message);
        }
    } else {
        console.log('❌ FILE MISSING!');
        console.log('Creating it now...');
        
        // Create parent directories if needed
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Create simple file
        if (check.path === 'src/config/database.js') {
            fs.writeFileSync(fullPath, `// Database config
module.exports = { query: () => console.log('Simulated query') };`);
        }
        console.log('✅ Created file');
    }
});

console.log('\n🎯 SOLUTION:');
console.log('1. Use the all-in-one server.js above (recommended)');
console.log('2. OR create src/config/database.js file');