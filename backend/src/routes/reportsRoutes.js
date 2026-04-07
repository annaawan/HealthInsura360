// backend/src/routes/reportsRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const PDFDocument = require('pdfkit');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const reportService = require('../services/reportServices'); // Add this
const auditLogService = require('../services/auditLogServices'); // Add this

// ==================== COMMISSION REPORTS ====================

// Get commission summary report
router.get('/commission-summary', authenticate, adminMiddleware, async (req, res) => { 
     try {
        const { start_date, end_date, format = 'json' } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const reportData = await reportService.generateCommissionSummary(start_date, end_date);
        
        // Log report generation
        await auditLogService.logReportGeneration(
            req.user.admin_id,
            'commission_summary',
            { start_date, end_date, format },
            reportData.agents?.length || 0,
            format
        );
        
        if (format === 'pdf') {
            const filename = `commission_summary_${Date.now()}.pdf`;
            const filepath = await reportService.generatePDFReport(reportData, 'Commission Summary', filename);
            return res.download(filepath);
        }
        
        if (format === 'excel') {
            const filename = `commission_summary_${Date.now()}.xlsx`;
            const filepath = await reportService.generateExcelReport(reportData, 'Commission Summary', filename);
            return res.download(filepath);
        }
        
        res.json(reportData);
        
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: error.message });
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

// Get agent performance report
router.get('/agent-performance', authenticate, adminMiddleware, async (req, res) => {

    try {
        const { year, quarter, format = 'json' } = req.query;
        
        if (!year) {
            return res.status(400).json({ error: 'year is required' });
        }
        
        const reportData = await reportService.generateAgentPerformanceReport(year, quarter);
        
        if (format === 'pdf') {
            const filename = `agent_performance_${year}_${quarter || 'full'}_${Date.now()}.pdf`;
            const filepath = await reportService.generatePDFReport(reportData, 'Agent Performance Report', filename);
            return res.download(filepath);
        }
        
        if (format === 'excel') {
            const filename = `agent_performance_${year}_${quarter || 'full'}_${Date.now()}.xlsx`;
            const filepath = await reportService.generateExcelReport(reportData, 'Agent Performance Report', filename);
            return res.download(filepath);
        }
        
        res.json(reportData);
        
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: error.message });
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

// ========== USER GROWTH REPORT (MySQL version) ==========
async function getUserGrowthReport(range) {
    try {
        console.log('👥 Generating User Growth Report...');
        
        // Determine date range based on selection
        const dateCondition = getDateCondition(range, 'created_at');
        
        // Get user growth data grouped by month (MySQL syntax)
        let growthQuery = `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as period,
                COUNT(*) as new_users
            FROM customer
            ${dateCondition.whereClause}
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY DATE_FORMAT(created_at, '%Y-%m')
            LIMIT 12
        `;

        console.log('📊 User growth query:', growthQuery);
        
        const [rows] = await db.query(growthQuery, dateCondition.params);
        
        // Calculate cumulative users
        let cumulative = 0;
        const cumulativeUsers = rows.map(row => {
            cumulative += parseInt(row.new_users) || 0;
            return cumulative;
        });

        const labels = rows.map(row => {
            const [year, month] = row.period.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleString('default', { month: 'short' });
        });
        const newUsers = rows.map(row => parseInt(row.new_users) || 0);

        // Get detailed user statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_customers,
                SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_last_30_days,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_customers,
                SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) as male_customers,
                SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) as female_customers,
                (
                    SELECT city 
                    FROM customer 
                    GROUP BY city 
                    ORDER BY COUNT(*) DESC 
                    LIMIT 1
                ) as top_city
            FROM customer
            ${dateCondition.whereClause}
        `;

        const [statsResult] = await db.query(statsQuery, dateCondition.params);
        const stats = statsResult;

        return {
            labels,
            data: newUsers,
            cumulativeData: cumulativeUsers,
            summary: {
                total_customers: parseInt(stats.total_customers) || 0,
                new_last_30_days: parseInt(stats.new_last_30_days) || 0,
                active_customers: parseInt(stats.active_customers) || 0,
                male_customers: parseInt(stats.male_customers) || 0,
                female_customers: parseInt(stats.female_customers) || 0,
                top_city: stats.top_city || 'N/A'
            },
            growthRate: calculateGrowthRate(newUsers),
            rawData: rows
        };

    } catch (error) {
        console.error('❌ User growth report error:', error.message);
        return getSampleUserGrowthData();
    }
}

// ========== HOSPITAL NETWORK REPORT (MySQL version) ==========
async function getHospitalNetworkReport(range) {
    try {
        console.log('🏥 Generating Hospital Network Report...');
        
        const dateCondition = getDateCondition(range, 'created_at');
        
        // Get hospital statistics by status
        const statusQuery = `
            SELECT 
                COALESCE(status, 'Unknown') as status,
                COUNT(*) as count
            FROM hospital
            ${dateCondition.whereClause}
            GROUP BY status
            ORDER BY count DESC
        `;

        const [statusResult] = await db.query(statusQuery, dateCondition.params);

        const labels = statusResult.map(row => row.status || 'Unknown');
        const data = statusResult.map(row => parseInt(row.count) || 0);

        // Get detailed hospital statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_hospitals,
                SUM(CASE WHEN verified_status = 1 THEN 1 ELSE 0 END) as verified_hospitals,
                SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_last_30_days,
                COUNT(DISTINCT city) as cities_covered,
                COUNT(DISTINCT state) as states_covered,
                (
                    SELECT city 
                    FROM hospital 
                    WHERE city IS NOT NULL AND city != ''
                    GROUP BY city 
                    ORDER BY COUNT(*) DESC 
                    LIMIT 1
                ) as top_city
            FROM hospital
            ${dateCondition.whereClause}
        `;

        const [statsResult] = await db.query(statsQuery, dateCondition.params);
        const stats = statsResult;

        return {
            labels,
            data,
            summary: {
                total_hospitals: parseInt(stats.total_hospitals) || 0,
                verified_hospitals: parseInt(stats.verified_hospitals) || 0,
                new_last_30_days: parseInt(stats.new_last_30_days) || 0,
                cities_covered: parseInt(stats.cities_covered) || 0,
                states_covered: parseInt(stats.states_covered) || 0,
                top_city: stats.top_city || 'N/A'
            },
            rawData: statusResult
        };

    } catch (error) {
        console.error('❌ Hospital network report error:', error.message);
        return getSampleHospitalData();
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