const jwt = require('jsonwebtoken');

// Authentication middleware - verifies JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token format' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Allahuakbar786');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Authorize middleware - checks if user has required role
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }
    
    const userRole = req.user.userType || req.user.role;
    
    if (allowedRoles.includes(userRole) || userRole === 'admin') {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
  };
};

// Alias for backward compatibility
const authMiddleware = authenticate;
const adminMiddleware = authorize('admin');

module.exports = {
  authenticate,
  authorize,
  authMiddleware,
  adminMiddleware
};