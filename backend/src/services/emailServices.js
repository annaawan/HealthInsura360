// backend/services/emailService.js
const auditLogService = require('./auditLogServices');
const nodemailer = require('nodemailer');
const db = require('../config/database');

class EmailService {
    constructor() {
        // Create transporter with your SMTP settings
        this.transporter = nodemailer.createTransport({
            service: process.env.SMTP_SERVICE || 'gmail',
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        // Verify connection
        this.verifyConnection();
    }
    
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connected successfully');
        } catch (error) {
            console.error('❌ Email service connection failed:', error.message);
        }
    }
    
    async sendCommissionPaymentNotification(commissionId, agentEmail, agentName, commissionDetails) {
    try {
        const emailContent = this.generatePaymentEmailTemplate(agentName, commissionDetails);
        
        const mailOptions = {
            from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: agentEmail,
            subject: `🎉 Commission Payment Received - $${commissionDetails.amount}`,
            html: emailContent,
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Payment notification email sent to ${agentEmail}: ${info.messageId}`);
        
        // Log email audit
        await auditLogService.logEmailNotification(
            commissionId,
            agentEmail,
            'commission_paid',
            'sent'
        );
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send payment email:', error);
        
        // Log failed email audit
        await auditLogService.logEmailNotification(
            commissionId,
            agentEmail,
            'commission_paid',
            'failed'
        );
        
        return { success: false, error: error.message };
    }
}
    
    // Generate beautiful email template
    generatePaymentEmailTemplate(agentName, commissionDetails) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Commission Payment Received</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        padding: 0;
                        background-color: #ffffff;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                    }
                    .content {
                        padding: 30px;
                    }
                    .greeting {
                        font-size: 18px;
                        margin-bottom: 20px;
                    }
                    .details-box {
                        background-color: #f8f9fa;
                        border-left: 4px solid #28a745;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 5px;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    .detail-row:last-child {
                        border-bottom: none;
                    }
                    .detail-label {
                        font-weight: 600;
                        color: #555;
                    }
                    .detail-value {
                        color: #333;
                        font-weight: 500;
                    }
                    .amount {
                        font-size: 24px;
                        font-weight: bold;
                        color: #28a745;
                        text-align: center;
                        padding: 15px;
                        background-color: #d4edda;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .footer {
                        background-color: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        border-top: 1px solid #e0e0e0;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    .success-icon {
                        font-size: 48px;
                        text-align: center;
                        margin-bottom: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="success-icon">🎉</div>
                        <h1>Commission Payment Received!</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">
                            Dear <strong>${agentName}</strong>,
                        </div>
                        
                        <p>Great news! Your commission payment has been successfully processed and is on its way to you.</p>
                        
                        <div class="details-box">
                            <div class="detail-row">
                                <span class="detail-label">Commission ID:</span>
                                <span class="detail-value">#${commissionDetails.commission_id}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Policy Number:</span>
                                <span class="detail-value">#${commissionDetails.policy_id}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Date:</span>
                                <span class="detail-value">${commissionDetails.payment_date}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Reference:</span>
                                <span class="detail-value">${commissionDetails.payment_reference}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Commission Rate:</span>
                                <span class="detail-value">${commissionDetails.rate}%</span>
                            </div>
                        </div>
                        
                        <div class="amount">
                            Amount Paid: $${commissionDetails.amount.toFixed(2)}
                        </div>
                        
                        <p>The amount will be deposited to your registered account within 2-3 business days, depending on your bank's processing time.</p>
                        
                        <p>If you have any questions about this payment, please don't hesitate to contact our support team.</p>
                        
                        <div style="text-align: center;">
                            <a href="https://healthinsura360.com/agent-dashboard/commissions" class="button">
                                View Your Dashboard
                            </a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated message from HealthInsura360. Please do not reply to this email.</p>
                        <p>&copy; 2024 HealthInsura360. All rights reserved.</p>
                        <p>Need help? Contact us at support@healthinsura360.com</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    // Log sent email in database
    async logEmailSent(commissionId, agentEmail, agentName, commissionDetails, messageId) {
        try {
            await db.query(
                `INSERT INTO email_notifications (
                    commission_id, recipient_email, recipient_name, 
                    notification_type, subject, content, status, 
                    sent_at, message_id
                ) VALUES (?, ?, ?, 'commission_paid', ?, ?, 'sent', NOW(), ?)`,
                [
                    commissionId,
                    agentEmail,
                    agentName,
                    `Commission Payment Received - $${commissionDetails.amount}`,
                    `Commission payment of $${commissionDetails.amount} has been processed for policy #${commissionDetails.policy_id}`,
                    messageId
                ]
            );
        } catch (error) {
            console.error('Failed to log email:', error);
        }
    }
    
    // Log failed email attempt
    async logEmailFailed(commissionId, agentEmail, agentName, commissionDetails, errorMessage) {
        try {
            await db.query(
                `INSERT INTO email_notifications (
                    commission_id, recipient_email, recipient_name, 
                    notification_type, subject, content, status, 
                    error_message, created_at
                ) VALUES (?, ?, ?, 'commission_paid', ?, ?, 'failed', ?, NOW())`,
                [
                    commissionId,
                    agentEmail,
                    agentName,
                    `Commission Payment Received - $${commissionDetails.amount}`,
                    `Commission payment of $${commissionDetails.amount} has been processed for policy #${commissionDetails.policy_id}`,
                    errorMessage
                ]
            );
        } catch (error) {
            console.error('Failed to log email failure:', error);
        }
    }
    
    // Send bulk commission payment summary (for admin)
    async sendCommissionSummaryEmail(adminEmail, summaryData) {
        try {
            const mailOptions = {
                from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
                to: adminEmail,
                subject: `Commission Payment Summary - ${summaryData.date}`,
                html: this.generateSummaryEmailTemplate(summaryData)
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Summary email sent to ${adminEmail}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Failed to send summary email:', error);
            return { success: false, error: error.message };
        }
    }
    
    generateSummaryEmailTemplate(summaryData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .summary-box { background: #f0f0f0; padding: 15px; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #667eea; color: white; }
                </style>
            </head>
            <body>
                <h2>Commission Payment Summary</h2>
                <p>Date: ${summaryData.date}</p>
                
                <div class="summary-box">
                    <h3>Summary</h3>
                    <p>Total Payments: $${summaryData.total_amount}</p>
                    <p>Number of Payments: ${summaryData.payment_count}</p>
                    <p>Agents Paid: ${summaryData.agent_count}</p>
                </div>
                
                <h3>Payment Details</h3>
                <table>
                    <thead>
                        <tr><th>Agent</th><th>Amount</th><th>Policy</th><th>Reference</th></tr>
                    </thead>
                    <tbody>
                        ${summaryData.payments.map(p => `
                            <tr><td>${p.agent_name}</td><td>$${p.amount}</td><td>#${p.policy_id}</td><td>${p.reference}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
    }
}

module.exports = new EmailService();