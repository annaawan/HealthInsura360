// backend/middleware/auth.js
const jwt = require('jsonwebtoken');


// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided or invalid format'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Allahuakbar786');
    
    // Add user info to request
    req.user = decoded;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Authorization middleware (admin only)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // If user has admin role or specific allowed role
    const userRole = req.user.role || req.user.userType;
    
    if (userRole === 'admin' || allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
  };
};
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

const adminMiddleware = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

const agentMiddleware = (req, res, next) => {
  if (req.user.userType !== 'agent') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Agent only.'
    });
  }
  next();
};

const customerMiddleware = (req, res, next) => {
  if (req.user.userType !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer only.'
    });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  agentMiddleware,
  customerMiddleware,
  authenticate,
  authorize
};