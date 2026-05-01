// // backend/services/reportService.js

// const db = require('../config/database');
// const PDFDocument = require('pdfkit');
// const ExcelJS = require('exceljs');
// const fs = require('fs');
// const path = require('path');

// class ReportService {
    
//     // Generate commission summary report
//     async generateCommissionSummary(startDate, endDate, agentId = null) {
//         let query = `
//             SELECT 
//                 c.agent_id,
//                 a.first_name,
//                 a.last_name,
//                 a.email,
//                 COUNT(c.commission_id) as total_transactions,
//                 SUM(c.premium_amount) as total_premium,
//                 SUM(c.amount) as total_commission,
//                 AVG(c.rate) as avg_rate,
//                 SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as paid_commission,
//                 SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as pending_commission,
//                 COUNT(CASE WHEN c.status = 'paid' THEN 1 END) as paid_count,
//                 COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count
//             FROM commission c
//             JOIN agent a ON c.agent_id = a.agent_id
//             WHERE c.created_at BETWEEN ? AND ?
//         `;
        
//         const params = [startDate, endDate];
        
//         if (agentId) {
//             query += ' AND c.agent_id = ?';
//             params.push(agentId);
//         }
        
//         query += ' GROUP BY c.agent_id, a.first_name, a.last_name, a.email ORDER BY total_commission DESC';
        
//         const [results] = await db.query(query, params);
        
//         // Get overall totals
//         const [totals] = await db.query(`
//             SELECT 
//                 COUNT(commission_id) as total_transactions,
//                 SUM(premium_amount) as total_premium,
//                 SUM(amount) as total_commission,
//                 SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_commission,
//                 SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_commission
//             FROM commission
//             WHERE created_at BETWEEN ? AND ?
//             ${agentId ? 'AND agent_id = ?' : ''}
//         `, params);
        
//         return {
//             period: { startDate, endDate },
//             summary: totals[0],
//             agents: results,
//             generated_at: new Date().toISOString()
//         };
//     }
    
//     // Generate detailed transaction report
//     async generateTransactionReport(startDate, endDate, status = null, agentId = null) {
//         let query = `
//             SELECT 
//                 c.commission_id,
//                 c.agent_id,
//                 a.first_name,
//                 a.last_name,
//                 a.email,
//                 c.policy_id,
//                 c.premium_amount,
//                 c.amount as commission_amount,
//                 c.rate,
//                 c.status,
//                 c.created_at,
//                 c.paid_at,
//                 c.payment_reference
//             FROM commission c
//             JOIN agent a ON c.agent_id = a.agent_id
//             WHERE c.created_at BETWEEN ? AND ?
//         `;
        
//         const params = [startDate, endDate];
        
//         if (status) {
//             query += ' AND c.status = ?';
//             params.push(status);
//         }
        
//         if (agentId) {
//             query += ' AND c.agent_id = ?';
//             params.push(agentId);
//         }
        
//         query += ' ORDER BY c.created_at DESC';
        
//         const [transactions] = await db.query(query, params);
        
//         return {
//             period: { startDate, endDate },
//             filters: { status, agentId },
//             transactions,
//             total_records: transactions.length,
//             total_commission: transactions.reduce((sum, t) => sum + parseFloat(t.commission_amount), 0),
//             generated_at: new Date().toISOString()
//         };
//     }
    
//     // // Generate agent performance report
//     // async generateAgentPerformanceReport(year, quarter = null) {
//     //     let query = `
//     //         SELECT 
//     //             a.agent_id,
//     //             a.first_name,
//     //             a.last_name,
//     //             a.email,
//     //             a.total_sales,
//     //             a.commission_rate,
//     //             COUNT(DISTINCT c.policy_id) as policies_sold,
//     //             COUNT(c.commission_id) as commission_transactions,
//     //             SUM(c.premium_amount) as total_premium,
//     //             SUM(c.amount) as total_commission,
//     //             SUM(CASE WHEN MONTH(c.created_at) BETWEEN 1 AND 3 THEN c.amount ELSE 0 END) as q1_commission,
//     //             SUM(CASE WHEN MONTH(c.created_at) BETWEEN 4 AND 6 THEN c.amount ELSE 0 END) as q2_commission,
//     //             SUM(CASE WHEN MONTH(c.created_at) BETWEEN 7 AND 9 THEN c.amount ELSE 0 END) as q3_commission,
//     //             SUM(CASE WHEN MONTH(c.created_at) BETWEEN 10 AND 12 THEN c.amount ELSE 0 END) as q4_commission
//     //         FROM agent a
//     //         LEFT JOIN commission c ON a.agent_id = c.agent_id AND YEAR(c.created_at) = ?
//     //         GROUP BY a.agent_id, a.first_name, a.last_name, a.email, a.total_sales, a.commission_rate
//     //         ORDER BY total_commission DESC
//     //     `;
        
//     //     const params = [year];
        
//     //     const [agents] = await db.query(query, params);
        
//     //     // Calculate overall statistics
//     //     const overallStats = {
//     //         total_agents: agents.length,
//     //         total_commissions: agents.reduce((sum, a) => sum + parseFloat(a.total_commission), 0),
//     //         total_policies: agents.reduce((sum, a) => sum + a.policies_sold, 0),
//     //         avg_commission_per_agent: agents.reduce((sum, a) => sum + parseFloat(a.total_commission), 0) / agents.length,
//     //         top_performer: agents[0] || null
//     //     };
        
//     //     return {
//     //         year,
//     //         quarter: quarter || 'Full Year',
//     //         agents,
//     //         overall_stats: overallStats,
//     //         generated_at: new Date().toISOString()
//     //     };
//     // }
//     // Generate agent performance report
// async generateAgentPerformanceReport(year, quarter = null) {
//     try {
//         console.log(`📊 Generating agent performance report for year: ${year}, quarter: ${quarter || 'full'}`);
        
//         // Build date range based on quarter
//         let startDate = `${year}-01-01`;
//         let endDate = `${year}-12-31`;
        
//         if (quarter) {
//             const quarterMap = {
//                 1: { start: '-01-01', end: '-03-31' },
//                 2: { start: '-04-01', end: '-06-30' },
//                 3: { start: '-07-01', end: '-09-30' },
//                 4: { start: '-10-01', end: '-12-31' }
//             };
//             const q = quarterMap[quarter];
//             if (q) {
//                 startDate = `${year}${q.start}`;
//                 endDate = `${year}${q.end}`;
//             }
//         }
        
//         // ✅ FIXED: Use subqueries instead of JOIN to avoid duplicates
//         const query = `
//             SELECT 
//                 a.agent_id,
//                 a.first_name,
//                 a.last_name,
//                 a.email,
//                 a.total_sales,
//                 a.commission_rate,
//                 a.status as agent_status,
//                 COALESCE((
//                     SELECT COUNT(DISTINCT c.policy_id) 
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as policies_sold,
//                 COALESCE((
//                     SELECT COUNT(c.commission_id) 
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as commission_transactions,
//                 COALESCE((
//                     SELECT SUM(c.premium_amount) 
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as total_premium,
//                 COALESCE((
//                     SELECT SUM(c.amount) 
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as total_commission,
//                 COALESCE((
//                     SELECT SUM(CASE WHEN EXTRACT(MONTH FROM c.created_at) BETWEEN 1 AND 3 THEN c.amount ELSE 0 END)
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as q1_commission,
//                 COALESCE((
//                     SELECT SUM(CASE WHEN EXTRACT(MONTH FROM c.created_at) BETWEEN 4 AND 6 THEN c.amount ELSE 0 END)
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as q2_commission,
//                 COALESCE((
//                     SELECT SUM(CASE WHEN EXTRACT(MONTH FROM c.created_at) BETWEEN 7 AND 9 THEN c.amount ELSE 0 END)
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as q3_commission,
//                 COALESCE((
//                     SELECT SUM(CASE WHEN EXTRACT(MONTH FROM c.created_at) BETWEEN 10 AND 12 THEN c.amount ELSE 0 END)
//                     FROM commission c 
//                     WHERE c.agent_id = a.agent_id 
//                     AND c.created_at >= $1::date 
//                     AND c.created_at <= $2::date
//                 ), 0) as q4_commission
//             FROM agent a
//             WHERE a.status IN ('active', 'pending')
//             ORDER BY total_commission DESC
//         `;
        
//         const agentsResult = await db.query(query, [startDate, endDate]);
//         const agents = agentsResult.rows;
        
//         console.log(`✅ Found ${agents.length} agents for period ${startDate} to ${endDate}`);
        
//         // Calculate overall statistics
//         const overallStats = {
//             total_agents: agents.length,
//             total_commissions: agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0),
//             total_policies: agents.reduce((sum, a) => sum + parseInt(a.policies_sold || 0), 0),
//             avg_commission_per_agent: agents.length ? agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0) / agents.length : 0,
//             top_performer: agents[0] ? {
//                 name: `${agents[0].first_name} ${agents[0].last_name}`,
//                 commission: parseFloat(agents[0].total_commission || 0),
//                 policies: parseInt(agents[0].policies_sold || 0)
//             } : null
//         };
        
//         return {
//             year,
//             quarter: quarter || 'Full Year',
//             period: { startDate, endDate },
//             agents: agents.map(agent => ({
//                 agent_id: agent.agent_id,
//                 name: `${agent.first_name} ${agent.last_name}`,
//                 email: agent.email,
//                 total_sales: parseFloat(agent.total_sales) || 0,
//                 commission_rate: parseFloat(agent.commission_rate) || 0,
//                 status: agent.agent_status,
//                 policies_sold: parseInt(agent.policies_sold) || 0,
//                 commission_transactions: parseInt(agent.commission_transactions) || 0,
//                 total_premium: parseFloat(agent.total_premium) || 0,
//                 total_commission: parseFloat(agent.total_commission) || 0,
//                 q1_commission: parseFloat(agent.q1_commission) || 0,
//                 q2_commission: parseFloat(agent.q2_commission) || 0,
//                 q3_commission: parseFloat(agent.q3_commission) || 0,
//                 q4_commission: parseFloat(agent.q4_commission) || 0
//             })),
//             overall_stats: overallStats,
//             generated_at: new Date().toISOString()
//         };
        
//     } catch (error) {
//         console.error('❌ Error generating agent performance report:', error);
//         throw error;
//     }
// }
// backend/services/reportService.js - POSTGRESQL FIXED VERSION

const db = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ReportService {
    
    // Generate commission summary report - POSTGRESQL FIXED
    async generateCommissionSummary(startDate, endDate, agentId = null) {
        try {
            console.log('📊 Generating commission summary for:', { startDate, endDate, agentId });
            
            let query = `
                SELECT 
                    c.agent_id,
                    a.first_name,
                    a.last_name,
                    a.email,
                    COUNT(c.commission_id) as total_transactions,
                    COALESCE(SUM(c.premium_amount), 0) as total_premium,
                    COALESCE(SUM(c.amount), 0) as total_commission,
                    COALESCE(AVG(c.rate), 0) as avg_rate,
                    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commission,
                    COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commission,
                    COUNT(CASE WHEN c.status = 'paid' THEN 1 END) as paid_count,
                    COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count
                FROM commission c
                JOIN agent a ON c.agent_id = a.agent_id
                WHERE c.created_at BETWEEN $1 AND $2
            `;
            
            const params = [startDate, endDate];
            let paramIndex = 3;
            
            if (agentId) {
                query += ` AND c.agent_id = $${paramIndex}`;
                params.push(agentId);
                paramIndex++;
            }
            
            query += ' GROUP BY c.agent_id, a.first_name, a.last_name, a.email ORDER BY total_commission DESC';
            
            const agentsResult = await db.query(query, params);
            const agents = agentsResult.rows;
            
            // Get overall totals
            const totalsQuery = `
                SELECT 
                    COUNT(commission_id) as total_transactions,
                    COALESCE(SUM(premium_amount), 0) as total_premium,
                    COALESCE(SUM(amount), 0) as total_commission,
                    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_commission,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commission
                FROM commission
                WHERE created_at BETWEEN $1 AND $2
                ${agentId ? 'AND agent_id = $3' : ''}
            `;
            
            const totalsParams = agentId ? [startDate, endDate, agentId] : [startDate, endDate];
            const totalsResult = await db.query(totalsQuery, totalsParams);
            const totals = totalsResult.rows[0];
            
            // Get chart data by month
            const chartQuery = `
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                    COALESCE(SUM(amount), 0) as commission_amount,
                    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
                FROM commission
                WHERE created_at BETWEEN $1 AND $2
                ${agentId ? 'AND agent_id = $3' : ''}
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY DATE_TRUNC('month', created_at)
            `;
            
            const chartResult = await db.query(chartQuery, totalsParams);
            const chartData = chartResult.rows;
            
            // Get top agents
            const topAgentsQuery = `
                SELECT 
                    a.first_name || ' ' || a.last_name as name,
                    COALESCE(SUM(c.amount), 0) as commission,
                    COUNT(DISTINCT c.policy_id) as policies,
                    COALESCE(AVG(c.rate), 0) as rate
                FROM commission c
                JOIN agent a ON c.agent_id = a.agent_id
                WHERE c.created_at BETWEEN $1 AND $2
                ${agentId ? 'AND c.agent_id = $3' : ''}
                GROUP BY a.agent_id, a.first_name, a.last_name
                ORDER BY commission DESC
                LIMIT 10
            `;
            
            const topAgentsResult = await db.query(topAgentsQuery, totalsParams);
            
            return {
                period: { startDate, endDate },
                summary: {
                    total_transactions: parseInt(totals?.total_transactions) || 0,
                    total_premium: parseFloat(totals?.total_premium) || 0,
                    total_commission: parseFloat(totals?.total_commission) || 0,
                    paid_commission: parseFloat(totals?.paid_commission) || 0,
                    pending_commission: parseFloat(totals?.pending_commission) || 0
                },
                chartData: {
                    labels: chartData.map(row => row.month),
                    commission_amounts: chartData.map(row => parseFloat(row.commission_amount)),
                    paid_amounts: chartData.map(row => parseFloat(row.paid_amount)),
                    pending_amounts: chartData.map(row => parseFloat(row.pending_amount))
                },
                topAgents: topAgentsResult.rows.map(agent => ({
                    name: agent.name,
                    commission: parseFloat(agent.commission),
                    policies: parseInt(agent.policies),
                    rate: parseFloat(agent.rate)
                })),
                agents: agents.map(agent => ({
                    agent_id: agent.agent_id,
                    first_name: agent.first_name,
                    last_name: agent.last_name,
                    email: agent.email,
                    total_transactions: parseInt(agent.total_transactions),
                    total_premium: parseFloat(agent.total_premium),
                    total_commission: parseFloat(agent.total_commission),
                    avg_rate: parseFloat(agent.avg_rate),
                    paid_commission: parseFloat(agent.paid_commission),
                    pending_commission: parseFloat(agent.pending_commission),
                    paid_count: parseInt(agent.paid_count),
                    pending_count: parseInt(agent.pending_count)
                })),
                generated_at: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Commission summary error:', error);
            throw error;
        }
    }
    
    // Generate monthly performance report - NEW ENDPOINT
    async generateMonthlyPerformanceReport(startDate, endDate) {
        try {
            console.log('📊 Generating monthly performance report for:', { startDate, endDate });
            
            // Get revenue data
            const revenueQuery = `
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon') as month,
                    COALESCE(SUM(amount), 0) as revenue
                FROM payment
                WHERE paid_at BETWEEN $1 AND $2
                GROUP BY DATE_TRUNC('month', paid_at)
                ORDER BY DATE_TRUNC('month', paid_at)
            `;
            const revenueResult = await db.query(revenueQuery, [startDate, endDate]);
            
            // Get commission data
            const commissionQuery = `
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                    COALESCE(SUM(amount), 0) as commissions
                FROM commission
                WHERE created_at BETWEEN $1 AND $2
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY DATE_TRUNC('month', created_at)
            `;
            const commissionResult = await db.query(commissionQuery, [startDate, endDate]);
            
            // Get new users data
            const usersQuery = `
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                    COUNT(*) as new_users
                FROM customer
                WHERE created_at BETWEEN $1 AND $2
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY DATE_TRUNC('month', created_at)
            `;
            const usersResult = await db.query(usersQuery, [startDate, endDate]);
            
            // Get policies data
            const policiesQuery = `
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                    COUNT(*) as policies
                FROM policy
                WHERE created_at BETWEEN $1 AND $2
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY DATE_TRUNC('month', created_at)
            `;
            const policiesResult = await db.query(policiesQuery, [startDate, endDate]);
            
            // Combine all data
            const months = revenueResult.rows.map(r => r.month);
            const revenue = revenueResult.rows.map(r => parseFloat(r.revenue));
            const commissions = commissionResult.rows.map(r => parseFloat(r.commissions));
            const newUsers = usersResult.rows.map(r => parseInt(r.new_users));
            const policies = policiesResult.rows.map(r => parseInt(r.policies));
            
            // Get totals
            const totalsQuery = `
                SELECT 
                    (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE paid_at BETWEEN $1 AND $2) as total_revenue,
                    (SELECT COALESCE(SUM(amount), 0) FROM commission WHERE created_at BETWEEN $1 AND $2) as total_commissions,
                    (SELECT COUNT(*) FROM policy WHERE created_at BETWEEN $1 AND $2) as total_policies,
                    (SELECT COUNT(*) FROM agent WHERE status = 'active') as total_agents,
                    (SELECT COUNT(*) FROM agent WHERE status = 'active') as active_agents,
                    (SELECT COUNT(*) FROM customer WHERE created_at BETWEEN $1 AND $2) as total_users,
                    (SELECT COUNT(*) FROM customer WHERE created_at BETWEEN $1 AND $2) as new_users,
                    (SELECT COUNT(*) FROM hospital WHERE created_at BETWEEN $1 AND $2) as total_hospitals,
                    (SELECT COUNT(*) FROM hospital WHERE status = 'active' AND created_at BETWEEN $1 AND $2) as active_hospitals,
                    ((SELECT COUNT(*) FROM customer WHERE created_at BETWEEN $1 AND $2)::float / 
                      NULLIF((SELECT COUNT(*) FROM customer WHERE created_at < $1), 0) * 100) as growth_rate
                `;
            
            const totalsResult = await db.query(totalsQuery, [startDate, endDate]);
            const totals = totalsResult.rows[0];
            
            return {
                period: { startDate, endDate },
                summary: {
                    total_revenue: parseFloat(totals?.total_revenue) || 0,
                    total_commissions: parseFloat(totals?.total_commissions) || 0,
                    total_policies: parseInt(totals?.total_policies) || 0,
                    total_agents: parseInt(totals?.total_agents) || 0,
                    active_agents: parseInt(totals?.active_agents) || 0,
                    total_users: parseInt(totals?.total_users) || 0,
                    new_users: parseInt(totals?.new_users) || 0,
                    total_hospitals: parseInt(totals?.total_hospitals) || 0,
                    active_hospitals: parseInt(totals?.active_hospitals) || 0,
                    growth_rate: parseFloat(totals?.growth_rate) || 0
                },
                chartData: {
                    labels: months,
                    revenue: revenue,
                    commissions: commissions,
                    new_users: newUsers,
                    policies: policies
                },
                breakdown: {
                    user_growth: {
                        total_users: parseInt(totals?.total_users) || 0,
                        new_users_this_period: parseInt(totals?.new_users) || 0,
                        growth_rate: parseFloat(totals?.growth_rate) || 0
                    },
                    hospital_network: {
                        total_hospitals: parseInt(totals?.total_hospitals) || 0,
                        active_hospitals: parseInt(totals?.active_hospitals) || 0,
                        new_hospitals: parseInt(totals?.new_hospitals) || 0
                    },
                    agent_performance: {
                        total_agents: parseInt(totals?.total_agents) || 0,
                        active_agents: parseInt(totals?.active_agents) || 0,
                        total_commissions: parseFloat(totals?.total_commissions) || 0,
                        avg_commission_per_agent: parseFloat(totals?.total_commissions) / Math.max(parseInt(totals?.active_agents), 1) || 0
                    },
                    commission_summary: {
                        total_commissions: parseFloat(totals?.total_commissions) || 0,
                        paid_commissions: parseFloat(totals?.total_commissions) || 0,
                        pending_commissions: 0,
                        avg_rate: 12.5
                    }
                },
                generated_at: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Monthly performance error:', error);
            throw error;
        }
    }
    
    // Generate detailed transaction report - POSTGRESQL FIXED
    async generateTransactionReport(startDate, endDate, status = null, agentId = null) {
        try {
            let query = `
                SELECT 
                    c.commission_id,
                    c.agent_id,
                    a.first_name,
                    a.last_name,
                    a.email,
                    c.policy_id,
                    c.premium_amount,
                    c.amount as commission_amount,
                    c.rate,
                    c.status,
                    c.created_at,
                    c.paid_at,
                    c.payment_reference
                FROM commission c
                JOIN agent a ON c.agent_id = a.agent_id
                WHERE c.created_at BETWEEN $1 AND $2
            `;
            
            const params = [startDate, endDate];
            let paramIndex = 3;
            
            if (status) {
                query += ` AND c.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
            
            if (agentId) {
                query += ` AND c.agent_id = $${paramIndex}`;
                params.push(agentId);
                paramIndex++;
            }
            
            query += ' ORDER BY c.created_at DESC';
            
            const result = await db.query(query, params);
            const transactions = result.rows;
            
            return {
                period: { startDate, endDate },
                filters: { status, agentId },
                transactions: transactions.map(t => ({
                    ...t,
                    premium_amount: parseFloat(t.premium_amount),
                    commission_amount: parseFloat(t.commission_amount)
                })),
                total_records: transactions.length,
                total_commission: transactions.reduce((sum, t) => sum + parseFloat(t.commission_amount || 0), 0),
                generated_at: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Transaction report error:', error);
            throw error;
        }
    }
    
    // Generate agent performance report - POSTGRESQL FIXED
    async generateAgentPerformanceReport(year, quarter = null) {
        try {
            console.log(`📊 Generating agent performance report for year: ${year}, quarter: ${quarter || 'full'}`);
            
            // Build date range based on quarter
            let startDate = `${year}-01-01`;
            let endDate = `${year}-12-31`;
            
            if (quarter) {
                const quarterMap = {
                    1: { start: '-01-01', end: '-03-31' },
                    2: { start: '-04-01', end: '-06-30' },
                    3: { start: '-07-01', end: '-09-30' },
                    4: { start: '-10-01', end: '-12-31' }
                };
                const q = quarterMap[quarter];
                if (q) {
                    startDate = `${year}${q.start}`;
                    endDate = `${year}${q.end}`;
                }
            }
            
            const query = `
                SELECT 
                    a.agent_id,
                    a.first_name,
                    a.last_name,
                    a.email,
                    a.total_sales,
                    a.commission_rate,
                    a.status as agent_status,
                    COALESCE((
                        SELECT COUNT(DISTINCT c.policy_id) 
                        FROM commission c 
                        WHERE c.agent_id = a.agent_id 
                        AND c.created_at >= $1::date 
                        AND c.created_at <= $2::date
                    ), 0) as policies_sold,
                    COALESCE((
                        SELECT COUNT(c.commission_id) 
                        FROM commission c 
                        WHERE c.agent_id = a.agent_id 
                        AND c.created_at >= $1::date 
                        AND c.created_at <= $2::date
                    ), 0) as commission_transactions,
                    COALESCE((
                        SELECT SUM(c.premium_amount) 
                        FROM commission c 
                        WHERE c.agent_id = a.agent_id 
                        AND c.created_at >= $1::date 
                        AND c.created_at <= $2::date
                    ), 0) as total_premium,
                    COALESCE((
                        SELECT SUM(c.amount) 
                        FROM commission c 
                        WHERE c.agent_id = a.agent_id 
                        AND c.created_at >= $1::date 
                        AND c.created_at <= $2::date
                    ), 0) as total_commission
                FROM agent a
                WHERE a.status IN ('active', 'pending')
                ORDER BY total_commission DESC
            `;
            
            const agentsResult = await db.query(query, [startDate, endDate]);
            const agents = agentsResult.rows;
            
            console.log(`✅ Found ${agents.length} agents for period ${startDate} to ${endDate}`);
            
            // Calculate overall statistics
            const totalCommission = agents.reduce((sum, a) => sum + parseFloat(a.total_commission || 0), 0);
            const totalPolicies = agents.reduce((sum, a) => sum + parseInt(a.policies_sold || 0), 0);
            
            const overallStats = {
                total_agents: agents.length,
                total_commissions: totalCommission,
                total_policies: totalPolicies,
                avg_commission_per_agent: agents.length ? totalCommission / agents.length : 0,
                top_performer: agents[0] ? {
                    name: `${agents[0].first_name} ${agents[0].last_name}`,
                    commission: parseFloat(agents[0].total_commission || 0),
                    policies: parseInt(agents[0].policies_sold || 0)
                } : null
            };
            
            // Prepare chart data
            const chartData = {
                labels: agents.slice(0, 10).map(a => `${a.first_name} ${a.last_name}`.substring(0, 20)),
                commission_amounts: agents.slice(0, 10).map(a => parseFloat(a.total_commission || 0)),
                policy_counts: agents.slice(0, 10).map(a => parseInt(a.policies_sold || 0))
            };
            
            return {
                year,
                quarter: quarter || 'Full Year',
                period: { startDate, endDate },
                summary: overallStats,
                chartData: chartData,
                agents: agents.map(agent => ({
                    agent_id: agent.agent_id,
                    name: `${agent.first_name} ${agent.last_name}`,
                    email: agent.email,
                    total_sales: parseFloat(agent.total_sales) || 0,
                    commission_rate: parseFloat(agent.commission_rate) || 0,
                    status: agent.agent_status,
                    policies_sold: parseInt(agent.policies_sold) || 0,
                    commission_transactions: parseInt(agent.commission_transactions) || 0,
                    total_premium: parseFloat(agent.total_premium) || 0,
                    total_commission: parseFloat(agent.total_commission) || 0
                })),
                overall_stats: overallStats,
                generated_at: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error generating agent performance report:', error);
            throw error;
        }
    }
    // Generate PDF Report
    async generatePDFReport(reportData, reportType, filename) {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const reportsDir = path.join(__dirname, '../reports');
        
        // Ensure reports directory exists
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const filepath = path.join(reportsDir, filename);
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        
        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('HealthInsura360', { align: 'center' });
        doc.fontSize(16).text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
        doc.moveDown();
        
        // Report Info
        doc.fontSize(10).font('Helvetica');
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.text(`Report Period: ${reportData.period?.startDate || 'All Time'} to ${reportData.period?.endDate || 'Present'}`, { align: 'right' });
        doc.moveDown();
        
        // Summary Section
        if (reportData.summary) {
            doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary', { underline: true });
            doc.moveDown(0.5);
            
            const summaryData = [
                ['Total Transactions', reportData.summary.total_transactions || 0],
                ['Total Premium Amount', `$${(reportData.summary.total_premium || 0).toFixed(2)}`],
                ['Total Commission', `$${(reportData.summary.total_commission || 0).toFixed(2)}`],
                ['Paid Commission', `$${(reportData.summary.paid_commission || 0).toFixed(2)}`],
                ['Pending Commission', `$${(reportData.summary.pending_commission || 0).toFixed(2)}`]
            ];
            
            let y = doc.y;
            summaryData.forEach(row => {
                doc.fontSize(10).font('Helvetica-Bold').text(row[0], 50, y);
                doc.font('Helvetica').text(row[1], 200, y);
                y += 20;
            });
            doc.moveDown();
        }
        
        // Agents Table
        if (reportData.agents && reportData.agents.length > 0) {
            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').text('Agent Performance Details', { underline: true });
            doc.moveDown(0.5);
            
            // Table headers
            const tableTop = doc.y;
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Agent Name', 50, tableTop);
            doc.text('Policies', 200, tableTop);
            doc.text('Total Premium', 280, tableTop);
            doc.text('Commission', 380, tableTop);
            doc.text('Status', 480, tableTop);
            
            doc.moveDown();
            let rowY = doc.y;
            doc.fontSize(8).font('Helvetica');
            
            reportData.agents.forEach((agent, index) => {
                if (rowY > 700) {
                    doc.addPage();
                    rowY = 50;
                }
                
                const agentName = `${agent.first_name} ${agent.last_name}`;
                doc.text(agentName.substring(0, 30), 50, rowY);
                doc.text(agent.policies_sold?.toString() || '0', 200, rowY);
                doc.text(`$${(agent.total_premium || 0).toFixed(2)}`, 280, rowY);
                doc.text(`$${(agent.total_commission || 0).toFixed(2)}`, 380, rowY);
                doc.text(agent.paid_count > 0 ? 'Paid' : 'Pending', 480, rowY);
                
                rowY += 20;
            });
        }
        
        // Footer
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            doc.fontSize(8)
               .text(
                   `Page ${i + 1} of ${totalPages} | Confidential - Internal Use Only`,
                   50,
                   doc.page.height - 50,
                   { align: 'center' }
               );
        }
        
        doc.end();
        
        return new Promise((resolve) => {
            stream.on('finish', () => {
                resolve(filepath);
            });
        });
    }
    
    // Generate Excel Report
    async generateExcelReport(reportData, reportType, filename) {
        const workbook = new ExcelJS.Workbook();
        const reportsDir = path.join(__dirname, '../reports');
        
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const filepath = path.join(reportsDir, filename);
        
        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 }
        ];
        
        summarySheet.addRow({ metric: 'Report Type', value: reportType });
        summarySheet.addRow({ metric: 'Generated Date', value: new Date().toLocaleString() });
        summarySheet.addRow({ metric: 'Period Start', value: reportData.period?.startDate || 'N/A' });
        summarySheet.addRow({ metric: 'Period End', value: reportData.period?.endDate || 'N/A' });
        summarySheet.addRow({ metric: '', value: '' });
        
        if (reportData.summary) {
            summarySheet.addRow({ metric: 'Total Transactions', value: reportData.summary.total_transactions || 0 });
            summarySheet.addRow({ metric: 'Total Premium', value: `$${(reportData.summary.total_premium || 0).toFixed(2)}` });
            summarySheet.addRow({ metric: 'Total Commission', value: `$${(reportData.summary.total_commission || 0).toFixed(2)}` });
            summarySheet.addRow({ metric: 'Paid Commission', value: `$${(reportData.summary.paid_commission || 0).toFixed(2)}` });
            summarySheet.addRow({ metric: 'Pending Commission', value: `$${(reportData.summary.pending_commission || 0).toFixed(2)}` });
        }
        
        // Details Sheet
        const detailsSheet = workbook.addWorksheet('Commission Details');
        detailsSheet.columns = [
            { header: 'Commission ID', key: 'id', width: 15 },
            { header: 'Agent Name', key: 'agent', width: 25 },
            { header: 'Policy ID', key: 'policy', width: 15 },
            { header: 'Premium', key: 'premium', width: 15 },
            { header: 'Rate %', key: 'rate', width: 10 },
            { header: 'Commission', key: 'commission', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Paid Date', key: 'paid_date', width: 12 }
        ];
        
        if (reportData.transactions) {
            reportData.transactions.forEach(trans => {
                detailsSheet.addRow({
                    id: trans.commission_id,
                    agent: `${trans.first_name} ${trans.last_name}`,
                    policy: trans.policy_id,
                    premium: `$${parseFloat(trans.premium_amount).toFixed(2)}`,
                    rate: trans.rate,
                    commission: `$${parseFloat(trans.commission_amount).toFixed(2)}`,
                    status: trans.status,
                    date: trans.created_at,
                    paid_date: trans.paid_at || 'N/A'
                });
            });
        }
        
        await workbook.xlsx.writeFile(filepath);
        return filepath;
    }
}

module.exports = new ReportService();