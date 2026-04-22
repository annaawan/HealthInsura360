// backend/src/middleware/auth.js

const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or invalid format. Use Bearer token'
      });
    }
    
    const token = authHeader.split(' ')[1];
  
  if (!token || token === 'null' || token === 'undefined' || token === '') {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Allahuakbar786');
    
    // Debug log
    console.log('✅ Auth middleware - decoded token:', decoded);
    console.log('✅ Setting req.user =', decoded);
    
    // Add user info to request
    req.user = decoded;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Authorization middleware (for multiple roles)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }
    
    // Get user role from token (handle both 'role' and 'userType' fields)
    const userRole = req.user.role || req.user.userType;
    
    if (allowedRoles.includes(userRole) || userRole === 'admin') {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
  };
};

// ============================================
// Specific Role Middlewares
// ============================================

// Generic auth middleware (just verifies token)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Allahuakbar786');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
  const userRole = req.user?.role || req.user?.userType;
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

// Agent middleware
const agentMiddleware = (req, res, next) => {
  const userRole = req.user?.role || req.user?.userType;
  
  if (userRole !== 'agent') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Agent only.'
    });
  }
  next();
};

// Customer middleware
const customerMiddleware = (req, res, next) => {
  const userRole = req.user?.role || req.user?.userType;
  
  if (userRole !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer only.'
    });
  }
  next();
};

// ============================================
// NEW: Hospital middleware
// ============================================
const hospitalMiddleware = (req, res, next) => {
  const userRole = req.user?.role || req.user?.userType;
  
  if (userRole !== 'hospital') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Hospital access only.'
    });
  }
  next();
};

// ============================================
// Combined role middleware (for routes that multiple roles can access)
// ============================================
const allowRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role || req.user?.userType;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Allowed roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Export all middleware functionsconst authenticateToken = authenticate;
const isAdmin = adminMiddleware;

module.exports = {
  // Core auth
  authenticate,
  authMiddleware,
  
  // Specific role middlewares
  adminMiddleware,
  agentMiddleware,
  customerMiddleware,
  hospitalMiddleware,  // NEW: Hospital middleware
  
  // Combined middlewares
  authorize,
  allowRoles
};