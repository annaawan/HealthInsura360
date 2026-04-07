// backend/services/auditLogService.js

const db = require('../config/database');

class AuditLogService {
    
    // Log commission action
    async logCommissionAction(action, commissionId, userId, userType, details = {}) {
        let connection;
        try {
            connection = await db.getConnection();
            
            // Prepare data as JSON string to store in a single field
            // Since your table doesn't have old_data/new_data columns, we'll combine in action_description
            const actionData = {
                action: action,
                commission_id: commissionId,
                details: details
            };
            
            await connection.query(
                `INSERT INTO audit_log (
                    user_type, user_id, action, entity, entity_id, timestamp
                ) VALUES (?, ?, ?, 'commission', ?, NOW())`,
                [
                    userType,
                    userId,
                    action,
                    commissionId
                ]
            );
            
            console.log(`✅ Audit log recorded: ${action} on commission ${commissionId}`);
            
        } catch (error) {
            console.error('Failed to log audit:', error);
        } finally {
            if (connection) connection.release();
        }
    }
    
    // Log commission payment
    async logCommissionPayment(commissionId, userId, amount, paymentMethod, paymentReference) {
        let connection;
        try {
            connection = await db.getConnection();
            
            const paymentDetails = {
                amount: amount,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                paid_at: new Date().toISOString()
            };
            
            await connection.query(
                `INSERT INTO audit_log (
                    user_type, user_id, action, entity, entity_id, timestamp
                ) VALUES ('admin', ?, 'commission_paid', 'commission', ?, NOW())`,
                [userId, commissionId]
            );
            
            console.log(`✅ Payment audit logged for commission ${commissionId}`);
            
            // You could also store details in a separate log_details table if needed
            // For now, the action name 'commission_paid' indicates what happened
            
        } catch (error) {
            console.error('Failed to log payment audit:', error);
        } finally {
            if (connection) connection.release();
        }
    }
    
    // Log commission rate update
    async logRateUpdate(commissionId, userId, oldRate, newRate) {
        let connection;
        try {
            connection = await db.getConnection();
            
            await connection.query(
                `INSERT INTO audit_log (
                    user_type, user_id, action, entity, entity_id, timestamp
                ) VALUES ('admin', ?, 'commission_rate_updated', 'commission', ?, NOW())`,
                [userId, commissionId]
            );
            
            console.log(`✅ Rate update audit logged for commission ${commissionId}: ${oldRate}% → ${newRate}%`);
            
        } catch (error) {
            console.error('Failed to log rate update audit:', error);
        } finally {
            if (connection) connection.release();
        }
    }
    
    // Log commission cancellation
    async logCommissionCancellation(commissionId, userId, reason) {
        let connection;
        try {
            connection = await db.getConnection();
            
            await connection.query(
                `INSERT INTO audit_log (
                    user_type, user_id, action, entity, entity_id, timestamp
                ) VALUES ('admin', ?, 'commission_cancelled', 'commission', ?, NOW())`,
                [userId, commissionId]
            );
            
            console.log(`✅ Cancellation audit logged for commission ${commissionId}`);
            
        } catch (error) {
            console.error('Failed to log cancellation audit:', error);
        } finally {
            if (connection) connection.release();
        }
    }
    
    // Log email notification
    async logEmailNotification(commissionId, recipientEmail, notificationType, status) {
        let connection;
        try {
            connection = await db.getConnection();
            
            await connection.query(
                `INSERT INTO audit_log (
                    user_type, user_id, action, entity, entity_id, timestamp
                ) VALUES ('system', 0, 'email_sent', 'commission', ?, NOW())`,
                [commissionId]
            );
            
            console.log(`✅ Email audit logged for commission ${commissionId}`);
            
        } catch (error) {
            console.error('Failed to log email audit:', error);
        } finally {
            if (connection) connection.release();
        }
    }
    
    // Log report generation
    async logReportGeneration(userId, reportType, filters, recordsCount, format) {
        let connection;
        try {
            connection = await db.getConnection();
            
            await connection.query(
                `INSERT INTO audit_log (
                    user_type, user_id, action, entity, entity_id, timestamp
                ) VALUES ('admin', ?, 'report_generated', 'commission', NULL, NOW())`,
                [userId]
            );
            
            console.log(`✅ Report generation audit logged: ${reportType}`);
            
        } catch (error) {
            console.error('Failed to log report audit:', error);
        } finally {
            if (connection) connection.release();
        }
    }
    
    // Get audit logs for a specific commission
    async getCommissionAuditLogs(commissionId, limit = 50, offset = 0) {
        let connection;
        try {
            connection = await db.getConnection();
            
            const [logs] = await connection.query(
                `SELECT * FROM audit_log 
                 WHERE entity = 'commission' AND entity_id = ?
                 ORDER BY timestamp DESC
                 LIMIT ? OFFSET ?`,
                [commissionId, limit, offset]
            );
            
            return logs;
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            return [];
        } finally {
            if (connection) connection.release();
        }
    }
    
    // Get all commission-related audit logs
    async getAllCommissionAuditLogs(filters = {}, limit = 100, offset = 0) {
        let connection;
        try {
            connection = await db.getConnection();
            
            let query = `SELECT * FROM audit_log 
                         WHERE entity = 'commission'`;
            const params = [];
            
            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }
            
            if (filters.user_id) {
                query += ' AND user_id = ?';
                params.push(filters.user_id);
            }
            
            if (filters.start_date) {
                query += ' AND timestamp >= ?';
                params.push(filters.start_date);
            }
            
            if (filters.end_date) {
                query += ' AND timestamp <= ?';
                params.push(filters.end_date);
            }
            
            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const [logs] = await connection.query(query, params);
            
            // Get total count
            const [countResult] = await connection.query(
                `SELECT COUNT(*) as total FROM audit_log WHERE entity = 'commission'`,
                []
            );
            
            return {
                logs,
                total: countResult[0].total,
                limit,
                offset
            };
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            return { logs: [], total: 0 };
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = new AuditLogService();