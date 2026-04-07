// backend/services/reportService.js

const db = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ReportService {
    
    // Generate commission summary report
    async generateCommissionSummary(startDate, endDate, agentId = null) {
        let query = `
            SELECT 
                c.agent_id,
                a.first_name,
                a.last_name,
                a.email,
                COUNT(c.commission_id) as total_transactions,
                SUM(c.premium_amount) as total_premium,
                SUM(c.amount) as total_commission,
                AVG(c.rate) as avg_rate,
                SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as paid_commission,
                SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as pending_commission,
                COUNT(CASE WHEN c.status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count
            FROM commission c
            JOIN agent a ON c.agent_id = a.agent_id
            WHERE c.created_at BETWEEN ? AND ?
        `;
        
        const params = [startDate, endDate];
        
        if (agentId) {
            query += ' AND c.agent_id = ?';
            params.push(agentId);
        }
        
        query += ' GROUP BY c.agent_id, a.first_name, a.last_name, a.email ORDER BY total_commission DESC';
        
        const [results] = await db.query(query, params);
        
        // Get overall totals
        const [totals] = await db.query(`
            SELECT 
                COUNT(commission_id) as total_transactions,
                SUM(premium_amount) as total_premium,
                SUM(amount) as total_commission,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_commission,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_commission
            FROM commission
            WHERE created_at BETWEEN ? AND ?
            ${agentId ? 'AND agent_id = ?' : ''}
        `, params);
        
        return {
            period: { startDate, endDate },
            summary: totals[0],
            agents: results,
            generated_at: new Date().toISOString()
        };
    }
    
    // Generate detailed transaction report
    async generateTransactionReport(startDate, endDate, status = null, agentId = null) {
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
            WHERE c.created_at BETWEEN ? AND ?
        `;
        
        const params = [startDate, endDate];
        
        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }
        
        if (agentId) {
            query += ' AND c.agent_id = ?';
            params.push(agentId);
        }
        
        query += ' ORDER BY c.created_at DESC';
        
        const [transactions] = await db.query(query, params);
        
        return {
            period: { startDate, endDate },
            filters: { status, agentId },
            transactions,
            total_records: transactions.length,
            total_commission: transactions.reduce((sum, t) => sum + parseFloat(t.commission_amount), 0),
            generated_at: new Date().toISOString()
        };
    }
    
    // Generate agent performance report
    async generateAgentPerformanceReport(year, quarter = null) {
        let query = `
            SELECT 
                a.agent_id,
                a.first_name,
                a.last_name,
                a.email,
                a.total_sales,
                a.commission_rate,
                COUNT(DISTINCT c.policy_id) as policies_sold,
                COUNT(c.commission_id) as commission_transactions,
                SUM(c.premium_amount) as total_premium,
                SUM(c.amount) as total_commission,
                SUM(CASE WHEN MONTH(c.created_at) BETWEEN 1 AND 3 THEN c.amount ELSE 0 END) as q1_commission,
                SUM(CASE WHEN MONTH(c.created_at) BETWEEN 4 AND 6 THEN c.amount ELSE 0 END) as q2_commission,
                SUM(CASE WHEN MONTH(c.created_at) BETWEEN 7 AND 9 THEN c.amount ELSE 0 END) as q3_commission,
                SUM(CASE WHEN MONTH(c.created_at) BETWEEN 10 AND 12 THEN c.amount ELSE 0 END) as q4_commission
            FROM agent a
            LEFT JOIN commission c ON a.agent_id = c.agent_id AND YEAR(c.created_at) = ?
            GROUP BY a.agent_id, a.first_name, a.last_name, a.email, a.total_sales, a.commission_rate
            ORDER BY total_commission DESC
        `;
        
        const params = [year];
        
        const [agents] = await db.query(query, params);
        
        // Calculate overall statistics
        const overallStats = {
            total_agents: agents.length,
            total_commissions: agents.reduce((sum, a) => sum + parseFloat(a.total_commission), 0),
            total_policies: agents.reduce((sum, a) => sum + a.policies_sold, 0),
            avg_commission_per_agent: agents.reduce((sum, a) => sum + parseFloat(a.total_commission), 0) / agents.length,
            top_performer: agents[0] || null
        };
        
        return {
            year,
            quarter: quarter || 'Full Year',
            agents,
            overall_stats: overallStats,
            generated_at: new Date().toISOString()
        };
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