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
    
 // In sendCommissionPaymentNotification method, add:
async sendCommissionPaymentNotification(commissionId, agentEmail, agentName, commissionDetails) {
    console.log('📧 Attempting to send email to:', agentEmail);
    console.log('📧 Email details:', { commissionId, agentName, amount: commissionDetails.amount });
    
    try {
        // Check if email service is configured
        if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
            console.error('❌ SMTP not configured. Please check .env file');
            return { success: false, error: 'SMTP not configured' };
        }
        
        const emailContent = this.generatePaymentEmailTemplate(agentName, commissionDetails);
        
        const mailOptions = {
            from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: agentEmail,
            subject: `🎉 Commission Payment Received - $${commissionDetails.amount}`,
            html: emailContent,
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Payment notification email sent to ${agentEmail}: ${info.messageId}`);
        
        // Log to database
        await db.query(
            `INSERT INTO email_notifications (
                commission_id, recipient_email, recipient_name, notification_type, 
                subject, status, sent_at, created_at
            ) VALUES ($1, $2, $3, 'commission_paid', $4, 'sent', NOW(), NOW())`,
            [commissionId, agentEmail, agentName, `Commission Payment Received - $${commissionDetails.amount}`]
        );
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send payment email:', error.message);
        return { success: false, error: error.message };
    }
}
    // Generate beautiful email template - FIXED for string amount
generatePaymentEmailTemplate(agentName, commissionDetails) {
    // Convert amount to number safely
    const amount = parseFloat(commissionDetails.amount) || 0;
    
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
                    font-size: 28px;
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
                        Dear <strong>${this.escapeHtml(agentName)}</strong>,
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
                        Amount Paid: $${amount.toFixed(2)}
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

// Add this helper method to escape HTML
escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
    // Add to emailServices.js inside the EmailService class

// Send commission approval email with payment confirmation
async sendCommissionApprovalEmail(commissionId, agentEmail, agentName, commissionDetails) {
    try {
        const emailContent = this.generateApprovalEmailTemplate(agentName, commissionDetails);
        
        const mailOptions = {
            from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: agentEmail,
            subject: `✅ Commission Approved - $${commissionDetails.amount} Payment Processed`,
            html: emailContent,
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${agentEmail}: ${info.messageId}`);
        
        await auditLogService.logEmailNotification(
            commissionId,
            agentEmail,
            'commission_approved',
            'sent'
        );
        
        // Log to email_notifications table
        await db.query(
            `INSERT INTO email_notifications (
                commission_id, recipient_email, recipient_name, notification_type, 
                subject, status, sent_at, created_at
            ) VALUES ($1, $2, $3, 'commission_approved', $4, 'sent', NOW(), NOW())`,
            [commissionId, agentEmail, agentName, `Commission Approved - $${commissionDetails.amount}`]
        );
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send approval email:', error);
        await auditLogService.logEmailNotification(commissionId, agentEmail, 'commission_approved', 'failed');
        return { success: false, error: error.message };
    }
}
// Send manual payment confirmation email
async sendManualPaymentConfirmationEmail(commissionId, agentEmail, agentName, commissionDetails) {
    console.log('📧 Sending manual payment confirmation email to:', agentEmail);
    
    try {
        const amount = parseFloat(commissionDetails.amount) || 0;
        const emailContent = this.generateManualPaymentEmailTemplate(agentName, commissionDetails);
        
        const mailOptions = {
            from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: agentEmail,
            subject: `💰 Commission Payment Processed - $${amount.toFixed(2)}`,
            html: emailContent,
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Manual payment confirmation email sent to ${agentEmail}: ${info.messageId}`);
        
        // Log to database
        await db.query(
            `INSERT INTO email_notifications (
                commission_id, recipient_email, recipient_name, notification_type,
                subject, status, sent_at, created_at
            ) VALUES ($1, $2, $3, 'manual_payment', $4, 'sent', NOW(), NOW())`,
            [commissionId, agentEmail, agentName, `Manual Payment Processed - $${amount.toFixed(2)}`]
        );
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send manual payment email:', error.message);
        return { success: false, error: error.message };
    }
}

// Generate manual payment email template
generateManualPaymentEmailTemplate(agentName, details) {
    const amount = parseFloat(details.amount) || 0;
    const paymentMethod = details.payment_method || 'Manual';
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Commission Payment Processed</title>
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
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
                    font-size: 28px;
                    font-weight: bold;
                    color: #28a745;
                    text-align: center;
                    padding: 15px;
                    background-color: #d4edda;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .payment-method {
                    display: inline-block;
                    padding: 4px 12px;
                    background-color: #e9ecef;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .notes-box {
                    background-color: #fff3cd;
                    border: 1px solid #ffc107;
                    padding: 15px;
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
                .check-icon {
                    font-size: 48px;
                    text-align: center;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="check-icon">💰</div>
                    <h1>Commission Payment Processed!</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        Dear <strong>${this.escapeHtml(agentName)}</strong>,
                    </div>
                    
                    <p>Your commission payment has been processed successfully via <strong>${paymentMethod}</strong>.</p>
                    
                    <div class="details-box">
                        <div class="detail-row">
                            <span class="detail-label">Commission ID:</span>
                            <span class="detail-value">#${details.commission_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Policy Number:</span>
                            <span class="detail-value">#${details.policy_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Date:</span>
                            <span class="detail-value">${details.payment_date}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Transaction Reference:</span>
                            <span class="detail-value">${details.payment_reference}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Method:</span>
                            <span class="detail-value">
                                <span class="payment-method">${paymentMethod}</span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Commission Rate:</span>
                            <span class="detail-value">${details.rate}%</span>
                        </div>
                    </div>
                    
                    <div class="amount">
                        Amount Paid: $${amount.toFixed(2)}
                    </div>
                    
                    ${details.notes ? `
                    <div class="notes-box">
                        <strong>Additional Notes:</strong><br>
                        ${this.escapeHtml(details.notes)}
                    </div>
                    ` : ''}
                    
                    <p>The amount will be deposited to your registered account within 2-3 business days, depending on your bank's processing time.</p>
                    
                    <p>If you have any questions about this payment, please don't hesitate to contact our support team.</p>
                    
                    <div style="text-align: center;">
                        <a href="https://healthinsura360.com/agent-dashboard/commissions" class="button" style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px;">
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
// Send commission disapproval email with reason
async sendCommissionDisapprovalEmail(commissionId, agentEmail, agentName, details) {
    try {
        const amount = parseFloat(details.amount) || 0;
        const emailContent = this.generateDisapprovalEmailTemplate(agentName, details);
        
        const mailOptions = {
            from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: agentEmail,
            subject: `❌ Commission Cancelled - $${amount.toFixed(2)}`,
            html: emailContent,
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Disapproval email sent to ${agentEmail}: ${info.messageId}`);
        
        // Use correct column names
        await db.query(
            `INSERT INTO email_notifications (
                commission_id, recipient_email, recipient_name, notification_type,
                subject, status, sent_at, created_at
            ) VALUES ($1, $2, $3, 'commission_cancelled', $4, 'sent', NOW(), NOW())`,
            [commissionId, agentEmail, agentName, `Commission Cancelled - $${amount.toFixed(2)}`]
        );
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send disapproval email:', error);
        return { success: false, error: error.message };
    }
}

// Generate approval email template
generateApprovalEmailTemplate(agentName, commissionDetails) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Commission Approved</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 30px; }
                .greeting { font-size: 18px; margin-bottom: 20px; }
                .details-box { background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                .detail-row:last-child { border-bottom: none; }
                .detail-label { font-weight: 600; color: #555; }
                .detail-value { color: #333; font-weight: 500; }
                .amount { font-size: 28px; font-weight: bold; color: #28a745; text-align: center; padding: 15px; background-color: #d4edda; border-radius: 8px; margin: 20px 0; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
                .success-icon { font-size: 48px; text-align: center; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="success-icon">✅</div>
                    <h1>Commission Approved!</h1>
                </div>
                <div class="content">
                    <div class="greeting">Dear <strong>${agentName}</strong>,</div>
                    <p>Great news! Your commission has been approved and payment has been processed.</p>
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
                    <div class="amount">Amount Paid: $${commissionDetails.amount.toFixed(2)}</div>
                    <p>The amount will be deposited to your registered account within 2-3 business days.</p>
                    <p>Thank you for your continued partnership!</p>
                </div>
                <div class="footer">
                    <p>HealthInsura360 - Automated Message</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

generateDisapprovalEmailTemplate(agentName, details) {
    const amount = parseFloat(details.amount) || 0;
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Commission Update</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 30px; }
                .greeting { font-size: 18px; margin-bottom: 20px; }
                .details-box { background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 5px; }
                .reason-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                .detail-label { font-weight: 600; color: #555; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Commission Update</h1>
                </div>
                <div class="content">
                    <div class="greeting">Dear <strong>${this.escapeHtml(agentName)}</strong>,</div>
                    <p>Your commission request has been reviewed.</p>
                    <div class="details-box">
                        <div class="detail-row">
                            <span class="detail-label">Commission ID:</span>
                            <span class="detail-value">#${details.commission_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Policy Number:</span>
                            <span class="detail-value">#${details.policy_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">$${amount.toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value" style="color: #dc3545;">Not Approved</span>
                        </div>
                    </div>
                    <div class="reason-box">
                        <strong>Reason for disapproval:</strong><br>
                        ${this.escapeHtml(details.reason)}
                        ${details.notes ? `<br><br><strong>Additional notes:</strong><br>${this.escapeHtml(details.notes)}` : ''}
                    </div>
                    <p>If you have any questions about this decision, please contact our support team.</p>
                    <p>We appreciate your understanding.</p>
                </div>
                <div class="footer">
                    <p>HealthInsura360 - Automated Message</p>
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
    // Add this method to your EmailService class (before the closing module.exports)

// Send welcome email to new customer created by agent
async sendWelcomeEmail(customerEmail, customerName, password, agentName, agentLicense) {
    console.log('📧 Sending welcome email to:', customerEmail);
    
    try {
        // Check if email service is configured
        if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
            console.error('❌ SMTP not configured. Please check .env file');
            return { success: false, error: 'SMTP not configured' };
        }
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        
        const emailContent = this.generateWelcomeEmailTemplate({
            customerName,
            password,
            agentName,
            agentLicense,
            frontendUrl,
            email: customerEmail
        });
        
        const mailOptions = {
            from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: customerEmail,
            subject: '🎉 Welcome to HealthInsura360 - Your Account Has Been Created',
            html: emailContent,
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${customerEmail}: ${info.messageId}`);
        
        // Log to database
        await db.query(
            `INSERT INTO email_notifications (
                recipient_email, recipient_name, notification_type, 
                subject, status, sent_at, created_at
            ) VALUES ($1, $2, 'welcome_email', $3, 'sent', NOW(), NOW())`,
            [customerEmail, customerName, `Welcome to HealthInsura360 - Account Created by ${agentName}`]
        );
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error.message);
        return { success: false, error: error.message };
    }
}

// Generate welcome email template
generateWelcomeEmailTemplate(data) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to HealthInsura360</title>
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
                    background: linear-gradient(135deg, #0cc0df 0%, #0aa9c4 100%);
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
                .agent-info {
                    background-color: #e8f4f8;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid #0cc0df;
                }
                .credentials-box {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                }
                .credentials-box h3 {
                    color: #856404;
                    margin-top: 0;
                }
                .password-code {
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 5px;
                    font-family: monospace;
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 1px;
                }
                .security-tip {
                    background-color: #d1ecf1;
                    border: 1px solid #bee5eb;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    color: #0c5460;
                }
                .button {
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #0cc0df;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: bold;
                }
                .footer {
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #e0e0e0;
                }
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e0e0e0;
                }
                .detail-label {
                    font-weight: 600;
                    color: #555;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div style="font-size: 48px;">🎉</div>
                    <h1>Welcome to HealthInsura360!</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        Dear <strong>${this.escapeHtml(data.customerName)}</strong>,
                    </div>
                    
                    <p>Great news! Your insurance account has been successfully created by your dedicated agent.</p>
                    
                    <div class="agent-info">
                        <h3 style="margin-top: 0; color: #0cc0df;">Your Agent Information</h3>
                        <div class="detail-row">
                            <span class="detail-label">Agent Name:</span>
                            <span>${this.escapeHtml(data.agentName)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">License Number:</span>
                            <span>${this.escapeHtml(data.agentLicense)}</span>
                        </div>
                    </div>
                    
                    <div class="credentials-box">
                        <h3>🔐 Your Login Credentials</h3>
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span>${this.escapeHtml(data.email)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Password:</span>
                            <span class="password-code">${this.escapeHtml(data.password)}</span>
                        </div>
                    </div>
                    
                    <div class="security-tip">
                        <strong>🔒 Security Tip:</strong> For your security, please change your password after your first login. 
                        You can do this from your profile dashboard.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${data.frontendUrl}/login" class="button">
                            Login to Your Account
                        </a>
                    </div>
                    
                    <h3>📋 Next Steps:</h3>
                    <ol>
                        <li>Click the button above to login to your account</li>
                        <li>Go to Profile Settings to change your password</li>
                        <li>Explore your insurance policies and coverage details</li>
                        <li>Contact your agent for any questions or assistance</li>
                    </ol>
                    
                    <p style="margin-top: 20px; font-size: 14px; color: #666;">
                        If you have any questions about your account or insurance coverage, 
                        please don't hesitate to reach out to your agent or our customer support team.
                    </p>
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
// Add this method to EmailService class
async sendClientEmail({ to, subject, message, clientName, agentName }) {
    console.log('📧 Sending client email to:', to);
    
    try {
        const mailOptions = {
            from: `"${agentName} - HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: to,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #0cc0df 0%, #0aa9c4 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="color: white; margin: 0;">HealthInsura360</h2>
                        <p style="color: white; margin: 5px 0 0;">Your Trusted Insurance Partner</p>
                    </div>
                    <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                        <p>Dear <strong>${clientName}</strong>,</p>
                        <div style="white-space: pre-line;">${message.replace(/\n/g, '<br>')}</div>
                        <hr style="margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from HealthInsura360. Please do not reply directly to this email.</p>
                    </div>
                </div>
            `,
            text: `Dear ${clientName},\n\n${message}\n\n---\nHealthInsura360`
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Client email sent to ${to}: ${info.messageId}`);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send client email:', error.message);
        return { success: false, error: error.message };
    }
}
// Send client status update email
async sendClientStatusUpdateEmail({ to, clientName, newStatus, oldStatus, agentName }) {
    console.log('📧 Sending status update email to:', to);
    
    try {
        const statusText = newStatus === 'active' ? 'activated' : 'deactivated';
        const statusColor = newStatus === 'active' ? '#28a745' : '#dc3545';
        const statusMessage = newStatus === 'active' 
            ? 'Your account has been reactivated. You can now access all features again.'
            : 'Your account has been deactivated. Please contact your agent for more information.';
        
        const mailOptions = {
            from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
            to: to,
            subject: `Account Status Update - ${statusText.toUpperCase()}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #0cc0df 0%, #0aa9c4 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="color: white; margin: 0;">HealthInsura360</h2>
                        <p style="color: white; margin: 5px 0 0;">Account Status Update</p>
                    </div>
                    <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                        <p>Dear <strong>${clientName}</strong>,</p>
                        
                        <div style="background-color: ${statusColor}10; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <p style="margin: 0; color: ${statusColor}; font-weight: bold;">
                                Your account has been ${statusText}.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #555;">
                                ${statusMessage}
                            </p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                <strong>Previous Status:</strong> ${oldStatus}<br>
                                <strong>New Status:</strong> ${newStatus}<br>
                                <strong>Updated By:</strong> ${agentName}
                            </p>
                        </div>
                        
                        <p>If you have any questions about this change, please contact your agent directly.</p>
                        
                        <hr style="margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from HealthInsura360. Please do not reply directly to this email.</p>
                    </div>
                </div>
            `,
            text: `Dear ${clientName},\n\nYour account has been ${statusText}.\n\n${statusMessage}\n\nPrevious Status: ${oldStatus}\nNew Status: ${newStatus}\nUpdated By: ${agentName}\n\nIf you have any questions, please contact your agent.\n\nHealthInsura360`
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Status update email sent to ${to}: ${info.messageId}`);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send status update email:', error.message);
        return { success: false, error: error.message };
    }
}
}

module.exports = new EmailService();