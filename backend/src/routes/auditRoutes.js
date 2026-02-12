const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ALL audit routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all audit logs
router.get('/', async (req, res) => {
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
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
        details
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

// Get audit log by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
        details
      FROM audit_log 
      WHERE audit_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error fetching audit log:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message 
    });
  }
});

// Get audit logs by user
router.get('/user/:user_type/:user_id', async (req, res) => {
  try {
    const { user_type, user_id } = req.params;
    const result = await db.query(
      `SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
        details
      FROM audit_log 
      WHERE user_type = $1 AND user_id = $2
      ORDER BY timestamp DESC`,
      [user_type, user_id]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error fetching user audit logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message 
    });
  }
});

// Get audit logs by entity
router.get('/entity/:entity/:entity_id', async (req, res) => {
  try {
    const { entity, entity_id } = req.params;
    const result = await db.query(
      `SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
        details
      FROM audit_log 
      WHERE entity = $1 AND entity_id = $2
      ORDER BY timestamp DESC`,
      [entity, entity_id]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error fetching entity audit logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message 
    });
  }
});

// Get audit statistics
router.get('/statistics', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT user_id) as unique_users,
        DATE(timestamp) as date,
        COUNT(*) as logs_per_day
      FROM audit_log 
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching audit statistics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message 
    });
  }
});

// Create audit log
router.post('/', async (req, res) => {
  try {
    const { user_type, user_id, action, entity, entity_id, details } = req.body;
    
    const result = await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [user_type, user_id, action, entity, entity_id, details || null]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create audit log',
      error: error.message 
    });
  }
});

// Export audit logs to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        timestamp,
        details
      FROM audit_log 
      ORDER BY timestamp DESC
    `);
    
    // Convert to CSV
    const csv = result.rows.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  } catch (error) {
    console.error('❌ Error exporting audit logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export audit logs',
      error: error.message 
    });
  }
});

// Clean old audit logs (admin only)
router.delete('/clean', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const result = await db.query(
      `DELETE FROM audit_log 
       WHERE timestamp < NOW() - INTERVAL '${days} days'
       RETURNING audit_id`,
      []
    );
    
    console.log(`✅ Deleted ${result.rowCount} old audit logs`);
    res.json({
      success: true,
      message: `Deleted ${result.rowCount} audit logs older than ${days} days`,
      count: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error cleaning audit logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clean audit logs',
      error: error.message 
    });
  }
});

module.exports = router;