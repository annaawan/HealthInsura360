const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

// Register new user
exports.register = async (req, res) => {
    try {
        const { email, password, userType, firstName, lastName, phone } = req.body;
        
        // Check if user exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Insert user
        const userResult = await db.query(
            'INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING user_id, email, user_type',
            [email, hashedPassword, userType]
        );
        
        const user = userResult.rows[0];
        
        // If customer, add to customers table
        if (userType === 'customer' && firstName && lastName) {
            await db.query(
                'INSERT INTO customers (customer_id, first_name, last_name, phone) VALUES ($1, $2, $3, $4)',
                [user.user_id, firstName, lastName, phone || '']
            );
        }
        
        // Generate token
        const token = generateToken(user.user_id, user.user_type);
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user.user_id,
                email: user.email,
                userType: user.user_type
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const userResult = await db.query(
            'SELECT user_id, email, password_hash, user_type FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = userResult.rows[0];
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = generateToken(user.user_id, user.user_type);
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.user_id,
                email: user.email,
                userType: user.user_type
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const userResult = await db.query(
            'SELECT user_id, email, user_type, created_at FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        let profile = { ...user };
        
        // Get additional info based on user type
        if (user.user_type === 'customer') {
            const customerResult = await db.query(
                'SELECT * FROM customers WHERE customer_id = $1',
                [userId]
            );
            profile.details = customerResult.rows[0] || {};
        }
        
        res.json({
            success: true,
            profile
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
};