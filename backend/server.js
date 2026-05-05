const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const reminderScheduler = require('./src/services/reminderScheduler');

console.log('🔵 SERVER STARTING...');
console.log('🔵 Current directory:', __dirname);

// Load environment variables
dotenv.config();
console.log('🔵 Environment variables loaded');

const app = express();

// This should point to the correct uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/hospital-documents', express.static(path.join(__dirname, 'uploads/hospital-documents')));
app.use('/uploads/claims', express.static(path.join(__dirname, 'uploads/claims')));
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads/profiles')));


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

app.use((req, res, next) => {
  console.log(`📨 REQUEST: ${req.method} ${req.url}`);
  next();
});

// Add with other route registrations
const notificationRoutes = require('./src/routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// ============================================
// ✅ NEW: AI Recommendation Routes
// ============================================
try {
  console.log('🔵 Importing AI recommendation routes...');
  const aiRecommendationRoutes = require('./src/routes/aiRecommendationRoutes');
  app.use('/api/ai', aiRecommendationRoutes);
  console.log('✅ AI recommendation routes mounted at /api/ai');
} catch (err) {
  console.error('❌ Error loading AI recommendation routes:', err.message);
}

console.log('🔵 Attempting to import routes...');

let accounts, authRoutes, hospitalsRoutes, auditRoutes, policyRoutes, insurancePlansRoutes,
    claimRoutes, policyPlansRoutes, analyticsRoutes, reportsRoutes,
    webhookRoutes, paymentRoutes, stripeWebhookRoutes, commissionRoutes,
    userRoutes, profileRoutes;

try {
  console.log('🔵 Importing accounts routes...');
  accounts = require('./src/routes/accounts');
  console.log('✅ accounts routes loaded');
} catch (err) {
  console.error('❌ Error loading accounts:', err.message);
}

try {
  console.log('🔵 Importing insurance plans routes...');
  insurancePlansRoutes = require('./src/routes/insurancePlans');
  console.log('✅ insurance plans routes loaded');
} catch (err) {
  console.error('❌ Error loading insurance plans:', err.message);
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
  console.log('🔵 Importing policy routes...');
  policyRoutes = require('./src/routes/policyRoutes');
  console.log('✅ policy routes loaded');
} catch (err) {
  console.error('❌ Error loading policy routes:', err.message);
}

try {
  console.log('🔵 Importing claim routes...');
  claimRoutes = require('./src/routes/claimRoutes');
  console.log('✅ claim routes loaded');
} catch (err) {
  console.error('❌ Error loading claim routes:', err.message);
}

try {
  console.log('🔵 Importing policy plans routes...');
  policyPlansRoutes = require('./src/routes/policyPlans');
  console.log('✅ policy plans loaded');
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
  console.log('🔵 Importing profile routes...');
  profileRoutes = require('./src/routes/profileRoutes');
  console.log('✅ profile routes loaded');
} catch (err) {
  console.error('❌ Error loading profile routes:', err.message);
}

try {
  console.log('🔵 Importing user routes...');
  userRoutes = require('./src/routes/userRoutes');
  console.log('✅ user routes loaded');
} catch (err) {
  console.error('❌ Error loading user routes:', err.message);
}

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
      'POST /api/accounts',
      'PUT /api/accounts/:type/:id',
      'DELETE /api/accounts/:type/:id',
      'GET /api/accounts/:type/:id',
      'GET /api/users',
      'GET /api/users/:id',
      'POST /api/users',
      'PUT /api/users/:id',
      'DELETE /api/users/:id',
      'GET /api/hospitals',
      'PUT /api/hospitals/:id/status',
      'GET /api/payments/test',
      'GET /api/payments/transactions',
      'GET /api/ai/recommendations'
    ]
  });
});

console.log('🔵 All imports attempted, now mounting routes...');

try { if (accounts) app.use('/api/accounts', accounts); } catch (err) { console.error('Error mounting accounts:', err.message); }
try { if (authRoutes) app.use('/api/auth', authRoutes); } catch (err) { console.error('Error mounting auth:', err.message); }
try { if (hospitalsRoutes) app.use('/api/hospitals', hospitalsRoutes); } catch (err) { console.error('Error mounting hospitals:', err.message); }
try { if (auditRoutes) app.use('/api/audit-logs', auditRoutes); } catch (err) { console.error('Error mounting audit:', err.message); }
try { if (policyRoutes) app.use('/api/policies', policyRoutes); } catch (err) { console.error('Error mounting policies:', err.message); }
try { if (claimRoutes) app.use('/api/claims', claimRoutes); } catch (err) { console.error('Error mounting claims:', err.message); }
try { if (userRoutes) app.use('/api/users', userRoutes); } catch (err) { console.error('Error mounting users:', err.message); }
try { if (policyPlansRoutes) app.use('/api/policy-plans', policyPlansRoutes); } catch (err) { console.error('Error mounting policy-plans:', err.message); }
try { if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes); } catch (err) { console.error('Error mounting analytics:', err.message); }
// Add this line to also mount analytics under reports for backward compatibility
try { if (analyticsRoutes) app.use('/api/reports/analytics', analyticsRoutes); } catch (err) { console.error('Error mounting analytics under reports:', err.message); }
try { if (reportsRoutes) app.use('/api/reports', reportsRoutes); } catch (err) { console.error('Error mounting reports:', err.message); }
try { if (webhookRoutes) app.use('/api/webhooks', webhookRoutes); } catch (err) { console.error('Error mounting webhooks:', err.message); }
try { if (stripeWebhookRoutes) app.use('/api/webhooks/stripe', stripeWebhookRoutes); } catch (err) { console.error('Error mounting stripe:', err.message); }
try { if (paymentRoutes) { app.use('/api/payments', paymentRoutes); console.log('✅✅✅ Payment routes mounted successfully at /api/payments'); } } catch (err) { console.error('❌❌❌ CRITICAL: Error mounting payment routes:', err.message); }
try { if (commissionRoutes) app.use('/api/commissions', commissionRoutes); } catch (err) { console.error('Error mounting commissions:', err.message); }
try { if (insurancePlansRoutes) app.use('/api/insurance-plans', insurancePlansRoutes); } catch (err) { console.error('Error mounting insurance-plans:', err.message); }
try { if (profileRoutes) app.use('/api/profile', profileRoutes); } catch (err) { console.error('Error mounting profile:', err.message); }

app.get('/health', (req, res) => {
  console.log('🟢 /health route accessed');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'POST   /api/auth/verify',
      'GET    /api/auth/profile',
      'POST   /api/auth/logout',
      'GET    /api/users',
      'GET    /api/users/:id',
      'POST   /api/users',
      'PUT    /api/users/:id',
      'DELETE /api/users/:id',
      'GET    /api/accounts/customers',
      'GET    /api/accounts/agents',
      'GET    /api/accounts/hospitals',
      'POST   /api/accounts',
      'PUT    /api/accounts/:type/:id',
      'DELETE /api/accounts/:type/:id',
      'GET    /api/accounts/:type/:id',
      'GET    /api/hospitals',
      'PUT    /api/hospitals/:id/status',
      'GET    /api/payments/test',
      'GET    /api/payments/transactions',
      'GET    /api/ai/recommendations'
    ]
  });
});

const PORT = process.env.PORT || 5000;
reminderScheduler.start();
process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    reminderScheduler.stop();
    process.exit();
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`💳 Payment test: http://localhost:${PORT}/api/payments/test`);
  console.log(`📊 Transactions: http://localhost:${PORT}/api/payments/transactions`);
  console.log(`🤖 AI Recommendations: http://localhost:${PORT}/api/ai/recommendations`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});