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

// Get all commissions with filters - FIXED destructuring
router.get('/', async (req, res) => {
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
        
        // FIXED: No destructuring - your db.query returns { rows: [...] }
        const result = await db.query(query, params);
        const commissions = result.rows ? result.rows : result;
        
        res.json(commissions);
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({ error: error.message });
    }
});
// Export commission report - FIXED date handling
router.get('/report/export', async (req, res) => {
    try {
        let { start_date, end_date, format = 'csv' } = req.query;
        
        console.log('📅 Export dates received:', { start_date, end_date });
        
        // If dates are not provided, use default range (last 30 days)
        if (!start_date || !end_date) {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            start_date = start.toISOString().split('T')[0];
            end_date = end.toISOString().split('T')[0];
            console.log('📅 Using default dates:', { start_date, end_date });
        }
        
        // Validate dates are in correct format
        if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
        
        const result = await db.query(
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
            WHERE c.created_at >= $1::date AND c.created_at <= $2::date
            ORDER BY c.created_at DESC`,
            [start_date, end_date]
        );
        
        const commissions = result.rows ? result.rows : result;
        
        console.log(`📊 Exporting ${commissions.length} commissions`);
        
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
// Get commission summary report
router.get('/report/summary', async (req, res) => {
    console.log('🔍 /report/summary route was called');
    console.log('📅 Query params:', req.query);
    
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const summaryResult = await db.query(
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
        
        const monthlyResult = await db.query(
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
        
        const topAgentsResult = await db.query(
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
        
        const summaryData = summaryResult.rows ? summaryResult.rows[0] : summaryResult[0];
        const monthlyData = monthlyResult.rows ? monthlyResult.rows : monthlyResult;
        const topAgentsData = topAgentsResult.rows ? topAgentsResult.rows : topAgentsResult;
        
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



// ==================== PUT ROUTES ====================

// Update commission rate - FIXED destructuring
router.put('/:commissionId/rate', async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { rate } = req.body;
        
        if (!rate || isNaN(rate) || rate < 0 || rate > 100) {
            return res.status(400).json({ error: 'Invalid rate. Must be between 0 and 100' });
        }
        
        // Get old commission data
        const oldResult = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        const oldData = oldResult.rows ? oldResult.rows : oldResult;
        
        if (!oldData.length) {
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        const oldRate = oldData[0].rate;
        const newAmount = (oldData[0].premium_amount * rate) / 100;
        
        // Update commission
        await db.query(
            `UPDATE commission 
             SET rate = $1, amount = $2, updated_at = NOW()
             WHERE commission_id = $3`,
            [rate, newAmount, commissionId]
        );
        
        // Get updated commission
        const newResult = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        const newData = newResult.rows ? newResult.rows : newResult;
        
        res.json({ 
            success: true, 
            message: 'Commission rate updated successfully',
            commission: newData[0]
        });
        
    } catch (error) {
        console.error('Rate update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Pay commission (manual payment)
router.put('/:commissionId/pay', async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { payment_reference, payment_method, payment_date, notes } = req.body;
        
        if (!payment_reference) {
            return res.status(400).json({ error: 'Payment reference is required' });
        }
        
        // Get commission with agent details
        const oldResult = await db.query(
            `SELECT c.*, a.email, a.first_name, a.last_name 
             FROM commission c
             JOIN agent a ON c.agent_id = a.agent_id
             WHERE c.commission_id = $1`,
            [commissionId]
        );
        
        const oldData = oldResult.rows ? oldResult.rows : oldResult;
        
        if (!oldData.length) {
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        if (oldData[0].status === 'paid') {
            return res.status(400).json({ error: 'Commission already paid' });
        }
        
        const commission = oldData[0];
        const amount = parseFloat(commission.amount) || 0;
        
        // Update commission
        await db.query(
            `UPDATE commission 
             SET status = 'paid', 
                 paid_at = COALESCE($1, CURRENT_DATE),
                 payment_reference = $2,
                 updated_at = NOW()
             WHERE commission_id = $3`,
            [payment_date || new Date().toISOString().split('T')[0], payment_reference, commissionId]
        );
        
        // Get updated commission
        const newResult = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        const newData = newResult.rows ? newResult.rows : newResult;
        
        // Record in transaction table - using actual columns from your table
        await db.query(
            `INSERT INTO transaction (
                related_commission_id, amount, type, status, created_at, notes, payment_method
            ) VALUES ($1, $2, 'commission_payment', 'completed', NOW(), $3, $4)`,
            [commissionId, commission.amount, notes || `Manual payment - Reference: ${payment_reference}`, payment_method || 'manual']
        );
        
        // Send payment confirmation email to agent
        if (commission.email) {
            const commissionDetails = {
                commission_id: commissionId,
                policy_id: commission.policy_id,
                amount: amount,
                rate: commission.rate,
                payment_date: payment_date || new Date().toISOString().split('T')[0],
                payment_reference: payment_reference,
                payment_method: payment_method || 'Manual',
                notes: notes
            };
            
            await emailService.sendManualPaymentConfirmationEmail(
                commissionId,
                commission.email,
                `${commission.first_name} ${commission.last_name}`,
                commissionDetails
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Commission paid successfully',
            commission: newData[0]
        });
        
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Cancel commission - WITH DISAPPROVAL EMAIL
router.put('/:commissionId/cancel', async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { reason } = req.body;
        
        console.log('Cancel request received:', { commissionId, reason });
        
        if (!reason) {
            return res.status(400).json({ error: 'Cancellation reason is required' });
        }
        
        // Get commission with agent details
        const oldResult = await db.query(
            `SELECT c.*, a.email, a.first_name, a.last_name 
             FROM commission c
             JOIN agent a ON c.agent_id = a.agent_id
             WHERE c.commission_id = $1`,
            [commissionId]
        );
        
        const oldData = oldResult.rows ? oldResult.rows : oldResult;
        
        if (!oldData.length) {
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        if (oldData[0].status === 'paid') {
            return res.status(400).json({ error: 'Cannot cancel a paid commission' });
        }
        
        if (oldData[0].status === 'cancelled') {
            return res.status(400).json({ error: 'Commission already cancelled' });
        }
        
        const commission = oldData[0];
        const amount = parseFloat(commission.amount) || 0;
        
        // Update commission status to cancelled
        await db.query(
            `UPDATE commission 
             SET status = 'cancelled', 
                 cancelled_at = CURRENT_DATE,
                 cancel_reason = $1,
                 updated_at = NOW()
             WHERE commission_id = $2`,
            [reason, commissionId]
        );
        
        // Get updated commission
        const updatedCommissionResult = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        const updatedCommission = updatedCommissionResult.rows ? updatedCommissionResult.rows[0] : updatedCommissionResult[0];
        
        // Record in transaction table
        await db.query(
            `INSERT INTO transaction (
                related_commission_id, amount, type, status, created_at, notes, failure_reason
            ) VALUES ($1, $2, 'commission_payment', 'cancelled', NOW(), $3, $4)`,
            [commissionId, commission.amount, 'Commission cancelled by admin', reason]
        );
        
        // Send disapproval email with reason
        if (commission.email) {
            await emailService.sendCommissionDisapprovalEmail(
                commissionId,
                commission.email,
                `${commission.first_name} ${commission.last_name}`,
                {
                    commission_id: commissionId,
                    policy_id: commission.policy_id,
                    amount: amount,
                    rate: commission.rate,
                    reason: reason,
                    notes: `Cancelled on ${new Date().toISOString().split('T')[0]}`
                }
            );
        }
        
        // Log to email_notifications table
        await db.query(
            `INSERT INTO email_notifications (
                commission_id, recipient_email, recipient_name, 
                subject, status, sent_at, created_at, notification_type
            ) VALUES ($1, $2, $3, $4, 'sent', NOW(), NOW(), 'commission_cancelled')`,
            [commissionId, commission.email, `${commission.first_name} ${commission.last_name}`, `Commission Cancelled - $${amount.toFixed(2)}`]
        );
        
        res.json({ 
            success: true, 
            message: 'Commission cancelled successfully',
            commission: updatedCommission,
            reason: reason
        });
        
    } catch (error) {
        console.error('Cancel error details:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== DELETE ROUTES ====================

router.delete('/:commissionId', async (req, res) => {
    try {
        const { commissionId } = req.params;
        
        // Get commission data before deletion
        const commissionResult = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        const commission = commissionResult.rows ? commissionResult.rows : commissionResult;
        
        if (!commission.length) {
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        // Delete commission
        await db.query(
            'DELETE FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        res.json({ 
            success: true, 
            message: 'Commission deleted successfully' 
        });
        
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SUMMARY ROUTES ====================

router.get('/admin/summary', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                ROUND(AVG(rate), 2) as avg_rate
            FROM commission`
        );
        
        const summary = result.rows ? result.rows[0] : result[0];
        res.json(summary);
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get agent performance report
router.get('/report/agent-performance', async (req, res) => {
    console.log('🔍 /report/agent-performance route was called');
    console.log('Query params:', req.query);
    
    try {
        const { start_date, end_date } = req.query;
        
        console.log('Dates received:', { start_date, end_date });
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const query = `
            SELECT 
                a.agent_id,
                a.first_name,
                a.last_name,
                a.email,
                a.commission_rate,
                a.total_sales,
                a.status as agent_status,
                COALESCE(SUM(c.amount), 0) as total_commission,
                COUNT(DISTINCT c.commission_id) as total_transactions,
                COUNT(DISTINCT c.policy_id) as policies_sold,
                COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commission,
                COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commission
            FROM agent a
            LEFT JOIN commission c ON a.agent_id = c.agent_id 
                AND c.created_at >= $1::date 
                AND c.created_at <= $2::date
            WHERE a.status IN ('active', 'pending')
            GROUP BY a.agent_id, a.first_name, a.last_name, a.email, a.commission_rate, a.total_sales, a.status
            ORDER BY total_commission DESC
        `;
        
        console.log('Executing query with params:', [start_date, end_date]);
        
        const agentsResult = await db.query(query, [start_date, end_date]);
        
        const agents = agentsResult.rows ? agentsResult.rows : agentsResult;
        
        console.log(`✅ Found ${agents.length} agents`);
        
        // Log each agent's data
        agents.forEach((agent, index) => {
            console.log(`Agent ${index + 1}:`, {
                id: agent.agent_id,
                name: `${agent.first_name} ${agent.last_name}`,
                commission: agent.total_commission,
                policies: agent.policies_sold,
                status: agent.agent_status
            });
        });
        
        if (agents.length === 0) {
            console.log('⚠️ No agents found. Checking if agent table has data...');
            const agentCount = await db.query('SELECT COUNT(*) FROM agent');
            console.log('Total agents in database:', agentCount.rows ? agentCount.rows[0] : agentCount[0]);
        }
        
        const summary = {
            total_agents: agents.length,
            active_agents: agents.filter(a => a.agent_status === 'active').length,
            total_commissions: agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0),
            total_policies: agents.reduce((sum, a) => sum + parseInt(a.policies_sold || 0), 0),
            avg_commission_per_agent: agents.length ? agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0) / agents.length : 0,
            top_performer: agents[0] ? `${agents[0].first_name} ${agents[0].last_name}` : 'N/A',
            top_performer_commission: agents[0] ? parseFloat(agents[0].total_commission || 0) : 0
        };
        
        console.log('📊 Summary calculated:', summary);
        
        const responseData = {
            summary: summary,
            agents: agents.map(agent => ({
                name: `${agent.first_name} ${agent.last_name}`,
                agent_id: agent.agent_id,
                commission: parseFloat(agent.total_commission || 0),
                policies: parseInt(agent.policies_sold || 0),
                rate: parseFloat(agent.commission_rate || 0),
                status: agent.agent_status || 'pending',
                total_sales: agent.total_sales || 0,
                email: agent.email
            })),
            period: { start_date, end_date }
        };
        
        console.log('📤 Sending response with agents:', responseData.agents.length);
        console.log('First agent in response:', responseData.agents[0]);
        
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Error generating agent performance report:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});
// ==================== COMMISSION APPROVAL/DISAPPROVAL ROUTES ====================

// Approve commission (process payment to agent)
router.post('/:commissionId/approve', async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { payment_method = 'stripe', notes } = req.body;
        
        // Get commission with agent details
        const commissionResult = await db.query(
            `SELECT c.*, a.email, a.first_name, a.last_name, a.commission_rate
             FROM commission c
             JOIN agent a ON c.agent_id = a.agent_id
             WHERE c.commission_id = $1 AND c.status = 'pending'`,
            [commissionId]
        );
        
        const commission = commissionResult.rows ? commissionResult.rows[0] : commissionResult[0];
        
        if (!commission) {
            return res.status(404).json({ error: 'Commission not found or already processed' });
        }
        
        // Process payment via Stripe
        let paymentResult;
        if (payment_method === 'stripe') {
            const stripePaymentService = require('../services/stripePaymentService');
            paymentResult = await stripePaymentService.processCommissionPayment(
                commissionId,
                commission.agent_id,
                parseFloat(commission.amount)
            );
        }
        
        // Update commission status to paid
        await db.query(
            `UPDATE commission 
             SET status = 'paid', 
                 paid_at = CURRENT_DATE,
                 payment_reference = COALESCE($1, payment_reference),
                 updated_at = NOW()
             WHERE commission_id = $2`,
            [paymentResult?.paymentIntentId || `MANUAL_${Date.now()}`, commissionId]
        );
        
        // Get updated commission
        const updatedCommissionResult = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        const updatedCommission = updatedCommissionResult.rows ? updatedCommissionResult.rows[0] : updatedCommissionResult[0];
        
        // Record in transaction table
        await db.query(
            `INSERT INTO transaction (
                related_commission_id, amount, type, status, created_at, notes
            ) VALUES ($1, $2, 'commission_payment', 'completed', NOW(), $3)`,
            [commissionId, commission.amount, notes || 'Commission approved and paid']
        );
        
        // Send approval email
        const commissionDetails = {
            commission_id: commissionId,
            policy_id: commission.policy_id,
            amount: commission.amount,
            rate: commission.rate,
            payment_date: new Date().toISOString().split('T')[0],
            payment_reference: paymentResult?.paymentIntentId || 'MANUAL_' + Date.now(),
            status: 'approved'
        };
        
        await emailService.sendCommissionApprovalEmail(
            commissionId,
            commission.email,
            `${commission.first_name} ${commission.last_name}`,
            commissionDetails
        );
        
        res.json({
            success: true,
            message: 'Commission approved and payment processed successfully',
            commission: updatedCommission,
            payment: paymentResult
        });
        
    } catch (error) {
        console.error('Commission approval error:', error);
        res.status(500).json({ error: error.message });
    }
});
// // Approve commission (process payment to agent)
// router.post('/:commissionId/approve',  async (req, res) => {
//     try {
//         const { commissionId } = req.params;
//         const { payment_method = 'stripe', notes } = req.body;
        
//         // Get commission with agent details
//         const commissionResult = await db.query(
//             `SELECT c.*, a.email, a.first_name, a.last_name, a.commission_rate
//              FROM commission c
//              JOIN agent a ON c.agent_id = a.agent_id
//              WHERE c.commission_id = $1 AND c.status = 'pending'`,
//             [commissionId]
//         );
        
//         const commission = commissionResult.rows ? commissionResult.rows[0] : commissionResult[0];
        
//         if (!commission) {
//             return res.status(404).json({ error: 'Commission not found or already processed' });
//         }
        
//         const oldStatus = commission.status;
        
//         // Process payment via Stripe
//         let paymentResult;
//         if (payment_method === 'stripe') {
//             const stripePaymentService = require('../services/stripePaymentService');
//             paymentResult = await stripePaymentService.processCommissionPayment(
//                 commissionId,
//                 commission.agent_id,
//                 parseFloat(commission.amount)
//             );
//         }
        
//         // Update commission status to paid
//         await db.query(
//             `UPDATE commission 
//              SET status = 'paid', 
//                  paid_at = CURRENT_DATE,
//                  payment_reference = COALESCE($1, payment_reference),
//                  updated_at = NOW()
//              WHERE commission_id = $2`,
//             [paymentResult?.paymentIntentId || `MANUAL_${Date.now()}`, commissionId]
//         );
        
//         // Record in transaction table
//         await db.query(
//             `INSERT INTO transaction (
//                 related_commission_id, amount, type, status, created_at, notes
//             ) VALUES ($1, $2, 'commission_payment', 'completed', NOW(), $3)`,
//             [commissionId, commission.amount, notes || 'Commission approved and paid']
//         );
        
//         // Audit log
//         await auditLogService.logCommissionAction(
//             'commission_approved',
//             commissionId,
//             req.user.admin_id,
//             'admin',
//             { amount: commission.amount, payment_method }
//         );
        
//         // Send approval email
//         const commissionDetails = {
//             commission_id: commissionId,
//             policy_id: commission.policy_id,
//             amount: commission.amount,
//             rate: commission.rate,
//             payment_date: new Date().toISOString().split('T')[0],
//             payment_reference: paymentResult?.paymentIntentId || 'MANUAL_' + Date.now(),
//             status: 'approved'
//         };
        
//         await emailService.sendCommissionApprovalEmail(
//             commissionId,
//             commission.email,
//             `${commission.first_name} ${commission.last_name}`,
//             commissionDetails
//         );
        
//         res.json({
//             success: true,
//             message: 'Commission approved and payment processed successfully',
//             commission_id: commissionId,
//             payment: paymentResult
//         });
        
//     } catch (error) {
//         console.error('Commission approval error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });
// Disapprove commission (reject with reason)
router.post('/:commissionId/disapprove', async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { reason, notes } = req.body;
        
        if (!reason) {
            return res.status(400).json({ error: 'Reason for disapproval is required' });
        }
        
        // Get commission with agent details
        const commissionResult = await db.query(
            `SELECT c.*, a.email, a.first_name, a.last_name
             FROM commission c
             JOIN agent a ON c.agent_id = a.agent_id
             WHERE c.commission_id = $1 AND c.status = 'pending'`,
            [commissionId]
        );
        
        const commission = commissionResult.rows ? commissionResult.rows[0] : commissionResult[0];
        
        if (!commission) {
            return res.status(404).json({ error: 'Commission not found or already processed' });
        }
        
        // Update commission status to cancelled
        await db.query(
            `UPDATE commission 
             SET status = 'cancelled', 
                 cancelled_at = CURRENT_DATE,
                 cancel_reason = $1,
                 updated_at = NOW()
             WHERE commission_id = $2`,
            [reason, commissionId]
        );
        
        // Get updated commission
        const updatedCommissionResult = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        const updatedCommission = updatedCommissionResult.rows ? updatedCommissionResult.rows[0] : updatedCommissionResult[0];
        
        // Record in transaction table
        await db.query(
            `INSERT INTO transaction (
                related_commission_id, amount, type, status, created_at, notes, failure_reason
            ) VALUES ($1, $2, 'commission_payment', 'failed', NOW(), $3, $4)`,
            [commissionId, commission.amount, notes || 'Commission disapproved', reason]
        );
        
        // Send disapproval email with reason
        await emailService.sendCommissionDisapprovalEmail(
            commissionId,
            commission.email,
            `${commission.first_name} ${commission.last_name}`,
            {
                commission_id: commissionId,
                policy_id: commission.policy_id,
                amount: commission.amount,
                rate: commission.rate,
                reason: reason,
                notes: notes
            }
        );
        
        res.json({
            success: true,
            message: 'Commission disapproved and cancelled successfully',
            commission: updatedCommission,
            reason: reason
        });
        
    } catch (error) {
        console.error('Commission disapproval error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get commission by ID - FIXED destructuring
router.get('/:commissionId', async (req, res) => {
    try {
        const { commissionId } = req.params;
        const result = await db.query(
            'SELECT * FROM commission WHERE commission_id = $1',
            [commissionId]
        );
        
        const commissions = result.rows ? result.rows : result;
        
        if (commissions.length === 0) {
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        res.json(commissions[0]);
    } catch (error) {
        console.error('Error fetching commission:', error);
        res.status(500).json({ error: error.message });
    }
});

// // Disapprove commission (reject with reason)
// router.post('/:commissionId/disapprove', async (req, res) => {
//     try {
//         const { commissionId } = req.params;
//         const { reason, notes } = req.body;
        
//         if (!reason) {
//             return res.status(400).json({ error: 'Reason for disapproval is required' });
//         }
        
//         // Get commission with agent details
//         const commissionResult = await db.query(
//             `SELECT c.*, a.email, a.first_name, a.last_name
//              FROM commission c
//              JOIN agent a ON c.agent_id = a.agent_id
//              WHERE c.commission_id = $1 AND c.status = 'pending'`,
//             [commissionId]
//         );
        
//         const commission = commissionResult.rows ? commissionResult.rows[0] : commissionResult[0];
        
//         if (!commission) {
//             return res.status(404).json({ error: 'Commission not found or already processed' });
//         }
        
//         const oldStatus = commission.status;
        
//         // Update commission status to cancelled
//         await db.query(
//             `UPDATE commission 
//              SET status = 'cancelled', 
//                  cancelled_at = CURRENT_DATE,
//                  cancel_reason = $1,
//                  updated_at = NOW()
//              WHERE commission_id = $2`,
//             [reason, commissionId]
//         );
        
//         // Record in transaction table
//         await db.query(
//             `INSERT INTO transaction (
//                 related_commission_id, amount, type, status, created_at, notes, failure_reason
//             ) VALUES ($1, $2, 'commission_payment', 'failed', NOW(), $3, $4)`,
//             [commissionId, commission.amount, notes || 'Commission disapproved', reason]
//         );
        
//         // Audit log
//         await auditLogService.logCommissionAction(
//             'commission_disapproved',
//             commissionId,
//             req.user.admin_id,
//             'admin',
//             { reason, amount: commission.amount }
//         );
        
//         // Send disapproval email with reason
//         await emailService.sendCommissionDisapprovalEmail(
//             commissionId,
//             commission.email,
//             `${commission.first_name} ${commission.last_name}`,
//             {
//                 commission_id: commissionId,
//                 policy_id: commission.policy_id,
//                 amount: commission.amount,
//                 rate: commission.rate,
//                 reason: reason,
//                 notes: notes
//             }
//         );
        
//         res.json({
//             success: true,
//             message: 'Commission disapproved and cancelled successfully',
//             commission_id: commissionId,
//             reason: reason
//         });
        
//     } catch (error) {
//         console.error('Commission disapproval error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// Log registered routes
console.log('✅ Commission routes registered:');
router.stack.forEach(r => {
    if (r.route && r.route.path) {
        console.log(`   ${Object.keys(r.route.methods)} ${r.route.path}`);
    }
});

module.exports = router;