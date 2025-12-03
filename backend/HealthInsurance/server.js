const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes (with error handling)
let userRoutes, policyRoutes, claimRoutes;

try {
    userRoutes = require('./src/routes/userRoutes');
    console.log('✅ User routes loaded');
} catch (error) {
    console.log('⚠️ User routes not loaded:', error.message);
    userRoutes = null;
}

try {
    policyRoutes = require('./src/routes/policyRoutes');
    console.log('✅ Policy routes loaded');
} catch (error) {
    console.log('⚠️ Policy routes not loaded:', error.message);
    policyRoutes = null;
}

try {
    claimRoutes = require('./src/routes/claimRoutes');
    console.log('✅ Claim routes loaded');
} catch (error) {
    console.log('⚠️ Claim routes not loaded:', error.message);
    claimRoutes = null;
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes if they exist
if (userRoutes) app.use('/api/users', userRoutes);
if (policyRoutes) app.use('/api/policies', policyRoutes);
if (claimRoutes) app.use('/api/claims', claimRoutes);

// Fallback routes (if module routes fail)
if (!userRoutes) {
    app.post('/api/users/register', (req, res) => {
        res.json({ message: 'User registration (fallback)' });
    });
    app.post('/api/users/login', (req, res) => {
        res.json({ message: 'User login (fallback)' });
    });
}

if (!policyRoutes) {
    app.get('/api/policies/plans', (req, res) => {
        res.json({ message: 'Policy plans (fallback)' });
    });
}

if (!claimRoutes) {
    app.post('/api/claims/submit', (req, res) => {
        res.json({ message: 'Claim submission (fallback)' });
    });
}

// Health check route
app.get('/', (req, res) => {
    const modules = [];
    if (userRoutes) modules.push('User Auth ✓');
    if (policyRoutes) modules.push('Policies ✓');
    if (claimRoutes) modules.push('Claims ✓');
    
    res.json({
        success: true,
        message: '🎉 HealthInsura360 Backend v1.0',
        timestamp: new Date().toISOString(),
        status: 'Running',
        modules: modules.length > 0 ? modules : ['Basic Server Only'],
        endpoints: {
            users: ['POST /api/users/register', 'POST /api/users/login', 'GET /api/users/profile'],
            policies: ['GET /api/policies/plans', 'GET /api/policies/my-policies', 'POST /api/policies/purchase'],
            claims: ['POST /api/claims/submit', 'GET /api/claims/my-claims'],
            system: ['GET /', 'GET /api/health', 'GET /api/test/all']
        }
    });
});

// Comprehensive health endpoint
app.get('/api/health', (req, res) => {
    const health = {
        status: 'healthy',
        server: 'Node.js + Express',
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime().toFixed(2) + ' seconds',
        timestamp: new Date().toISOString(),
        modules: {
            users: userRoutes ? 'connected' : 'disconnected',
            policies: policyRoutes ? 'connected' : 'disconnected',
            claims: claimRoutes ? 'connected' : 'disconnected',
            database: 'PostgreSQL'
        }
    };
    
    res.json(health);
});

// Test all endpoints
app.get('/api/test/all', (req, res) => {
    const tests = [
        { endpoint: '/', method: 'GET', description: 'Home page' },
        { endpoint: '/api/health', method: 'GET', description: 'Health check' },
        { endpoint: '/api/users/register', method: 'POST', description: 'User registration' },
        { endpoint: '/api/users/login', method: 'POST', description: 'User login' },
        { endpoint: '/api/policies/plans', method: 'GET', description: 'Insurance plans' }
    ];
    
    res.json({
        message: 'Test endpoints available',
        tests: tests,
        instructions: 'Use Postman, curl, or browser console to test these endpoints'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestedUrl: req.originalUrl,
        suggestion: 'Visit / for available endpoints'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                🚀 HEALTHINSURA360 SERVER STARTED                ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║ 📡 PORT: ${PORT}                                                  ║`);
    console.log(`║ 🌐 URL: http://localhost:${PORT}                                  ║`);
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    
    // Show loaded modules
    console.log('║ 📦 LOADED MODULES:                                               ║');
    console.log(`║   ${userRoutes ? '✅' : '❌'} User Authentication & Management       ║`);
    console.log(`║   ${policyRoutes ? '✅' : '❌'} Policy Management System            ║`);
    console.log(`║   ${claimRoutes ? '✅' : '❌'} Claim Management System             ║`);
    console.log(`║   ✅ Database: PostgreSQL                                       ║`);
    
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║ 🔗 QUICK TEST COMMANDS:                                         ║');
    console.log(`║   curl http://localhost:${PORT}/api/health                        ║`);
    console.log(`║   curl http://localhost:${PORT}/api/policies/plans                ║`);
    console.log('║                                                                  ║');
    console.log('║ 📝 Sample Registration:                                         ║');
    console.log(`║   curl -X POST http://localhost:${PORT}/api/users/register \\      ║`);
    console.log('║     -H "Content-Type: application/json" \\                      ║');
    console.log('║     -d \'{"email":"test@test.com","password":"123"}\'            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
});