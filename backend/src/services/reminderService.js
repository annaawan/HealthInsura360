// backend/src/services/reminderService.js
const nodemailer = require('nodemailer');
const db = require('../config/database');

class ReminderService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.SMTP_SERVICE || 'gmail',
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            },
            tls: { rejectUnauthorized: false }
        });
    }

    // Send email reminder
    async sendEmailReminder(reminderData) {
        try {
            const emailContent = this.generateReminderEmailTemplate(reminderData);
            
            const mailOptions = {
                from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
                to: reminderData.customer_email,
                subject: reminderData.subject,
                html: emailContent
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Reminder email sent to ${reminderData.customer_email}: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Failed to send reminder email:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Generate reminder email template
    generateReminderEmailTemplate(data) {
        const daysUntilDue = data.days_until_due;
        let urgencyClass = '';
        let urgencyText = '';
        
        if (daysUntilDue <= 3) {
            urgencyClass = '#dc3545';
            urgencyText = 'URGENT: Payment due soon!';
        } else if (daysUntilDue <= 7) {
            urgencyClass = '#ffc107';
            urgencyText = 'Payment reminder';
        } else {
            urgencyClass = '#28a745';
            urgencyText = 'Upcoming payment reminder';
        }
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Payment Reminder</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #0cc0df, #0aa9c4); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .urgency-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; background-color: ${urgencyClass}; margin-bottom: 15px; }
                    .details-box { background: #f8f9fa; border-left: 4px solid #0cc0df; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                    .amount { font-size: 28px; font-weight: bold; color: #28a745; text-align: center; padding: 15px; background: #d4edda; border-radius: 8px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 24px; background: #0cc0df; color: white; text-decoration: none; border-radius: 5px; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>💰 Payment Reminder</h2>
                        <p>HealthInsura360</p>
                    </div>
                    <div class="content">
                        <div class="urgency-badge">${urgencyText}</div>
                        <p>Dear <strong>${data.customer_name}</strong>,</p>
                        <p>This is a reminder that your premium payment is due soon.</p>
                        
                        <div class="details-box">
                            <div class="detail-row"><strong>Policy Number:</strong> <span>#${data.policy_id}</span></div>
                            <div class="detail-row"><strong>Policy Type:</strong> <span>${data.policy_type}</span></div>
                            <div class="detail-row"><strong>Due Date:</strong> <span>${data.due_date}</span></div>
                            <div class="detail-row"><strong>Days Until Due:</strong> <span>${daysUntilDue} days</span></div>
                        </div>
                        
                        <div class="amount">Amount Due: $${data.amount.toFixed(2)}</div>
                        
                        <p style="text-align: center;">
                            <a href="https://healthinsura360.com/payments" class="button">Make Payment Now</a>
                        </p>
                        
                        <p>If you have already made the payment, please disregard this message.</p>
                        <p>For any questions, contact your agent or our support team.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated reminder from HealthInsura360.</p>
                        <p>© ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = new ReminderService();