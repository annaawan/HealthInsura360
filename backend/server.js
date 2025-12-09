const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const hospitalsRoutes = require('./src/routes/hospitalRoutes');   // ✅ NEW
const auditRoutes = require('./src/routes/auditRoutes');

// Routes
app.use('/api/accounts', accounts);
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalsRoutes);   // ✅ NEW
app.use('/api/audit-logs', auditRoutes);
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

      // Accounts
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
