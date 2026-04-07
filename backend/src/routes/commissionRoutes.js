// backend/routes/commissionRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const authenticateToken = authenticate;
const isAdmin = adminMiddleware;
const auditLogService = require('../services/auditLogServices');
const emailService = require('../services/emailServices');

// Helper function to convert to CSV
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => `"${obj[header] || ''}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
};

// Helper function to generate PDF (simplified version)
const generateCommissionPDF = async (commissions, period) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(20).text('Commission Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${period.start_date} to ${period.end_date}`);
    doc.moveDown();
    
    doc.fontSize(10).text('Agent Name', 50, doc.y);
    doc.text('Amount', 200, doc.y);
    doc.text('Status', 300, doc.y);
    doc.text('Date', 400, doc.y);
    doc.moveDown();
    
    commissions.forEach(comm => {
        doc.text(comm.agent_name, 50, doc.y);
        doc.text(`$${comm.amount}`, 200, doc.y);
        doc.text(comm.status, 300, doc.y);
        doc.text(comm.created_at, 400, doc.y);
        doc.moveDown();
    });
    
    doc.end();
    return Buffer.concat(buffers);
};

// ==================== GET ROUTES ====================

router.get('/test', (req, res) => {
    console.log('✅ Test route hit!');
    res.json({ message: 'Commission routes are working!' });
});

// Get all commissions with filters
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { status, agent_id, start_date, end_date } = req.query;
        let query = 'SELECT * FROM commission WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = $' + (params.length + 1);
            params.push(status);
        }
        if (agent_id) {
            query += ' AND agent_id = $' + (params.length + 1);
            params.push(agent_id);
        }
        if (start_date) {
            query += ' AND created_at >= $' + (params.length + 1);
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND created_at <= $' + (params.length + 1);
            params.push(end_date);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [commissions] = await db.query(query, params);
        res.json(commissions);
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get commission by ID
router.get('/:commissionId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { commissionId } = req.params;
        const [commissions] = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        if (commissions.length === 0) {
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        res.json(commissions[0]);
    } catch (error) {
        console.error('Error fetching commission:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get commission summary report - FIXED for your db wrapper
router.get('/report/summary', authenticateToken, isAdmin, async (req, res) => {
    console.log('🔍 /report/summary route was called');
    console.log('📅 Query params:', req.query);
    
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        // FIXED: Remove the [] destructuring
        const summary = await db.query(
            `SELECT 
                COALESCE(SUM(amount), 0) as total_commissions,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_commissions,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commissions,
                COUNT(DISTINCT agent_id) as total_agents,
                COUNT(DISTINCT CASE WHEN status = 'paid' THEN agent_id END) as active_agents,
                ROUND(AVG(rate), 2) as avg_commission_rate,
                COUNT(policy_id) as total_policies
            FROM commission
            WHERE created_at BETWEEN $1 AND $2`,
            [start_date, end_date]
        );
        
        // FIXED: Remove the [] destructuring
        const monthly = await db.query(
            `SELECT 
                TO_CHAR(created_at, 'Mon') as month,
                COALESCE(SUM(amount), 0) as commission_amounts,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amounts,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amounts
            FROM commission
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Mon')
            ORDER BY EXTRACT(MONTH FROM created_at)`,
            [start_date, end_date]
        );
        
        // FIXED: Remove the [] destructuring
        const topAgents = await db.query(
            `SELECT 
                CONCAT(a.first_name, ' ', a.last_name) as name,
                SUM(c.amount) as commission,
                COUNT(c.policy_id) as policies,
                ROUND(AVG(c.rate), 2) as rate
            FROM commission c
            JOIN agent a ON c.agent_id = a.agent_id
            WHERE c.created_at BETWEEN $1 AND $2
            GROUP BY c.agent_id, a.first_name, a.last_name
            ORDER BY commission DESC
            LIMIT 5`,
            [start_date, end_date]
        );
        
        // Handle the response based on your db wrapper
        const summaryData = summary.rows ? summary.rows[0] : summary[0];
        const monthlyData = monthly.rows ? monthly.rows : monthly;
        const topAgentsData = topAgents.rows ? topAgents.rows : topAgents;
        
        res.json({
            summary: summaryData,
            chartData: {
                labels: monthlyData.map(m => m.month),
                commission_amounts: monthlyData.map(m => parseFloat(m.commission_amounts)),
                paid_amounts: monthlyData.map(m => parseFloat(m.paid_amounts)),
                pending_amounts: monthlyData.map(m => parseFloat(m.pending_amounts))
            },
            topAgents: topAgentsData.map(agent => ({
                ...agent,
                commission: parseFloat(agent.commission),
                rate: parseFloat(agent.rate)
            })),
            period: { start_date, end_date }
        });
        
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export commission report
router.get('/report/export', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { start_date, end_date, format = 'csv' } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const [commissions] = await db.query(
            `SELECT 
                c.commission_id,
                CONCAT(a.first_name, ' ', a.last_name) as agent_name,
                c.policy_id,
                c.premium_amount,
                c.rate,
                c.amount,
                c.status,
                c.created_at,
                c.paid_at,
                c.payment_reference
            FROM commission c
            JOIN agent a ON c.agent_id = a.agent_id
            WHERE c.created_at BETWEEN $1 AND $2
            ORDER BY c.created_at DESC`,
            [start_date, end_date]
        );
        
        if (format === 'csv') {
            const csv = convertToCSV(commissions);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=commission_report_${start_date}_to_${end_date}.csv`);
            return res.send(csv);
        } else if (format === 'pdf') {
            const pdfBuffer = await generateCommissionPDF(commissions, { start_date, end_date });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=commission_report_${start_date}_to_${end_date}.pdf`);
            return res.send(pdfBuffer);
        } else {
            res.status(400).json({ error: 'Invalid format. Use csv or pdf' });
        }
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PUT ROUTES ====================

// Update commission rate
router.put('/:commissionId/rate', authenticateToken, isAdmin, async (req, res) => {
    let connection;
    try {
        const { commissionId } = req.params;
        const { rate } = req.body;
        
        if (!rate || isNaN(rate) || rate < 0 || rate > 100) {
            return res.status(400).json({ error: 'Invalid rate. Must be between 0 and 100' });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [oldData] = await connection.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        if (!oldData.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        const oldRate = oldData[0].rate;
        const newAmount = (oldData[0].premium_amount * rate) / 100;
        
        await connection.query(
            `UPDATE commission 
             SET rate = $1, amount = $2, updated_at = NOW()
             WHERE commission_id = $3`,
            [rate, newAmount, commissionId]
        );
        
        const [newData] = await connection.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Commission rate updated successfully',
            commission: newData[0]
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Rate update error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Pay commission (manual payment)
router.put('/:commissionId/pay', authenticateToken, isAdmin, async (req, res) => {
    let connection;
    try {
        const { commissionId } = req.params;
        const { payment_reference } = req.body;
        
        if (!payment_reference) {
            return res.status(400).json({ error: 'Payment reference is required' });
        }
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [oldData] = await connection.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        if (!oldData.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        if (oldData[0].status === 'paid') {
            await connection.rollback();
            return res.status(400).json({ error: 'Commission already paid' });
        }
        
        await connection.query(
            `UPDATE commission 
             SET status = 'paid', 
                 paid_at = CURRENT_DATE,
                 payment_reference = $1,
                 updated_at = NOW()
             WHERE commission_id = $2`,
            [payment_reference, commissionId]
        );
        
        const [newData] = await connection.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Commission paid successfully',
            commission: newData[0]
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Cancel commission
router.put('/:commissionId/cancel', authenticateToken, isAdmin, async (req, res) => {
    let connection;
    try {
        const { commissionId } = req.params;
        const { reason } = req.body;
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [oldData] = await connection.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        if (!oldData.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        if (oldData[0].status === 'paid') {
            await connection.rollback();
            return res.status(400).json({ error: 'Cannot cancel a paid commission' });
        }
        
        if (oldData[0].status === 'cancelled') {
            await connection.rollback();
            return res.status(400).json({ error: 'Commission already cancelled' });
        }
        
        await connection.query(
            `UPDATE commission 
             SET status = 'cancelled', 
                 cancelled_at = CURRENT_DATE,
                 cancel_reason = $1,
                 updated_at = NOW()
             WHERE commission_id = $2`,
            [reason || 'No reason provided', commissionId]
        );
        
        const [newData] = await connection.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Commission cancelled successfully',
            commission: newData[0]
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Cancel error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ==================== DELETE ROUTES ====================

router.delete('/:commissionId', authenticateToken, isAdmin, async (req, res) => {
    let connection;
    try {
        const { commissionId } = req.params;
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const [commission] = await connection.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        if (!commission.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        await connection.query(
            'DELETE FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Commission deleted successfully' 
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ==================== AUDIT LOG ROUTES ====================

router.get('/audit-logs/:commissionId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const logs = await auditLogService.getCommissionAuditLogs(
            commissionId, 
            parseInt(limit), 
            parseInt(offset)
        );
        
        res.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/audit-logs/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { action, user_id, start_date, end_date, limit = 100, offset = 0 } = req.query;
        
        const filters = { action, user_id, start_date, end_date };
        const logs = await auditLogService.getAllCommissionAuditLogs(
            filters, 
            parseInt(limit), 
            parseInt(offset)
        );
        
        res.json(logs);
    } catch (error) {
        console.error('Error fetching all audit logs:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SUMMARY ROUTES ====================

router.get('/admin/summary', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [summary] = await db.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                ROUND(AVG(rate), 2) as avg_rate
            FROM commission`
        );
        
        res.json(summary[0]);
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Log registered routes
console.log('✅ Commission routes registered:');
router.stack.forEach(r => {
    if (r.route && r.route.path) {
        console.log(`   ${Object.keys(r.route.methods)} ${r.route.path}`);
    }
});
// Get agent performance report - FIXED with proper agent data
router.get('/report/agent-performance', authenticateToken, isAdmin, async (req, res) => {
    console.log('🔍 /report/agent-performance route was called');
    
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const agentsResult = await db.query(
            `SELECT 
                a.agent_id,
                a.first_name,
                a.last_name,
                a.email,
                a.commission_rate,
                a.total_sales,
                a.status as agent_status,
                COALESCE(SUM(c.amount), 0) as total_commission,
                COUNT(c.commission_id) as total_transactions,
                COUNT(c.policy_id) as policies_sold,
                COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commission,
                COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commission
            FROM agent a
            LEFT JOIN commission c ON a.agent_id = c.agent_id 
                AND c.created_at BETWEEN $1 AND $2
            GROUP BY a.agent_id, a.first_name, a.last_name, a.email, a.commission_rate, a.total_sales, a.status
            ORDER BY total_commission DESC`,
            [start_date, end_date]
        );
        
        const agents = agentsResult.rows || agentsResult;
        
        const summary = {
            total_agents: agents.length,
            active_agents: agents.filter(a => a.agent_status === 'active').length,
            total_commissions: agents.reduce((sum, a) => sum + parseFloat(a.total_commission), 0),
            total_policies: agents.reduce((sum, a) => sum + parseInt(a.policies_sold), 0),
            avg_commission_per_agent: agents.length ? agents.reduce((sum, a) => sum + parseFloat(a.total_commission), 0) / agents.length : 0,
            top_performer: agents[0] ? `${agents[0].first_name} ${agents[0].last_name}` : 'N/A',
            top_performer_commission: agents[0] ? parseFloat(agents[0].total_commission) : 0
        };
        
        res.json({
            summary: summary,
            agents: agents,
            period: { start_date, end_date }
        });
        
    } catch (error) {
        console.error('Error generating agent performance report:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;