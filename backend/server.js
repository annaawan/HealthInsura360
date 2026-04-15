const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

console.log('🔵 SERVER STARTING...');
console.log('🔵 Current directory:', __dirname);

// Load environment variables
dotenv.config();
console.log('🔵 Environment variables loaded');

const app = express();

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
console.log('🔵 CORS middleware configured');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('🔵 JSON middleware configured');

// Test route
app.get('/api/test', (req, res) => {
  console.log('🟢 /api/test route accessed');
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
      'GET /api/accounts/customers',
      'GET /api/accounts/agents',
      'GET /api/accounts/hospitals',
      'GET /api/hospitals',
      'GET /api/payments/test',
      'GET /api/payments/transactions'
    ]
  });
});

console.log('🔵 Attempting to import routes...');

// Import routes with error catching
let accounts, authRoutes, hospitalsRoutes, auditRoutes, policyPlansRoutes, 
    analyticsRoutes, reportsRoutes, webhookRoutes, paymentRoutes, 
    stripeWebhookRoutes, commissionRoutes;

try {
  console.log('🔵 Importing accounts routes...');
  accounts = require('./src/routes/accounts');
  console.log('✅ accounts routes loaded');
} catch (err) {
  console.error('❌ Error loading accounts:', err.message);
}

try {
  console.log('🔵 Importing auth routes...');
  authRoutes = require('./src/routes/authRoutes');
  console.log('✅ auth routes loaded');
} catch (err) {
  console.error('❌ Error loading auth:', err.message);
}

try {
  console.log('🔵 Importing hospitals routes...');
  hospitalsRoutes = require('./src/routes/hospitalRoutes');
  console.log('✅ hospitals routes loaded');
} catch (err) {
  console.error('❌ Error loading hospitals:', err.message);
}

try {
  console.log('🔵 Importing audit routes...');
  auditRoutes = require('./src/routes/auditRoutes');
  console.log('✅ audit routes loaded');
} catch (err) {
  console.error('❌ Error loading audit:', err.message);
}

try {
  console.log('🔵 Importing policy plans routes...');
  policyPlansRoutes = require('./src/routes/policyPlans');
  console.log('✅ policy plans routes loaded');
} catch (err) {
  console.error('❌ Error loading policy plans:', err.message);
}

try {
  console.log('🔵 Importing analytics routes...');
  analyticsRoutes = require('./src/routes/analyticsRoutes');
  console.log('✅ analytics routes loaded');
} catch (err) {
  console.error('❌ Error loading analytics:', err.message);
}

try {
  console.log('🔵 Importing reports routes...');
  reportsRoutes = require('./src/routes/reportsRoutes');
  console.log('✅ reports routes loaded');
} catch (err) {
  console.error('❌ Error loading reports:', err.message);
}

try {
  console.log('🔵 Importing webhook routes...');
  webhookRoutes = require('./src/routes/webhookRoutes');
  console.log('✅ webhook routes loaded');
} catch (err) {
  console.error('❌ Error loading webhook:', err.message);
}

try {
  console.log('🔵 🔴 🔵 IMPORTANT: Importing payment routes...');
  paymentRoutes = require('./src/routes/paymentRoutes');
  console.log('✅✅✅ payment routes loaded successfully!');
  console.log('📦 Payment routes type:', typeof paymentRoutes);
  console.log('📦 Payment routes methods:', Object.keys(paymentRoutes));
} catch (err) {
  console.error('❌❌❌ CRITICAL: Error loading payment routes:', err.message);
  console.error('Full error:', err);
  // Create a fallback route
  paymentRoutes = express.Router();
  paymentRoutes.get('/test', (req, res) => {
    res.json({ success: false, message: 'Payment routes failed to load: ' + err.message });
  });
}

try {
  console.log('🔵 Importing stripe webhook routes...');
  stripeWebhookRoutes = require('./src/routes/stripeWebhookRoutes');
  console.log('✅ stripe webhook routes loaded');
} catch (err) {
  console.error('❌ Error loading stripe webhook:', err.message);
}

try {
  console.log('🔵 Importing commission routes...');
  commissionRoutes = require('./src/routes/commissionRoutes');
  console.log('✅ commission routes loaded');
} catch (err) {
  console.error('❌ Error loading commission:', err.message);
}
// Agent Commission Routes (separate from admin)
// In server.js, add this with other route mountings
try {
  console.log('🔵 Mounting /api/agent');
  const agentRoutes = require('./src/routes/agentRoutes');
  app.use('/api/agent', agentRoutes);
  console.log('✅ Agent routes mounted');
} catch (err) {
  console.error('❌ Error mounting agent routes:', err.message);
}
console.log('🔵 All imports attempted, now mounting routes...');

// Routes
try {
  console.log('🔵 Mounting /api/webhooks/stripe');
  app.use('/api/webhooks/stripe', stripeWebhookRoutes);
} catch (err) { console.error('Error mounting stripe:', err.message); }

try {
  console.log('🔵 Mounting /api/accounts');
  app.use('/api/accounts', accounts);
} catch (err) { console.error('Error mounting accounts:', err.message); }

try {
  console.log('🔵 Mounting /api/auth');
  app.use('/api/auth', authRoutes);
} catch (err) { console.error('Error mounting auth:', err.message); }

try {
  console.log('🔵 Mounting /api/hospitals');
  app.use('/api/hospitals', hospitalsRoutes);
} catch (err) { console.error('Error mounting hospitals:', err.message); }

try {
  console.log('🔵 Mounting /api/audit-logs');
  app.use('/api/audit-logs', auditRoutes);
} catch (err) { console.error('Error mounting audit:', err.message); }

try {
  console.log('🔵 Mounting /api/policy-plans');
  app.use('/api/policy-plans', policyPlansRoutes);
} catch (err) { console.error('Error mounting policy-plans:', err.message); }

try {
  console.log('🔵 Mounting /api/analytics');
  app.use('/api/analytics', analyticsRoutes);
} catch (err) { console.error('Error mounting analytics:', err.message); }

try {
  console.log('🔵 Mounting /api/reports');
  app.use('/api/reports', reportsRoutes);
} catch (err) { console.error('Error mounting reports:', err.message); }

try {
  console.log('🔵 Mounting /api/webhooks');
  app.use('/api/webhooks', webhookRoutes);
} catch (err) { console.error('Error mounting webhooks:', err.message); }

try {
  console.log('🔵 🔴 🔵 MOUNTING PAYMENT ROUTES at /api/payments');
  app.use('/api/payments', paymentRoutes);
  console.log('✅✅✅ Payment routes mounted successfully at /api/payments');
} catch (err) { 
  console.error('❌❌❌ CRITICAL: Error mounting payment routes:', err.message);
}

try {
  console.log('🔵 Mounting /api/commissions');
  app.use('/api/commissions', commissionRoutes);
} catch (err) { console.error('Error mounting commissions:', err.message); }

// Health check
app.get('/health', (req, res) => {
  console.log('🟢 /health route accessed');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📨 REQUEST: ${req.method} ${req.url}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    method: req.method,
    availableEndpoints: [
      'GET    /api/test',
      'GET    /health',
      'GET    /api/payments/test',
      'GET    /api/payments/transactions',
      'POST   /api/auth/login',
      'GET    /api/accounts/customers',
      'GET    /api/hospitals'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`💳 Payment test: http://localhost:${PORT}/api/payments/test`);
  console.log(`📊 Transactions: http://localhost:${PORT}/api/payments/transactions`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});