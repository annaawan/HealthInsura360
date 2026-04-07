// In your backend routes (e.g., auditRoutes.js)
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

// All audit routes require authentication and admin authorization
router.use(authenticate);
router.use((req, res, next) => {
  // Simple admin check - adjust based on your user structure
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
});
// Get all audit logs
router.get('/', auditController.getAllAuditLogs);

// Get audit log by ID
router.get('/:id', auditController.getAuditLogById);

// Get audit logs by user
router.get('/user/:user_type/:user_id', auditController.getAuditLogsByUser);

// Get audit logs by entity
router.get('/entity/:entity/:entity_id', auditController.getAuditLogsByEntity);

// Export audit logs to CSV
router.get('/export/csv', auditController.exportAuditLogs);

// Get audit statistics
router.get('/statistics', auditController.getAuditStatistics);

// Create audit log (for external systems)
router.post('/', auditController.createAuditLogEndpoint);

// Clean old audit logs (admin only)
router.delete('/clean', auditController.cleanOldAuditLogs);

// Get all audit logs
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('📋 Fetching audit logs...');
    const result = await db.query(`
      SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp
      FROM audit_log 
      ORDER BY timestamp DESC
    `);
    
    console.log(`✅ Found ${result.rowCount} audit logs`);
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message 
    });
  }
});

module.exports = router;