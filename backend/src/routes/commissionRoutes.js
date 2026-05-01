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
// Add to commissionRoutes.js - Debug endpoint to see actual totals
router.get('/debug/totals', async (req, res) => {
    try {
        // Get total commission without any filter
        const totalAll = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM commission');
        
        // Get commission by date range
        const { start_date, end_date } = req.query;
        let totalFiltered = 0;
        let filteredResult = null;
        
        if (start_date && end_date) {
            filteredResult = await db.query(
                'SELECT COALESCE(SUM(amount), 0) as total FROM commission WHERE created_at BETWEEN $1::date AND $2::date',
                [start_date, end_date]
            );
            totalFiltered = parseFloat(filteredResult.rows[0]?.total || 0);
        }
        
        // Get all commission records with their dates
        const allCommissions = await db.query(
            'SELECT commission_id, amount, created_at, status FROM commission ORDER BY created_at DESC'
        );
        
        // Get policy count
        const allPolicies = await db.query('SELECT COUNT(*) as count FROM policy');
        const filteredPolicies = start_date && end_date ? 
            await db.query('SELECT COUNT(*) as count FROM policy WHERE created_at BETWEEN $1::date AND $2::date', [start_date, end_date]) :
            { rows: [{ count: 0 }] };
        
        res.json({
            total_commission_all_time: parseFloat(totalAll.rows[0]?.total || 0),
            total_commission_filtered: totalFiltered,
            date_range: { start_date, end_date },
            all_commissions: allCommissions.rows.map(c => ({
                id: c.commission_id,
                amount: c.amount,
                date: c.created_at,
                status: c.status
            })),
            total_policies_all_time: parseInt(allPolicies.rows[0]?.count || 0),
            total_policies_filtered: parseInt(filteredPolicies.rows[0]?.count || 0),
            message: totalFiltered !== 1030 ? 'Date filter is excluding some commissions. Check the dates above.' : 'Commission total matches!'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all-time totals (no date filter)
router.get('/totals/all-time', async (req, res) => {
    try {
        const commissionTotal = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM commission');
        const policyTotal = await db.query('SELECT COUNT(*) as count FROM policy');
        const agentTotal = await db.query('SELECT COUNT(*) as count FROM agent WHERE status = \'active\'');
        
        res.json({
            total_commission: parseFloat(commissionTotal.rows[0]?.total || 0),
            total_policies: parseInt(policyTotal.rows[0]?.count || 0),
            total_agents: parseInt(agentTotal.rows[0]?.count || 0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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
// // Get commission summary report
// router.get('/report/summary', async (req, res) => {
//     console.log('🔍 /report/summary route was called');
//     console.log('📅 Query params:', req.query);
    
//     try {
//         const { start_date, end_date } = req.query;
        
//         if (!start_date || !end_date) {
//             return res.status(400).json({ error: 'start_date and end_date are required' });
//         }
        
//         const summaryResult = await db.query(
//             `SELECT 
//                 COALESCE(SUM(amount), 0) as total_commissions,
//                 COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_commissions,
//                 COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commissions,
//                 COUNT(DISTINCT agent_id) as total_agents,
//                 COUNT(DISTINCT CASE WHEN status = 'paid' THEN agent_id END) as active_agents,
//                 ROUND(AVG(rate), 2) as avg_commission_rate,
//                 COUNT(policy_id) as total_policies
//             FROM commission
//             WHERE created_at BETWEEN $1 AND $2`,
//             [start_date, end_date]
//         );
        
//         const monthlyResult = await db.query(
//             `SELECT 
//                 TO_CHAR(created_at, 'Mon') as month,
//                 COALESCE(SUM(amount), 0) as commission_amounts,
//                 COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amounts,
//                 COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amounts
//             FROM commission
//             WHERE created_at BETWEEN $1 AND $2
//             GROUP BY EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Mon')
//             ORDER BY EXTRACT(MONTH FROM created_at)`,
//             [start_date, end_date]
//         );
        
//         const topAgentsResult = await db.query(
//             `SELECT 
//                 CONCAT(a.first_name, ' ', a.last_name) as name,
//                 SUM(c.amount) as commission,
//                 COUNT(c.policy_id) as policies,
//                 ROUND(AVG(c.rate), 2) as rate
//             FROM commission c
//             JOIN agent a ON c.agent_id = a.agent_id
//             WHERE c.created_at BETWEEN $1 AND $2
//             GROUP BY c.agent_id, a.first_name, a.last_name
//             ORDER BY commission DESC
//             LIMIT 5`,
//             [start_date, end_date]
//         );
        
//         const summaryData = summaryResult.rows ? summaryResult.rows[0] : summaryResult[0];
//         const monthlyData = monthlyResult.rows ? monthlyResult.rows : monthlyResult;
//         const topAgentsData = topAgentsResult.rows ? topAgentsResult.rows : topAgentsResult;
        
//         res.json({
//             summary: summaryData,
//             chartData: {
//                 labels: monthlyData.map(m => m.month),
//                 commission_amounts: monthlyData.map(m => parseFloat(m.commission_amounts)),
//                 paid_amounts: monthlyData.map(m => parseFloat(m.paid_amounts)),
//                 pending_amounts: monthlyData.map(m => parseFloat(m.pending_amounts))
//             },
//             topAgents: topAgentsData.map(agent => ({
//                 ...agent,
//                 commission: parseFloat(agent.commission),
//                 rate: parseFloat(agent.rate)
//             })),
//             period: { start_date, end_date }
//         });
        
//     } catch (error) {
//         console.error('Error generating report:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

router.get('/report/summary', async (req, res) => {
    console.log('🔍 /report/summary route was called');
    console.log('📅 Query params:', req.query);
    
    try {
        let { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        // Add time to end_date to include the entire day
        const startDateTime = `${start_date} 00:00:00`;
        const endDateTime = `${end_date} 23:59:59`;
        
        console.log('📅 Date range for query:', { start_date, end_date, startDateTime, endDateTime });
        
        // ✅ FIX: Get average commission rate from AGENT table (not commission table)
        const avgRateQuery = `
            SELECT ROUND(COALESCE(AVG(commission_rate), 0), 2) as avg_commission_rate
            FROM agent
            WHERE status = 'active'
        `;
        const avgRateResult = await db.query(avgRateQuery);
        const avgCommissionRate = parseFloat(avgRateResult.rows[0]?.avg_commission_rate) || 0;
        
        console.log('📊 Avg commission rate from agent table:', avgCommissionRate);
        
        // Get commission summary (without avg_rate)
        const summaryQuery = `
            SELECT 
                COALESCE(SUM(amount), 0) as total_commissions,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_commissions,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commissions,
                COUNT(DISTINCT agent_id) as total_agents,
                COUNT(DISTINCT CASE WHEN status = 'paid' THEN agent_id END) as active_agents
            FROM commission
            WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
        `;
        
        const summaryResult = await db.query(summaryQuery, [startDateTime, endDateTime]);
        
        // Get TOTAL POLICIES from policy table
        const totalPoliciesQuery = `
            SELECT COUNT(*) as total_policies
            FROM policy
            WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
        `;
        const totalPoliciesResult = await db.query(totalPoliciesQuery, [startDateTime, endDateTime]);
        const totalPolicies = parseInt(totalPoliciesResult.rows[0]?.total_policies) || 0;
        
        console.log('📊 Total policies from policy table:', totalPolicies);
        
        // Monthly data
        const monthlyQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                COALESCE(SUM(amount), 0) as commission_amounts,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amounts,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amounts
            FROM commission
            WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        `;
        
        const monthlyResult = await db.query(monthlyQuery, [startDateTime, endDateTime]);
        
        // Top agents - use agent's commission_rate and count policies from policy table
        const topAgentsQuery = `
            SELECT 
                CONCAT(a.first_name, ' ', a.last_name) as name,
                COALESCE(SUM(c.amount), 0) as commission,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM policy p 
                    WHERE p.agent_id = a.agent_id 
                    AND p.created_at >= $1::timestamp 
                    AND p.created_at <= $2::timestamp
                ), 0) as policies,
                COALESCE(a.commission_rate, 0) as rate
            FROM commission c
            JOIN agent a ON c.agent_id = a.agent_id
            WHERE c.created_at >= $1::timestamp AND c.created_at <= $2::timestamp
            GROUP BY a.agent_id, a.first_name, a.last_name, a.commission_rate
            ORDER BY commission DESC
            LIMIT 5
        `;
        
        const topAgentsResult = await db.query(topAgentsQuery, [startDateTime, endDateTime]);
        
        const summaryData = summaryResult.rows[0];
        const monthlyData = monthlyResult.rows;
        const topAgentsData = topAgentsResult.rows;
        
        console.log('💰 Final total_commissions:', summaryData.total_commissions);
        console.log('📊 Top agent policies count:', topAgentsData[0]?.policies);
        console.log('📊 Top agent rate:', topAgentsData[0]?.rate);
        
        res.json({
            summary: {
                total_commissions: parseFloat(summaryData.total_commissions) || 0,
                paid_commissions: parseFloat(summaryData.paid_commissions) || 0,
                pending_commissions: parseFloat(summaryData.pending_commissions) || 0,
                total_agents: parseInt(summaryData.total_agents) || 0,
                active_agents: parseInt(summaryData.active_agents) || 0,
                avg_commission_rate: avgCommissionRate,  // ✅ Now from agent table (10%)
                total_policies: totalPolicies
            },
            chartData: {
                labels: monthlyData.map(m => m.month),
                commission_amounts: monthlyData.map(m => parseFloat(m.commission_amounts)),
                paid_amounts: monthlyData.map(m => parseFloat(m.paid_amounts)),
                pending_amounts: monthlyData.map(m => parseFloat(m.pending_amounts))
            },
            topAgents: topAgentsData.map(agent => ({
                name: agent.name,
                commission: parseFloat(agent.commission),
                policies: parseInt(agent.policies),
                rate: parseFloat(agent.rate)
            })),
            period: { start_date, end_date }
        });
        
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
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

// // Pay commission (manual payment)
// router.put('/:commissionId/pay', async (req, res) => {
//     try {
//         const { commissionId } = req.params;
//         const { payment_reference, payment_method, payment_date, notes } = req.body;
        
//         if (!payment_reference) {
//             return res.status(400).json({ error: 'Payment reference is required' });
//         }
        
//         // Get commission with agent details
//         const oldResult = await db.query(
//             `SELECT c.*, a.email, a.first_name, a.last_name 
//              FROM commission c
//              JOIN agent a ON c.agent_id = a.agent_id
//              WHERE c.commission_id = $1`,
//             [commissionId]
//         );
        
//         const oldData = oldResult.rows ? oldResult.rows : oldResult;
        
//         if (!oldData.length) {
//             return res.status(404).json({ error: 'Commission not found' });
//         }
        
//         if (oldData[0].status === 'paid') {
//             return res.status(400).json({ error: 'Commission already paid' });
//         }
        
//         const commission = oldData[0];
//         const amount = parseFloat(commission.amount) || 0;
        
//         // Update commission
//         await db.query(
//             `UPDATE commission 
//              SET status = 'paid', 
//                  paid_at = COALESCE($1, CURRENT_DATE),
//                  payment_reference = $2,
//                  updated_at = NOW()
//              WHERE commission_id = $3`,
//             [payment_date || new Date().toISOString().split('T')[0], payment_reference, commissionId]
//         );
        
//         // Get updated commission
//         const newResult = await db.query(
//             'SELECT * FROM commission WHERE commission_id = $1',
//             [commissionId]
//         );
        
//         const newData = newResult.rows ? newResult.rows : newResult;
        
//         // Record in transaction table - using actual columns from your table
//         await db.query(
//             `INSERT INTO transaction (
//                 related_commission_id, amount, type, status, created_at, notes, payment_method
//             ) VALUES ($1, $2, 'commission_payment', 'completed', NOW(), $3, $4)`,
//             [commissionId, commission.amount, notes || `Manual payment - Reference: ${payment_reference}`, payment_method || 'manual']
//         );
        
//         // Send payment confirmation email to agent
//         if (commission.email) {
//             const commissionDetails = {
//                 commission_id: commissionId,
//                 policy_id: commission.policy_id,
//                 amount: amount,
//                 rate: commission.rate,
//                 payment_date: payment_date || new Date().toISOString().split('T')[0],
//                 payment_reference: payment_reference,
//                 payment_method: payment_method || 'Manual',
//                 notes: notes
//             };
            
//             await emailService.sendManualPaymentConfirmationEmail(
//                 commissionId,
//                 commission.email,
//                 `${commission.first_name} ${commission.last_name}`,
//                 commissionDetails
//             );
//         }
        
//         res.json({ 
//             success: true, 
//             message: 'Commission paid successfully',
//             commission: newData[0]
//         });
        
//     } catch (error) {
//         console.error('Payment error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });
// Pay commission (manual payment) - Corrected column names
router.put('/:commissionId/pay', async (req, res) => {
    try {
        const { commissionId } = req.params;
        const { payment_reference, payment_method, payment_date, notes } = req.body;
        
        if (!payment_reference) {
            return res.status(400).json({ error: 'Payment reference is required' });
        }
        
        await db.query('BEGIN');
        
        // Get commission with agent details
        const commissionResult = await db.query(
            `SELECT c.*, a.email, a.first_name, a.last_name 
             FROM commission c
             JOIN agent a ON c.agent_id = a.agent_id
             WHERE c.commission_id = $1`,
            [commissionId]
        );
        
        const commission = commissionResult.rows[0];
        
        if (!commission) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Commission not found' });
        }
        
        if (commission.status === 'paid') {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: 'Commission already paid' });
        }
        
        const agentId = commission.agent_id;
        const amount = parseFloat(commission.amount) || 0;
        
        // 1. Update commission status
        await db.query(
            `UPDATE commission 
             SET status = 'paid', 
                 paid_at = COALESCE($1, CURRENT_DATE),
                 payment_reference = $2,
                 updated_at = NOW()
             WHERE commission_id = $3`,
            [payment_date || new Date().toISOString().split('T')[0], payment_reference, commissionId]
        );
        
        // 2. Debit company account
        const debitResult = await db.query(
            `UPDATE company_account 
             SET balance = balance - $1,
                 updated_at = NOW()
             WHERE account_type = 'operating'
             RETURNING balance`,
            [amount]
        );
        
        console.log(`✅ Company account debited: $${amount}. New balance: $${debitResult.rows[0].balance}`);
        
        // 3. Credit agent payment account
        let agentAccountResult = await db.query(
            `SELECT * FROM agent_payment_account WHERE agent_id = $1`,
            [agentId]
        );
        
        if (agentAccountResult.rows.length === 0) {
            await db.query(
                `INSERT INTO agent_payment_account (agent_id, balance, total_earned, status, created_at)
                 VALUES ($1, 0, 0, 'active', NOW())`,
                [agentId]
            );
        }
        
        const creditResult = await db.query(
            `UPDATE agent_payment_account 
             SET balance = balance + $1,
                 total_earned = total_earned + $1,
                 last_payment_date = CURRENT_DATE,
                 updated_at = NOW()
             WHERE agent_id = $2
             RETURNING balance, total_earned`,
            [amount, agentId]
        );
        
        console.log(`✅ Agent ${agentId} account credited: $${amount}. New balance: $${creditResult.rows[0].balance}`);
        
        // 4. Record in transaction table
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        await db.query(
            `INSERT INTO transaction (
                transaction_id, related_commission_id, amount, type, status, 
                created_at, notes, payment_method
            ) VALUES ($1, $2, $3, 'commission_payment', 'completed', NOW(), $4, $5)`,
            [transactionId, commissionId, amount, notes || `Manual payment - Reference: ${payment_reference}`, payment_method || 'manual']
        );
        
        // 5. Record in ledger transactions (Corrected column names)
        await db.query(
            `INSERT INTO ledger_transactions (
                transaction_type, amount, 
                from_account_type, from_account_id,
                to_account_type, to_account_id, 
                reference_id, description, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW())`,
            [
                'commission_payout',
                amount,
                'company',
                1,
                'agent',
                agentId,
                commissionId.toString(),
                `Manual commission payout for commission #${commissionId} - Agent: ${commission.first_name} ${commission.last_name}`
            ]
        );
        
        // 6. Send email notification
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
        
        await db.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Commission paid successfully',
            commission: { ...commission, status: 'paid' },
            company_balance: debitResult.rows[0].balance,
            agent_balance: creditResult.rows[0].balance
        });
        
    } catch (error) {
        await db.query('ROLLBACK');
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

// // Get agent performance report
// router.get('/report/agent-performance', async (req, res) => {
//     console.log('🔍 /report/agent-performance route was called');
//     console.log('Query params:', req.query);
    
//     try {
//         const { start_date, end_date } = req.query;
        
//         console.log('Dates received:', { start_date, end_date });
        
//         if (!start_date || !end_date) {
//             return res.status(400).json({ error: 'start_date and end_date are required' });
//         }
        
//         const query = `
//             SELECT 
//                 a.agent_id,
//                 a.first_name,
//                 a.last_name,
//                 a.email,
//                 a.commission_rate,
//                 a.total_sales,
//                 a.status as agent_status,
//                 COALESCE(SUM(c.amount), 0) as total_commission,
//                 COUNT(DISTINCT c.commission_id) as total_transactions,
//                 COUNT(DISTINCT c.policy_id) as policies_sold,
//                 COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commission,
//                 COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commission
//             FROM agent a
//             LEFT JOIN commission c ON a.agent_id = c.agent_id 
//                 AND c.created_at >= $1::date 
//                 AND c.created_at <= $2::date
//             WHERE a.status IN ('active', 'pending')
//             GROUP BY a.agent_id, a.first_name, a.last_name, a.email, a.commission_rate, a.total_sales, a.status
//             ORDER BY total_commission DESC
//         `;
        
//         console.log('Executing query with params:', [start_date, end_date]);
        
//         const agentsResult = await db.query(query, [start_date, end_date]);
        
//         const agents = agentsResult.rows ? agentsResult.rows : agentsResult;
        
//         console.log(`✅ Found ${agents.length} agents`);
        
//         // Log each agent's data
//         agents.forEach((agent, index) => {
//             console.log(`Agent ${index + 1}:`, {
//                 id: agent.agent_id,
//                 name: `${agent.first_name} ${agent.last_name}`,
//                 commission: agent.total_commission,
//                 policies: agent.policies_sold,
//                 status: agent.agent_status
//             });
//         });
        
//         if (agents.length === 0) {
//             console.log('⚠️ No agents found. Checking if agent table has data...');
//             const agentCount = await db.query('SELECT COUNT(*) FROM agent');
//             console.log('Total agents in database:', agentCount.rows ? agentCount.rows[0] : agentCount[0]);
//         }
        
//         const summary = {
//             total_agents: agents.length,
//             active_agents: agents.filter(a => a.agent_status === 'active').length,
//             total_commissions: agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0),
//             total_policies: agents.reduce((sum, a) => sum + parseInt(a.policies_sold || 0), 0),
//             avg_commission_per_agent: agents.length ? agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0) / agents.length : 0,
//             top_performer: agents[0] ? `${agents[0].first_name} ${agents[0].last_name}` : 'N/A',
//             top_performer_commission: agents[0] ? parseFloat(agents[0].total_commission || 0) : 0
//         };
        
//         console.log('📊 Summary calculated:', summary);
        
//         const responseData = {
//             summary: summary,
//             agents: agents.map(agent => ({
//                 name: `${agent.first_name} ${agent.last_name}`,
//                 agent_id: agent.agent_id,
//                 commission: parseFloat(agent.total_commission || 0),
//                 policies: parseInt(agent.policies_sold || 0),
//                 rate: parseFloat(agent.commission_rate || 0),
//                 status: agent.agent_status || 'pending',
//                 total_sales: agent.total_sales || 0,
//                 email: agent.email
//             })),
//             period: { start_date, end_date }
//         };
        
//         console.log('📤 Sending response with agents:', responseData.agents.length);
//         console.log('First agent in response:', responseData.agents[0]);
        
//         res.json(responseData);
        
//     } catch (error) {
//         console.error('❌ Error generating agent performance report:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ error: error.message });
//     }
// });
router.get('/report/agent-performance', async (req, res) => {
    console.log('🔍 /report/agent-performance route was called');
    console.log('Query params:', req.query);
    
    try {
        let { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const startDateTime = `${start_date} 00:00:00`;
        const endDateTime = `${end_date} 23:59:59`;
        
        // ✅ FIXED: Get total policies from policy table for each agent
        const query = `
            SELECT 
                a.agent_id,
                a.first_name,
                a.last_name,
                a.email,
                a.commission_rate,
                a.total_sales,
                a.status as agent_status,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM policy p 
                    WHERE p.agent_id = a.agent_id 
                    AND p.created_at >= $1::timestamp 
                    AND p.created_at <= $2::timestamp
                ), 0) as policies_sold,
                COALESCE(SUM(c.amount), 0) as total_commission,
                COUNT(DISTINCT c.commission_id) as total_transactions,
                COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commission,
                COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commission
            FROM agent a
            LEFT JOIN commission c ON a.agent_id = c.agent_id 
                AND c.created_at >= $1::timestamp 
                AND c.created_at <= $2::timestamp
            WHERE a.status IN ('active', 'pending')
            GROUP BY a.agent_id, a.first_name, a.last_name, a.email, a.commission_rate, a.total_sales, a.status
            ORDER BY total_commission DESC
        `;
        
        const agentsResult = await db.query(query, [startDateTime, endDateTime]);
        const agents = agentsResult.rows;
        
        // Get total policies for the period (all agents combined)
        const totalPoliciesQuery = `
            SELECT COUNT(*) as total
            FROM policy
            WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
        `;
        const totalPoliciesResult = await db.query(totalPoliciesQuery, [startDateTime, endDateTime]);
        const totalPolicies = parseInt(totalPoliciesResult.rows[0]?.total) || 0;
        
        console.log(`✅ Found ${agents.length} agents`);
        
        const summary = {
            total_agents: agents.length,
            active_agents: agents.filter(a => a.agent_status === 'active').length,
            total_commissions: agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0),
            total_policies: totalPolicies,
            avg_commission_per_agent: agents.length ? agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0) / agents.length : 0,
            top_performer: agents[0] ? `${agents[0].first_name} ${agents[0].last_name}` : 'N/A',
            top_performer_commission: agents[0] ? parseFloat(agents[0].total_commission || 0) : 0
        };
        
        const responseData = {
            summary: summary,
            agents: agents.map(agent => ({
                name: `${agent.first_name} ${agent.last_name}`,
                agent_id: agent.agent_id,
                commission: parseFloat(agent.total_commission || 0),
                policies: parseInt(agent.policies_sold || 0),  // ✅ Now counts ALL policies
                rate: parseFloat(agent.commission_rate || 0),
                status: agent.agent_status || 'pending',
                total_sales: agent.total_sales || 0,
                email: agent.email
            })),
            period: { start_date, end_date }
        };
        
        console.log('📊 Agent policies count:', responseData.agents[0]?.policies);
        
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Error generating agent performance report:', error);
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