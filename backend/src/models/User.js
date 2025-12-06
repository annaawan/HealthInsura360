const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Register new user
    static async register(userData) {
        const { email, password, userType } = userData;
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const result = await db.query(
            'INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING user_id, email, user_type',
            [email, hashedPassword, userType]
        );
        
        return result.rows[0];
    }
    
    // Find user by email
    static async findByEmail(email) {
        const result = await db.query(
            'SELECT user_id, email, password_hash, user_type FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }
    
    // Compare password
    static async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
}

module.exports = User;