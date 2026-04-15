// backend/src/routes/reportsRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const PDFDocument = require('pdfkit');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const reportService = require('../services/reportServices'); // Add this
const auditLogService = require('../services/auditLogServices'); // Add this

// ==================== MONTHLY PERFORMANCE REPORT ====================

// Get monthly performance report (aggregates all reports)
// ==================== MONTHLY PERFORMANCE REPORT ====================

// ==================== MONTHLY PERFORMANCE REPORT ====================

// Get monthly performance report (aggregates all reports)
router.get('/monthly-performance', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    console.log(`📊 Generating monthly performance report from ${start_date} to ${end_date}`);
    
    // 1. Get Commission Summary
    const commissionQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_commissions,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_commissions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_commissions,
        AVG(rate) as avg_rate,
        COUNT(DISTINCT policy_id) as total_policies
      FROM commission
      WHERE created_at BETWEEN $1 AND $2
    `;
    const commissionResult = await db.query(commissionQuery, [start_date, end_date]);
    const commission = commissionResult.rows?.[0] || commissionResult[0] || {};
    
    // 2. Get User Growth
    const userQuery = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN created_at BETWEEN $1 AND $2 THEN 1 ELSE 0 END) as new_users
      FROM customer
    `;
    const userResult = await db.query(userQuery, [start_date, end_date]);
    const user = userResult.rows?.[0] || userResult[0] || {};
    
    // Calculate growth rate
    const previousPeriodQuery = `
      SELECT COUNT(*) as previous_users
      FROM customer
      WHERE created_at < $1
    `;
    const previousResult = await db.query(previousPeriodQuery, [start_date]);
    const previousUsers = previousResult.rows?.[0]?.previous_users || previousResult[0]?.previous_users || 0;
    const growthRate = previousUsers > 0 ? ((user.new_users || 0) / previousUsers) * 100 : 0;
    
    // 3. Get Hospital Network - Cast ENUM to text for case-insensitive comparison
    // Get hospital totals with date filter
    const hospitalQuery = `
      SELECT 
        COUNT(*) as total_hospitals,
        SUM(CASE WHEN created_at BETWEEN $1 AND $2 THEN 1 ELSE 0 END) as new_hospitals
      FROM hospital
      WHERE created_at IS NOT NULL
    `;
    const hospitalResult = await db.query(hospitalQuery, [start_date, end_date]);
    const hospitals = hospitalResult.rows?.[0] || hospitalResult[0] || {};
    
    // Get active hospitals count (status = 'active') - Cast ENUM to text
    const activeHospitalsQuery = `
      SELECT COUNT(*) as count
      FROM hospital
      WHERE created_at BETWEEN $1 AND $2
        AND status::text = 'active'
    `;
    const activeHospitalsResult = await db.query(activeHospitalsQuery, [start_date, end_date]);
    const activeHospitals = parseInt(activeHospitalsResult.rows?.[0]?.count || activeHospitalsResult[0]?.count || 0);
    
    // Get verified hospitals count (status = 'verified')
    const verifiedHospitalsQuery = `
      SELECT COUNT(*) as count
      FROM hospital
      WHERE created_at BETWEEN $1 AND $2
        AND status::text = 'verified'
    `;
    const verifiedHospitalsResult = await db.query(verifiedHospitalsQuery, [start_date, end_date]);
    const verifiedHospitals = parseInt(verifiedHospitalsResult.rows?.[0]?.count || verifiedHospitalsResult[0]?.count || 0);
    
    // Get pending hospitals count (status = 'pending')
    const pendingHospitalsQuery = `
      SELECT COUNT(*) as count
      FROM hospital
      WHERE created_at BETWEEN $1 AND $2
        AND status::text = 'pending'
    `;
    const pendingHospitalsResult = await db.query(pendingHospitalsQuery, [start_date, end_date]);
    const pendingHospitals = parseInt(pendingHospitalsResult.rows?.[0]?.count || pendingHospitalsResult[0]?.count || 0);
    
    // Get hospital status breakdown (cast ENUM to text)
    const hospitalStatusQuery = `
      SELECT 
        status::text as status,
        COUNT(*) as count
      FROM hospital
      WHERE created_at BETWEEN $1 AND $2
        AND status IS NOT NULL
      GROUP BY status::text
    `;
    const hospitalStatusResult = await db.query(hospitalStatusQuery, [start_date, end_date]);
    const hospitalStatuses = hospitalStatusResult.rows || hospitalStatusResult || [];
    
    console.log(`Hospital stats - Total: ${hospitals.total_hospitals}, Active: ${activeHospitals}, Verified: ${verifiedHospitals}, Pending: ${pendingHospitals}`);
    
    // 4. Get Agent Performance - Cast ENUM to text for agent status
    const agentQuery = `
      SELECT 
        COUNT(DISTINCT a.agent_id) as total_agents,
        SUM(CASE WHEN a.status::text = 'active' THEN 1 ELSE 0 END) as active_agents,
        COALESCE(SUM(c.amount), 0) as total_commissions,
        COALESCE(AVG(c.amount), 0) as avg_commission_per_agent
      FROM agent a
      LEFT JOIN commission c ON a.agent_id = c.agent_id 
        AND c.created_at BETWEEN $1 AND $2
        AND c.status = 'paid'
    `;
    const agentResult = await db.query(agentQuery, [start_date, end_date]);
    const agent = agentResult.rows?.[0] || agentResult[0] || {};
    
    // Get top agent separately
    const topAgentQuery = `
      SELECT 
        CONCAT(a.first_name, ' ', a.last_name) as name,
        COALESCE(SUM(c.amount), 0) as commission,
        COUNT(DISTINCT c.policy_id) as policies
      FROM agent a
      INNER JOIN commission c ON a.agent_id = c.agent_id 
        AND c.created_at BETWEEN $1 AND $2
        AND c.status = 'paid'
      GROUP BY a.agent_id, a.first_name, a.last_name
      ORDER BY commission DESC
      LIMIT 1
    `;
    const topAgentResult = await db.query(topAgentQuery, [start_date, end_date]);
    const topAgent = topAgentResult.rows?.[0] || topAgentResult[0] || {};
    
    // 5. Get monthly trend data for chart
    const monthlyTrendQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        EXTRACT(MONTH FROM created_at) as month_num,
        COALESCE(SUM(amount), 0) as commissions,
        COUNT(DISTINCT policy_id) as policies
      FROM commission
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY month_num
    `;
    const monthlyTrend = await db.query(monthlyTrendQuery, [start_date, end_date]);
    const trendRows = monthlyTrend.rows || monthlyTrend || [];
    
    // Get monthly user data
    const monthlyUserQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        EXTRACT(MONTH FROM created_at) as month_num,
        COUNT(*) as new_users
      FROM customer
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY month_num
    `;
    const monthlyUsers = await db.query(monthlyUserQuery, [start_date, end_date]);
    const userRows = monthlyUsers.rows || monthlyUsers || [];
    
    // Calculate total revenue from policy table (using pemium_amount - note the typo in schema)
    let totalRevenue = 0;
    try {
      const revenueQuery = `
        SELECT COALESCE(SUM(pemium_amount), 0) as total_revenue
        FROM policy
        WHERE created_at BETWEEN $1 AND $2
          AND status::text = 'active'
      `;
      const revenueResult = await db.query(revenueQuery, [start_date, end_date]);
      totalRevenue = revenueResult.rows?.[0]?.total_revenue || revenueResult[0]?.total_revenue || 0;
      console.log(`Total revenue calculated: ${totalRevenue}`);
    } catch (err) {
      console.log('Revenue query failed:', err.message);
      // Estimate revenue based on commissions (typical ratio)
      totalRevenue = (commission.total_commissions || 0) * 3.5;
    }
    
    // Calculate monthly revenue based on commissions ratio
    const monthlyRevenue = trendRows.map(trend => {
      return Math.round((trend.commissions || 0) * 3.5);
    });
    
    // Prepare response
    const response = {
      summary: {
        total_revenue: parseFloat(totalRevenue),
        total_commissions: parseFloat(commission.total_commissions || 0),
        total_policies: parseInt(commission.total_policies || 0),
        total_agents: parseInt(agent.total_agents || 0),
        active_agents: parseInt(agent.active_agents || 0),
        total_users: parseInt(user.total_users || 0),
        new_users: parseInt(user.new_users || 0),
        total_hospitals: parseInt(hospitals.total_hospitals || 0),
        active_hospitals: activeHospitals,
        verified_hospitals: verifiedHospitals,
        pending_hospitals: pendingHospitals,
        growth_rate: parseFloat(growthRate.toFixed(1))
      },
      chartData: {
        labels: trendRows.map(m => m.month),
        revenue: monthlyRevenue,
        commissions: trendRows.map(m => parseFloat(m.commissions)),
        new_users: userRows.map(u => parseInt(u.new_users)),
        policies: trendRows.map(m => parseInt(m.policies))
      },
      breakdown: {
        user_growth: {
          total_users: parseInt(user.total_users || 0),
          new_users_this_period: parseInt(user.new_users || 0),
          growth_rate: parseFloat(growthRate.toFixed(1)),
          monthly_data: userRows.map(u => parseInt(u.new_users))
        },
        hospital_network: {
          total_hospitals: parseInt(hospitals.total_hospitals || 0),
          active_hospitals: activeHospitals,
          verified_hospitals: verifiedHospitals,
          pending_hospitals: pendingHospitals,
          new_hospitals: parseInt(hospitals.new_hospitals || 0),
          by_status: hospitalStatuses.reduce((acc, h) => {
            acc[h.status] = parseInt(h.count);
            return acc;
          }, {})
        },
        agent_performance: {
          total_agents: parseInt(agent.total_agents || 0),
          active_agents: parseInt(agent.active_agents || 0),
          total_commissions: parseFloat(agent.total_commissions || 0),
          avg_commission_per_agent: parseFloat(agent.avg_commission_per_agent || 0),
          top_agent: {
            name: topAgent.name || 'N/A',
            commission: parseFloat(topAgent.commission || 0),
            policies: parseInt(topAgent.policies || 0)
          }
        },
        commission_summary: {
          total_commissions: parseFloat(commission.total_commissions || 0),
          paid_commissions: parseFloat(commission.paid_commissions || 0),
          pending_commissions: parseFloat(commission.pending_commissions || 0),
          avg_rate: parseFloat(commission.avg_rate || 0)
        }
      },
      period: { start_date, end_date }
    };
    
    console.log('✅ Monthly performance report generated successfully');
    res.json(response);
    
  } catch (error) {
    console.error('Error generating monthly performance report:', error);
    res.status(500).json({ 
      message: 'Failed to generate monthly performance report',
      error: error.message 
    });
  }
});
// ==================== COMMISSION REPORTS ====================
// // Get commission summary report
// router.get('/commission-summary', authenticate, adminMiddleware, async (req, res) => { 
//      try {
//         const { start_date, end_date, format = 'json' } = req.query;
        
//         if (!start_date || !end_date) {
//             return res.status(400).json({ error: 'start_date and end_date are required' });
//         }
        
//         const reportData = await reportService.generateCommissionSummary(start_date, end_date);
        
//         // Log report generation
//         await auditLogService.logReportGeneration(
//             req.user.admin_id,
//             'commission_summary',
//             { start_date, end_date, format },
//             reportData.agents?.length || 0,
//             format
//         );
        
//         if (format === 'pdf') {
//             const filename = `commission_summary_${Date.now()}.pdf`;
//             const filepath = await reportService.generatePDFReport(reportData, 'Commission Summary', filename);
//             return res.download(filepath);
//         }
        
//         if (format === 'excel') {
//             const filename = `commission_summary_${Date.now()}.xlsx`;
//             const filepath = await reportService.generateExcelReport(reportData, 'Commission Summary', filename);
//             return res.download(filepath);
//         }
        
//         res.json(reportData);
        
//     } catch (error) {
//         console.error('Report generation error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });
router.get('/report/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Get commission summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT c.agent_id) as total_agents,
        COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.agent_id END) as active_agents,
        COALESCE(SUM(c.amount), 0) as total_commissions,
        COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END), 0) as paid_commissions,
        COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_commissions,
        COUNT(DISTINCT c.policy_id) as total_policies,
        AVG(c.rate) as avg_commission_rate
      FROM commission c
      LEFT JOIN agent a ON c.agent_id = a.agent_id
      WHERE c.created_at BETWEEN ? AND ?
        AND (c.status = 'paid' OR c.status = 'pending')
    `;
    
    const summary = await db.query(summaryQuery, [start_date, end_date]);
    
    // Get monthly chart data
    const chartQuery = `
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        MONTH(created_at) as month_num,
        COALESCE(SUM(amount), 0) as commission_amounts,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amounts,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amounts
      FROM commission
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(created_at, '%b'), MONTH(created_at)
      ORDER BY month_num
    `;
    
    const chartData = await db.query(chartQuery, [start_date, end_date]);
    
    // Get top agents
    const topAgentsQuery = `
      SELECT 
        CONCAT(a.first_name, ' ', a.last_name) as name,
        COALESCE(SUM(c.amount), 0) as commission,
        COUNT(DISTINCT c.policy_id) as policies,
        AVG(c.rate) as rate
      FROM commission c
      JOIN agent a ON c.agent_id = a.agent_id
      WHERE c.created_at BETWEEN ? AND ?
        AND c.status = 'paid'
      GROUP BY c.agent_id, a.first_name, a.last_name
      ORDER BY commission DESC
      LIMIT 5
    `;
    
    const topAgents = await db.query(topAgentsQuery, [start_date, end_date]);
    
    res.json({
      summary: summary[0],
      chartData: {
        labels: chartData.map(d => d.month),
        commission_amounts: chartData.map(d => d.commission_amounts),
        paid_amounts: chartData.map(d => d.paid_amounts),
        pending_amounts: chartData.map(d => d.pending_amounts)
      },
      topAgents: topAgents.map(agent => ({
        ...agent,
        commission: parseFloat(agent.commission),
        rate: parseFloat(agent.rate)
      })),
      period: { start_date, end_date }
    });
    
  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({ 
      message: 'Failed to fetch commission summary',
      error: error.message 
    });
  }
});

// Get transaction report
router.get('/transactions', authenticate, adminMiddleware, async (req, res) => {

    try {
        const { start_date, end_date, status, agent_id, format = 'json' } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const reportData = await reportService.generateTransactionReport(start_date, end_date, status, agent_id);
        
        if (format === 'pdf') {
            const filename = `transaction_report_${Date.now()}.pdf`;
            const filepath = await reportService.generatePDFReport(reportData, 'Transaction Report', filename);
            return res.download(filepath);
        }
        
        if (format === 'excel') {
            const filename = `transaction_report_${Date.now()}.xlsx`;
            const filepath = await reportService.generateExcelReport(reportData, 'Transaction Report', filename);
            return res.download(filepath);
        }
        
        res.json(reportData);
        
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Agent Performance API endpoint
router.get('/report/agent-performance', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Get all agents with their details
    const agentsQuery = `
      SELECT 
        a.agent_id,
        a.first_name,
        a.last_name,
        a.email,
        a.phone,
        a.commission_rate,
        a.status,
        a.total_sales,
        COUNT(DISTINCT p.policy_id) as policies_sold,
        COALESCE(SUM(c.amount), 0) as total_commission,
        COALESCE(SUM(c.premium_amount), 0) as total_premium
      FROM agent a
      LEFT JOIN policy p ON a.agent_id = p.agent_id 
        AND p.created_at BETWEEN ? AND ?
        AND p.status = 'active'
      LEFT JOIN commission c ON a.agent_id = c.agent_id 
        AND c.created_at BETWEEN ? AND ?
        AND c.status = 'paid'
      WHERE a.status = 'active' OR a.status = 'pending'
      GROUP BY a.agent_id
      ORDER BY total_commission DESC
    `;
    
    const agents = await db.query(agentsQuery, [start_date, end_date, start_date, end_date]);
    
    // Format the response
    const formattedAgents = agents.map(agent => ({
      name: `${agent.first_name} ${agent.last_name}`,
      agent_id: agent.agent_id,
      commission: parseFloat(agent.total_commission || 0),
      policies: parseInt(agent.policies_sold || 0),
      rate: parseFloat(agent.commission_rate || 0),
      status: agent.status || 'pending',
      total_sales: agent.total_sales || 0,
      email: agent.email,
      phone: agent.phone
    }));
    
    // Calculate summary
    const summary = {
      total_agents: formattedAgents.length,
      active_agents: formattedAgents.filter(a => a.status === 'active').length,
      total_commissions: formattedAgents.reduce((sum, a) => sum + a.commission, 0),
      total_policies: formattedAgents.reduce((sum, a) => sum + a.policies, 0),
      avg_commission_per_agent: formattedAgents.length > 0 
        ? formattedAgents.reduce((sum, a) => sum + a.commission, 0) / formattedAgents.length 
        : 0,
      top_performer: formattedAgents[0]?.name || 'N/A',
      top_performer_commission: formattedAgents[0]?.commission || 0
    };
    
    // Prepare chart data
    const chartData = {
      labels: formattedAgents.map(a => a.name),
      commission_amounts: formattedAgents.map(a => a.commission),
      policy_counts: formattedAgents.map(a => a.policies)
    };
    
    res.json({
  summary,
  chartData,
  agents: formattedAgents,
  period: { start_date, end_date }
});
    
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch agent performance data',
      error: error.message 
    });
  }
});
// Get report templates
router.get('/templates', authenticate, adminMiddleware, (req, res) => {
    const templates = {
        current_month: {
            name: 'Current Month',
            start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
        },
        last_month: {
            name: 'Last Month',
            start_date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
            end_date: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
        },
        current_quarter: {
            name: 'Current Quarter',
            start_date: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
        },
        current_year: {
            name: 'Current Year',
            start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
        },
        last_year: {
            name: 'Last Year',
            start_date: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0],
            end_date: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        }
    };
    
    res.json(templates);
});

// ==================== USER GROWTH REPORT (for existing dashboard) ====================

// GET report data
router.get('/:reportType', async (req, res) => {
    try {
        const { reportType } = req.params;
        const { range = 'last-30-days' } = req.query;

        console.log(`📊 Generating ${reportType} report for range: ${range}`);

        let reportData;

        switch (reportType) {
            case 'user':
                reportData = await getUserGrowthReport(range);
                break;
            case 'hospital':
                reportData = await getHospitalNetworkReport(range);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Report type "${reportType}" is currently inactive`,
                    message: 'Only User Growth and Hospital Network reports are active'
                });
        }

        res.json({
            success: true,
            data: reportData,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Report generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export report
router.get('/export/:reportType', async (req, res) => {
    try {
        const { reportType } = req.params;
        const { format = 'pdf', range = 'last-30-days' } = req.query;

        console.log(`📤 Exporting ${reportType} report as ${format}`);

        let reportData;
        let title;

        switch (reportType) {
            case 'user':
                reportData = await getUserGrowthReport(range);
                title = 'User Growth Report';
                break;
            case 'hospital':
                reportData = await getHospitalNetworkReport(range);
                title = 'Hospital Network Report';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Report type "${reportType}" is currently inactive`
                });
        }

        if (format === 'pdf') {
            const pdfDoc = generatePDF(reportData, title, range);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
            
            pdfDoc.pipe(res);
            pdfDoc.end();
        } else if (format === 'csv') {
            const csvData = convertToCSV(reportData, title);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`);
            
            res.send(csvData);
        } else {
            res.status(400).json({
                success: false,
                error: 'Unsupported export format'
            });
        }

    } catch (error) {
        console.error('❌ Export error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== ANALYTICS DASHBOARD ====================

// Get analytics dashboard data
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { timeRange, startDate, endDate } = req.query;
    
    console.log('📊 Analytics Dashboard Request:');
    console.log('  - timeRange:', timeRange);
    console.log('  - startDate:', startDate);
    console.log('  - endDate:', endDate);
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log('  - Parsed start:', start.toISOString());
    console.log('  - Parsed end:', end.toISOString());
    
    // 1. Get total customers
    const customerQuery = `
      SELECT COUNT(*) as count 
      FROM customer 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const customerResult = await db.query(customerQuery, [start, end]);
    const totalCustomers = parseInt(customerResult.rows?.[0]?.count || customerResult[0]?.count || 0);
    console.log('  - Total customers:', totalCustomers);
    
    // 2. Get total revenue from policy table (case-insensitive status)
    const revenueQuery = `
      SELECT COALESCE(SUM(premium_amount), 0) as total 
      FROM policy 
      WHERE created_at BETWEEN $1 AND $2
        AND LOWER(status) = 'active'
    `;
    const revenueResult = await db.query(revenueQuery, [start, end]);
    const totalRevenue = parseFloat(revenueResult.rows?.[0]?.total || revenueResult[0]?.total || 0);
    console.log('  - Total revenue:', totalRevenue);
    
    // 3. Get active claims (case-insensitive status)
    const claimsQuery = `
      SELECT COUNT(*) as count 
      FROM claim 
      WHERE filing_date BETWEEN $1 AND $2 
        AND LOWER(status) != 'closed'
    `;
    const claimsResult = await db.query(claimsQuery, [start, end]);
    const activeClaims = parseInt(claimsResult.rows?.[0]?.count || claimsResult[0]?.count || 0);
    console.log('  - Active claims:', activeClaims);
    
    // 4. Get average claim time for closed claims (case-insensitive status)
    const avgClaimTimeQuery = `
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - filing_date))/86400), 0) as avg_days
      FROM claim 
      WHERE filing_date BETWEEN $1 AND $2 
        AND LOWER(status) = 'closed'
        AND updated_at IS NOT NULL
    `;
    const avgClaimTimeResult = await db.query(avgClaimTimeQuery, [start, end]);
    const avgClaimTime = parseFloat(avgClaimTimeResult.rows?.[0]?.avg_days || avgClaimTimeResult[0]?.avg_days || 0);
    console.log('  - Average claim time (days):', avgClaimTime);
    
    // 5. Get total policies
    const policiesQuery = `
      SELECT COUNT(*) as count 
      FROM policy 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const policiesResult = await db.query(policiesQuery, [start, end]);
    const totalPolicies = parseInt(policiesResult.rows?.[0]?.count || policiesResult[0]?.count || 0);
    console.log('  - Total policies:', totalPolicies);
    
    // 6. Get total commission (case-insensitive status)
    const commissionQuery = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM commission 
      WHERE created_at BETWEEN $1 AND $2 
        AND LOWER(status) = 'paid'
    `;
    const commissionResult = await db.query(commissionQuery, [start, end]);
    const totalCommission = parseFloat(commissionResult.rows?.[0]?.total || commissionResult[0]?.total || 0);
    console.log('  - Total commission:', totalCommission);
    
    // 7. Get total agents (case-insensitive status for active agents)
    const agentsQuery = `
      SELECT COUNT(*) as count 
      FROM agent 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const agentsResult = await db.query(agentsQuery, [start, end]);
    const totalAgents = parseInt(agentsResult.rows?.[0]?.count || agentsResult[0]?.count || 0);
    console.log('  - Total agents:', totalAgents);
    
    // 8. Get total admins
    const adminsQuery = `SELECT COUNT(*) as count FROM admin`;
    const adminsResult = await db.query(adminsQuery);
    const totalAdmins = parseInt(adminsResult.rows?.[0]?.count || adminsResult[0]?.count || 0);
    console.log('  - Total admins:', totalAdmins);
    
    // 9. Get user growth trends (monthly)
    const userGrowthQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as period,
        COUNT(*) as count
      FROM customer
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
      LIMIT 12
    `;
    const userGrowthResult = await db.query(userGrowthQuery, [start, end]);
    const userGrowth = userGrowthResult.rows || userGrowthResult || [];
    console.log('  - User growth periods:', userGrowth.length);
    
    // 10. Get revenue trends (monthly) - case-insensitive status
    const revenueTrendQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as period,
        COALESCE(SUM(premium_amount), 0) as revenue
      FROM policy
      WHERE created_at BETWEEN $1 AND $2
        AND LOWER(status) = 'active'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
      LIMIT 12
    `;
    const revenueTrendResult = await db.query(revenueTrendQuery, [start, end]);
    const revenueData = revenueTrendResult.rows || revenueTrendResult || [];
    console.log('  - Revenue periods:', revenueData.length);
    
    // 11. Get plan distribution - COMPREHENSIVE CASE-INSENSITIVE MATCHING
    // First, debug what policy types exist
    const debugPolicyTypes = await db.query(`
      SELECT DISTINCT policy_type FROM policy 
      WHERE created_at BETWEEN $1 AND $2
    `, [start, end]);
    console.log('🔍 Policy types in policy table:', debugPolicyTypes.rows);
    
    const debugPlanTypes = await db.query(`
      SELECT DISTINCT policy_type::text FROM policy_plans WHERE status = 'active'
    `);
    console.log('🔍 Policy types in policy_plans table:', debugPlanTypes.rows);
    
    // Main distribution query with multiple case-insensitive strategies
    let distribution = [];
    
    // Strategy 1: Try case-insensitive matching with LOWER()
    const distributionQuery1 = `
      SELECT 
        pp.plan_name as name,
        COUNT(p.policy_id) as value
      FROM policy_plans pp
      LEFT JOIN policy p ON LOWER(p.policy_type) = LOWER(pp.policy_type::text)
        AND p.created_at BETWEEN $1 AND $2
        AND LOWER(p.status) = 'active'
      WHERE LOWER(pp.status) = 'active'
      GROUP BY pp.plan_name, pp.policy_type
      ORDER BY pp.plan_name
    `;
    
    const distributionResult1 = await db.query(distributionQuery1, [start, end]);
    distribution = distributionResult1.rows || distributionResult1 || [];
    
    console.log('=== PLAN DISTRIBUTION (Strategy 1 - LOWER()) ===');
    distribution.forEach(plan => {
      console.log(`  - ${plan.name}: ${plan.value} policies`);
    });
    
    // Strategy 2: If no matches found, try with ILIKE (PostgreSQL case-insensitive)
    if (distribution.length === 0 || distribution.every(d => parseInt(d.value) === 0)) {
      console.log('Strategy 1 returned no matches, trying Strategy 2 (ILIKE)...');
      
      const distributionQuery2 = `
        SELECT 
          pp.plan_name as name,
          COALESCE(
            (SELECT COUNT(*) 
             FROM policy p 
             WHERE p.policy_type ILIKE pp.policy_type::text
               AND p.created_at BETWEEN $1 AND $2
               AND LOWER(p.status) = 'active'
            ), 0
          ) as value
        FROM policy_plans pp
        WHERE LOWER(pp.status) = 'active'
        ORDER BY pp.plan_name
      `;
      
      const distributionResult2 = await db.query(distributionQuery2, [start, end]);
      distribution = distributionResult2.rows || distributionResult2 || [];
      
      console.log('=== PLAN DISTRIBUTION (Strategy 2 - ILIKE) ===');
      distribution.forEach(plan => {
        console.log(`  - ${plan.name}: ${plan.value} policies`);
      });
    }
    
    // Strategy 3: Try direct mapping with UPPER() (both uppercase)
    if (distribution.length === 0 || distribution.every(d => parseInt(d.value) === 0)) {
      console.log('Strategy 2 returned no matches, trying Strategy 3 (UPPER())...');
      
      const distributionQuery3 = `
        SELECT 
          pp.plan_name as name,
          COUNT(p.policy_id) as value
        FROM policy_plans pp
        LEFT JOIN policy p ON UPPER(p.policy_type) = UPPER(pp.policy_type::text)
          AND p.created_at BETWEEN $1 AND $2
          AND LOWER(p.status) = 'active'
        WHERE LOWER(pp.status) = 'active'
        GROUP BY pp.plan_name, pp.policy_type
        ORDER BY pp.plan_name
      `;
      
      const distributionResult3 = await db.query(distributionQuery3, [start, end]);
      distribution = distributionResult3.rows || distributionResult3 || [];
      
      console.log('=== PLAN DISTRIBUTION (Strategy 3 - UPPER()) ===');
      distribution.forEach(plan => {
        console.log(`  - ${plan.name}: ${plan.value} policies`);
      });
    }
    
    // If still no policies found, show all plans with zero counts
    if (distribution.length === 0 || distribution.every(d => parseInt(d.value) === 0)) {
      console.log('No policies found matching any strategy, showing all plans with zero counts');
      const allPlansQuery = `
        SELECT plan_name as name, 0 as value
        FROM policy_plans
        WHERE LOWER(status) = 'active'
        ORDER BY plan_name
      `;
      const allPlansResult = await db.query(allPlansQuery);
      distribution = allPlansResult.rows || allPlansResult || [];
      console.log(`Showing ${distribution.length} plans with zero counts`);
    }
    
    // Ensure values are numbers
    distribution = distribution.map(plan => ({
      name: plan.name,
      value: parseInt(plan.value) || 0
    }));
    
    console.log('=== FINAL DISTRIBUTION ===');
    distribution.forEach(plan => {
      console.log(`  - ${plan.name}: ${plan.value} policies`);
    });
    
    // 12. Get recent activity (case-insensitive for statuses)
    const customerActivityQuery = `
      SELECT 
        'New customer registered' as description,
        CONCAT(first_name, ' ', last_name) as user_name,
        'customer' as entity_type,
        created_at
      FROM customer
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
      LIMIT 3
    `;
    
    const policyActivityQuery = `
      SELECT 
        'Policy purchased' as description,
        CONCAT(c.first_name, ' ', c.last_name) as user_name,
        'policy' as entity_type,
        p.created_at
      FROM policy p
      JOIN customer c ON p.customer_id = c.customer_id
      WHERE p.created_at BETWEEN $1 AND $2
        AND LOWER(p.status) = 'active'
      ORDER BY p.created_at DESC
      LIMIT 3
    `;
    
    const claimActivityQuery = `
      SELECT 
        'Claim submitted' as description,
        CONCAT(c.first_name, ' ', c.last_name) as user_name,
        'claim' as entity_type,
        cl.filing_date as created_at
      FROM claim cl
      JOIN customer c ON cl.customer_id = c.customer_id
      WHERE cl.filing_date BETWEEN $1 AND $2
      ORDER BY cl.filing_date DESC
      LIMIT 3
    `;
    
    const commissionActivityQuery = `
      SELECT 
        'Commission paid' as description,
        CONCAT(a.first_name, ' ', a.last_name) as user_name,
        'agent' as entity_type,
        com.paid_at as created_at
      FROM commission com
      JOIN agent a ON com.agent_id = a.agent_id
      WHERE com.paid_at BETWEEN $1 AND $2
        AND LOWER(com.status) = 'paid'
      ORDER BY com.paid_at DESC
      LIMIT 3
    `;
    
    // Combine all activities
    const [customerActivity, policyActivity, claimActivity, commissionActivity] = await Promise.all([
      db.query(customerActivityQuery, [start, end]),
      db.query(policyActivityQuery, [start, end]),
      db.query(claimActivityQuery, [start, end]),
      db.query(commissionActivityQuery, [start, end])
    ]);
    
    let activity = [
      ...(customerActivity.rows || customerActivity || []),
      ...(policyActivity.rows || policyActivity || []),
      ...(claimActivity.rows || claimActivity || []),
      ...(commissionActivity.rows || commissionActivity || [])
    ];
    
    // Sort by created_at descending and take top 10
    activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    activity = activity.slice(0, 10);
    
    if (activity.length === 0) {
      activity = [{
        description: 'No recent activity in this period',
        user_name: 'System',
        entity_type: 'system',
        created_at: new Date()
      }];
    }
    console.log('  - Activity items:', activity.length);
    
    // Prepare response
    const response = {
      metrics: {
        total_customers: totalCustomers,
        total_revenue: totalRevenue,
        active_claims: activeClaims,
        avg_claim_time: parseFloat(avgClaimTime.toFixed(1)),
        total_policies: totalPolicies,
        total_commission: totalCommission,
        total_agents: totalAgents,
        total_admins: totalAdmins
      },
      trends: {
        userGrowth: userGrowth,
        revenueData: revenueData
      },
      distribution: distribution,
      activity: activity.map(item => ({
        description: item.description,
        user_name: item.user_name,
        entity_type: item.entity_type,
        created_at: item.created_at
      }))
    };
    
    console.log('✅ Analytics dashboard response prepared successfully');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error generating analytics dashboard:', error);
    res.status(500).json({ 
      message: 'Failed to generate analytics dashboard',
      error: error.message,
      stack: error.stack
    });
  }
});

async function getUserGrowthReport(range) {
    try {
        console.log('👥 Generating User Growth Report for range:', range);
        
        let whereClause = '';
        
        // PostgreSQL date conditions
        switch (range) {
            case 'last-7-days':
                whereClause = `WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`;
                break;
            case 'last-30-days':
                whereClause = `WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`;
                break;
            case 'last-quarter':
                whereClause = `WHERE created_at >= CURRENT_DATE - INTERVAL '3 months'`;
                break;
            case 'last-year':
                whereClause = `WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'`;
                break;
            case 'all-time':
                whereClause = ''; // No filter for all time
                break;
            default:
                whereClause = `WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`;
                break;
        }
        
        console.log('Where clause:', whereClause);
        
        // Get user growth data grouped by month
        let growthQuery = `
            SELECT 
                TO_CHAR(created_at, 'YYYY-MM') as period,
                COUNT(*) as new_users
            FROM customer
            ${whereClause}
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY TO_CHAR(created_at, 'YYYY-MM') ASC
        `;

        console.log('📊 User growth query:', growthQuery);
        
        const result = await db.query(growthQuery);
        const rows = result.rows || result;
        
        console.log(`Found ${rows.length} periods with data`);
        
        // If no data found for the date range, return empty data structure (not mock data)
        if (rows.length === 0) {
            console.log(`No customer data found for range: ${range}`);
            return {
                labels: ['No Data'],
                data: [0],
                cumulativeData: [0],
                summary: {
                    total_customers: 0,
                    new_last_30_days: 0,
                    active_customers: 0,
                    male_customers: 0,
                    female_customers: 0,
                    top_city: 'N/A'
                },
                growthRate: '0%',
                rawData: [],
                hasData: false,
                message: `No customer data available for the selected time range (${range.replace(/-/g, ' ')})`
            };
        }
        
        // Calculate cumulative users
        let cumulative = 0;
        const cumulativeUsers = rows.map(row => {
            cumulative += parseInt(row.new_users) || 0;
            return cumulative;
        });

        const labels = rows.map(row => {
            const [year, month] = row.period.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleString('default', { month: 'short', year: 'numeric' });
        });
        const newUsers = rows.map(row => parseInt(row.new_users) || 0);

        // Get total customer count (without date filter)
        const totalQuery = `SELECT COUNT(*) as total FROM customer`;
        const totalResult = await db.query(totalQuery);
        const totalCustomers = parseInt(totalResult.rows?.[0]?.total || totalResult[0]?.total || 0);

        // Get active customers count
        const activeQuery = `SELECT COUNT(*) as active FROM customer WHERE status = 'active'`;
        const activeResult = await db.query(activeQuery);
        const activeCustomers = parseInt(activeResult.rows?.[0]?.active || activeResult[0]?.active || 0);
        
        // Get new users in last 30 days
        const newLast30Query = `SELECT COUNT(*) as count FROM customer WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`;
        const newLast30Result = await db.query(newLast30Query);
        const newLast30Days = parseInt(newLast30Result.rows?.[0]?.count || newLast30Result[0]?.count || 0);

        return {
            labels,
            data: newUsers,
            cumulativeData: cumulativeUsers,
            summary: {
                total_customers: totalCustomers,
                new_last_30_days: newLast30Days,
                active_customers: activeCustomers,
                male_customers: 0,
                female_customers: 0,
                top_city: 'N/A'
            },
            growthRate: calculateGrowthRate(newUsers),
            rawData: rows,
            hasData: true
        };

    } catch (error) {
        console.error('❌ User growth report error:', error.message);
        console.error('Error stack:', error.stack);
        // Return empty data structure instead of mock data
        return {
            labels: ['Error'],
            data: [0],
            cumulativeData: [0],
            summary: {
                total_customers: 0,
                new_last_30_days: 0,
                active_customers: 0,
                male_customers: 0,
                female_customers: 0,
                top_city: 'N/A'
            },
            growthRate: '0%',
            rawData: [],
            hasData: false,
            message: 'Error loading customer data'
        };
    }
}

async function getHospitalNetworkReport(range) {
    try {
        console.log('🏥 Generating Hospital Network Report for range:', range);
        
        let whereClause = '';
        let useDateFilter = true;
        
        // First, check what date range of data exists
        const dateRangeQuery = `
            SELECT 
                MIN(created_at) as oldest_date,
                MAX(created_at) as newest_date,
                COUNT(*) as total_with_dates
            FROM hospital 
            WHERE created_at IS NOT NULL
        `;
        const dateRangeResult = await db.query(dateRangeQuery);
        console.log('📊 Date range in DB:', dateRangeResult.rows[0]);
        
        // PostgreSQL date conditions based on range
        switch (range) {
            case 'last-7-days':
                whereClause = `WHERE created_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
                break;
            case 'last-30-days':
                whereClause = `WHERE created_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
                break;
            case 'last-quarter':
                whereClause = `WHERE created_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '3 months'`;
                break;
            case 'last-year':
                whereClause = `WHERE created_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '1 year'`;
                break;
            case 'all-time':
                whereClause = `WHERE created_at IS NOT NULL`; // Only include hospitals with dates
                break;
            default:
                whereClause = `WHERE created_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
                break;
        }
        
        console.log('📅 Where clause:', whereClause);
        
        // Get hospital statistics by status with date filter
        let statusQuery = `
            SELECT 
                COALESCE(status, 'pending') as status,
                COUNT(*) as count
            FROM hospital
            ${whereClause}
            GROUP BY status
            ORDER BY count DESC
        `;

        console.log('📊 Hospital query:', statusQuery);
        
        const statusResult = await db.query(statusQuery);
        const result = statusResult.rows || statusResult;
        
        console.log(`✅ Found ${result.length} status groups for range: ${range}`);
        console.log('📊 Query result:', JSON.stringify(result, null, 2));
        
        // If no data found for this specific date range, return "No Data"
        if (result.length === 0 || (result.length === 1 && result[0].count === 0)) {
            console.log(`⚠️ No hospital data found for range: ${range}`);
            return {
                labels: ['No Data'],
                data: [0],
                summary: {
                    total_hospitals: 0,
                    verified_hospitals: 0,
                    new_last_30_days: 0,
                    cities_covered: 0,
                    states_covered: 0,
                    top_city: 'N/A'
                },
                rawData: [],
                hasData: false,
                message: `No hospital data available for the selected time range (${range.replace(/-/g, ' ')})`
            };
        }

        const labels = result.map(row => row.status || 'pending');
        const data = result.map(row => parseInt(row.count) || 0);
        
        // Calculate total hospitals for this time range only
        const totalHospitals = data.reduce((a, b) => a + b, 0);
        
        // Count verified hospitals for this time range only
        let verifiedHospitals = 0;
        try {
            const verifiedQuery = `
                SELECT COUNT(*) as verified 
                FROM hospital 
                ${whereClause} AND verified_status = true
            `;
            const verifiedResult = await db.query(verifiedQuery);
            verifiedHospitals = parseInt(verifiedResult.rows?.[0]?.verified || verifiedResult[0]?.verified || 0);
        } catch (err) {
            console.log('Note: verified_status column query issue:', err.message);
        }

        return {
            labels,
            data,
            summary: {
                total_hospitals: totalHospitals,
                verified_hospitals: verifiedHospitals,
                new_last_30_days: 0,
                cities_covered: 0,
                states_covered: 0,
                top_city: 'N/A'
            },
            rawData: result,
            hasData: true,
            timeRange: range
        };

    } catch (error) {
        console.error('❌ Hospital network report error:', error.message);
        console.error('Error stack:', error.stack);
        return {
            labels: ['Error'],
            data: [0],
            summary: {
                total_hospitals: 0,
                verified_hospitals: 0,
                new_last_30_days: 0,
                cities_covered: 0,
                states_covered: 0,
                top_city: 'N/A'
            },
            rawData: [],
            hasData: false,
            message: 'Error loading hospital data'
        };
    }
}
// ========== HELPER FUNCTIONS ==========

function getDateCondition(range, dateColumn) {
    let whereClause = '';
    let params = [];
    
    switch (range) {
        case 'last-7-days':
            whereClause = `WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
            break;
        case 'last-30-days':
            whereClause = `WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
            break;
        case 'last-quarter':
            whereClause = `WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)`;
            break;
        case 'last-year':
            whereClause = `WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)`;
            break;
        case 'all-time':
        default:
            whereClause = '';
            break;
    }
    
    return { whereClause, params };
}

function calculateGrowthRate(dataArray) {
    if (!dataArray || dataArray.length < 2) return '0%';
    
    const first = dataArray[0] || 0;
    const last = dataArray[dataArray.length - 1] || 0;
    
    if (first === 0) return last > 0 ? '∞' : '0%';
    
    const growth = ((last - first) / first) * 100;
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
}

function generatePDF(reportData, title, range) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Date Range: ${range.replace(/-/g, ' ')}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(2);
    
    doc.fontSize(16).font('Helvetica-Bold').text('SUMMARY', { underline: true });
    doc.moveDown();
    
    if (reportData.summary) {
        let y = doc.y;
        Object.entries(reportData.summary).forEach(([key, value]) => {
            const displayName = key.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            doc.font('Helvetica-Bold').fontSize(12).text(displayName + ':', 50, y);
            doc.font('Helvetica').text(String(value), 250, y);
            y += 20;
        });
    }
    
    doc.end();
    return doc;
}

function convertToCSV(reportData, title) {
    const rows = [];
    rows.push(`"${title}"`);
    rows.push(`"Generated: ${new Date().toLocaleString()}"`);
    rows.push('');
    
    if (reportData.summary) {
        rows.push('"SUMMARY"');
        rows.push('"Metric","Value"');
        Object.entries(reportData.summary).forEach(([key, value]) => {
            const displayName = key.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            rows.push(`"${displayName}","${value}"`);
        });
    }
    
    return rows.join('\n');
}

function getSampleUserGrowthData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const newUsers = [45, 52, 49, 61, 55, 58];
    let cumulative = 0;
    const cumulativeUsers = newUsers.map(num => { cumulative += num; return cumulative; });

    return {
        labels: months,
        data: newUsers,
        cumulativeData: cumulativeUsers,
        summary: {
            total_customers: 450,
            new_last_30_days: 75,
            active_customers: 420,
            male_customers: 240,
            female_customers: 210,
            top_city: 'New York'
        },
        growthRate: '+15.2%',
        rawData: months.map((month, i) => ({ period: `2024-${i+1}`, new_users: newUsers[i] }))
    };
}

function getSampleHospitalData() {
    return {
        labels: ['Verified', 'Pending', 'Inactive'],
        data: [45, 12, 5],
        summary: {
            total_hospitals: 62,
            verified_hospitals: 45,
            new_last_30_days: 8,
            cities_covered: 25,
            states_covered: 12,
            top_city: 'New York'
        },
        rawData: [
            { status: 'verified', count: 45 },
            { status: 'pending', count: 12 },
            { status: 'inactive', count: 5 }
        ]
    };
}

module.exports = router;