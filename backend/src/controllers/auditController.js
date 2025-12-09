// backend/controllers/auditController.js
const db = require('../config/database');

// Create audit log
exports.createAuditLog = async (user_type, user_id, action, entity, entity_id) => {
  try {
    const result = await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING audit_id`,
      [
        user_type || 'system',
        user_id || 0,
        action,
        entity,
        entity_id || null,
      ]
    );
    
    console.log(`✅ Audit log created: ${action} on ${entity} ${entity_id || ''}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    // Don't throw error - audit failure shouldn't break main functionality
    return null;
  }
};

// Get all audit logs
exports.getAllAuditLogs = async (req, res) => {
  try {
    const { limit = 100, offset = 0, search, action, user_type } = req.query;
    
    let query = `
      SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        timestamp,
        to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_time
      FROM audit_log 
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Add filters
    if (search) {
      paramCount++;
      query += ` AND (
        action ILIKE $${paramCount} OR 
        entity ILIKE $${paramCount} OR 
        user_type ILIKE $${paramCount} OR
        CAST(user_id AS TEXT) ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }
    
    if (action) {
      paramCount++;
      query += ` AND action ILIKE $${paramCount}`;
      params.push(`%${action}%`);
    }
    
    if (user_type) {
      paramCount++;
      query += ` AND user_type = $${paramCount}`;
      params.push(user_type);
    }
    
    // Add ordering and pagination
    query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM audit_log WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (
        action ILIKE $${countParamCount} OR 
        entity ILIKE $${countParamCount} OR 
        user_type ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }
    
    if (action) {
      countParamCount++;
      countQuery += ` AND action ILIKE $${countParamCount}`;
      countParams.push(`%${action}%`);
    }
    
    if (user_type) {
      countParamCount++;
      countQuery += ` AND user_type = $${countParamCount}`;
      countParams.push(user_type);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
};

// Get audit log by ID
exports.getAuditLogById = async (req, res) => {
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
        timestamp,
        to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_time
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
    
    // Parse details JSON if exists
    const auditLog = result.rows[0];
    if (auditLog.details) {
      try {
        auditLog.details = JSON.parse(auditLog.details);
      } catch (e) {
        // If parsing fails, keep as string
      }
    }
    
    res.json({
      success: true,
      data: auditLog
    });
    
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit log',
      error: error.message
    });
  }
};

// Get audit logs by user
exports.getAuditLogsByUser = async (req, res) => {
  try {
    const { user_id, user_type } = req.params;
    const { limit = 50 } = req.query;
    
    const result = await db.query(
      `SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        timestamp,
        to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_time
      FROM audit_log 
      WHERE user_id = $1 AND user_type = $2
      ORDER BY timestamp DESC
      LIMIT $3`,
      [user_id, user_type, limit]
    );
    
    // Parse details JSON
    const logs = result.rows.map(log => {
      if (log.details) {
        try {
          log.details = JSON.parse(log.details);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return log;
    });
    
    res.json({
      success: true,
      data: logs
    });
    
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user audit logs',
      error: error.message
    });
  }
};

// Get audit logs by entity
exports.getAuditLogsByEntity = async (req, res) => {
  try {
    const { entity, entity_id } = req.params;
    const { limit = 50 } = req.query;
    
    const result = await db.query(
      `SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        timestamp,
        to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_time
      FROM audit_log 
      WHERE entity = $1 AND entity_id = $2
      ORDER BY timestamp DESC
      LIMIT $3`,
      [entity, entity_id, limit]
    );
    
    // Parse details JSON
    const logs = result.rows.map(log => {
      if (log.details) {
        try {
          log.details = JSON.parse(log.details);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return log;
    });
    
    res.json({
      success: true,
      data: logs
    });
    
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching entity audit logs',
      error: error.message
    });
  }
};

// Export audit logs to CSV
exports.exportAuditLogs = async (req, res) => {
  try {
    const { start_date, end_date, user_type } = req.query;
    
    let query = `
      SELECT 
        audit_id,
        user_type,
        user_id,
        action,
        entity,
        entity_id,
        to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp
      FROM audit_log 
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (start_date) {
      paramCount++;
      query += ` AND timestamp >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND timestamp <= $${paramCount}`;
      params.push(end_date);
    }
    
    if (user_type) {
      paramCount++;
      query += ` AND user_type = $${paramCount}`;
      params.push(user_type);
    }
    
    query += ` ORDER BY timestamp DESC`;
    
    const result = await db.query(query, params);
    
    // Convert to CSV format
    const csvRows = [];
    
    // Add headers
    csvRows.push(['Audit ID', 'User Type', 'User ID', 'Action', 'Entity', 'Entity ID', 'Timestamp'].join(','));
    
    // Add data rows
    result.rows.forEach(log => {
      csvRows.push([
        log.audit_id,
        log.user_type,
        log.user_id,
        `"${log.action}"`,
        log.entity,
        log.entity_id,
        log.timestamp
      ].join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting audit logs',
      error: error.message
    });
  }
};

// Clean old audit logs (keep last 90 days)
exports.cleanOldAuditLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const result = await db.query(
      `DELETE FROM audit_log 
       WHERE timestamp < NOW() - INTERVAL '${days} days'
       RETURNING COUNT(*) as deleted_count`
    );
    
    const deletedCount = parseInt(result.rows[0].deleted_count);
    
    res.json({
      success: true,
      message: `Cleaned ${deletedCount} audit logs older than ${days} days`,
      deleted_count: deletedCount
    });
    
  } catch (error) {
    console.error('Error cleaning audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning audit logs',
      error: error.message
    });
  }
};

// Get audit statistics
exports.getAuditStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const statistics = await db.query(
      `SELECT 
        -- Total logs in period
        (SELECT COUNT(*) FROM audit_log WHERE timestamp >= NOW() - INTERVAL '${days} days') as total_logs,
        
        -- Logs by user type
        (SELECT json_object_agg(user_type, count) 
         FROM (SELECT user_type, COUNT(*) as count 
               FROM audit_log 
               WHERE timestamp >= NOW() - INTERVAL '${days} days'
               GROUP BY user_type) sub) as logs_by_user_type,
        
        -- Logs by action type
        (SELECT json_object_agg(action_type, count) 
         FROM (SELECT 
                 CASE 
                   WHEN action ILIKE '%create%' THEN 'create'
                   WHEN action ILIKE '%update%' OR action ILIKE '%edit%' THEN 'update'
                   WHEN action ILIKE '%delete%' THEN 'delete'
                   WHEN action ILIKE '%login%' THEN 'login'
                   WHEN action ILIKE '%register%' THEN 'register'
                   ELSE 'other'
                 END as action_type,
                 COUNT(*) as count
               FROM audit_log 
               WHERE timestamp >= NOW() - INTERVAL '${days} days'
               GROUP BY action_type) sub) as logs_by_action_type,
        
        -- Most active users
        (SELECT json_agg(row_to_json(sub))
         FROM (SELECT user_type, user_id, COUNT(*) as action_count
               FROM audit_log 
               WHERE timestamp >= NOW() - INTERVAL '${days} days'
               GROUP BY user_type, user_id
               ORDER BY action_count DESC
               LIMIT 10) sub) as most_active_users,
        
        -- Most active entities
        (SELECT json_agg(row_to_json(sub))
         FROM (SELECT entity, COUNT(*) as action_count
               FROM audit_log 
               WHERE timestamp >= NOW() - INTERVAL '${days} days'
               GROUP BY entity
               ORDER BY action_count DESC
               LIMIT 10) sub) as most_active_entities
      `
    );
    
    res.json({
      success: true,
      data: statistics.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit statistics',
      error: error.message
    });
  }
};

// Create audit log endpoint (for frontend to create logs directly)
exports.createAuditLogEndpoint = async (req, res) => {
  try {
    const { user_type, user_id, action, entity, entity_id, details } = req.body;
    
    if (!action || !entity) {
      return res.status(400).json({
        success: false,
        message: 'Action and entity are required fields'
      });
    }
    
    const result = await db.query(
      `INSERT INTO audit_log (user_type, user_id, action, entity, entity_id, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING audit_id, timestamp`,
      [
        user_type || 'system',
        user_id || 0,
        action,
        entity,
        entity_id || null,
        details ? JSON.stringify(details) : null
      ]
    );
    
    res.json({
      success: true,
      message: 'Audit log created successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating audit log',
      error: error.message
    });
  }
};