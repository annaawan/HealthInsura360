const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const profileRoutes = require('./src/routes/profileRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');


// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/api/profile', profileRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/payments', paymentRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/verify',
      'GET /api/auth/profile',
      'POST /api/auth/logout',

      // Accounts
      'GET /api/accounts/customers',
      'GET /api/accounts/agents',
      'GET /api/accounts/hospitals',
      'POST /api/accounts',
      'PUT /api/accounts/:type/:id',
      'DELETE /api/accounts/:type/:id',
      'GET /api/accounts/:type/:id',

      // Hospitals
      'GET /api/hospitals', 
      'PUT /api/hospitals/:id/status'
    ]
  });
});

// Import routes
const accounts = require('./src/routes/accounts');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');   // ✅ NEW
const hospitalsRoutes = require('./src/routes/hospitalRoutes');   // ✅ NEW
const auditRoutes = require('./src/routes/auditRoutes');
const policyRoutes = require('./src/routes/policyRoutes');
const claimRoutes = require('./src/routes/claimRoutes');
console.log('✅ claimRoutes loaded:', typeof claimRoutes);
const policyPlansRoutes = require('./src/routes/policyPlans');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const reportsRoutes = require('./src/routes/reportsRoutes');

// Routes
app.use('/api/accounts', accounts);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);   // ✅ NEW - Combined user management
app.use('/api/hospitals', hospitalsRoutes);   // ✅ NEW
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/policy-plans', policyPlansRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    method: req.method,
    availableEndpoints: [
      'GET    /api/test',
      'GET    /health',

      // Auth
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'POST   /api/auth/verify',
      'GET    /api/auth/profile',
      'POST   /api/auth/logout',

      // Users (Combined management - customers, agents, hospitals)
      'GET    /api/users',
      'GET    /api/users/:id',
      'POST   /api/users',
      'PUT    /api/users/:id',
      'DELETE /api/users/:id',

      // Accounts (Legacy - specific role endpoints)
      'GET    /api/accounts/customers',
      'GET    /api/accounts/agents',
      'GET    /api/accounts/hospitals',
      'POST   /api/accounts',
      'PUT    /api/accounts/:type/:id',
      'DELETE /api/accounts/:type/:id',
      'GET    /api/accounts/:type/:id',

      // Hospitals
      'GET    /api/hospitals',
      'PUT    /api/hospitals/:id/status'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`🏥 Hospitals API: http://localhost:${PORT}/api/hospitals`);
  console.log(`👥 Accounts API: http://localhost:${PORT}/api/accounts`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
