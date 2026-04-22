// backend/src/services/receiptService.js
const nodemailer = require('nodemailer');

class ReceiptService {
    constructor() {
        // Create transporter with your SMTP settings (same as emailService.js)
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
            console.log('✅ Receipt email service connected successfully');
        } catch (error) {
            console.error('❌ Receipt email service connection failed:', error.message);
        }
    }

    // Generate HTML receipt for email (no PDF attachment)
    generateReceiptHTML(paymentData) {
        const amount = parseFloat(paymentData.amount) || 0;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Receipt</title>
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
                        background-color: #0cc0df;
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
                        <div class="success-icon">💰</div>
                        <h1>Payment Receipt</h1>
                        <p>Official Payment Confirmation</p>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">
                            Dear <strong>${this.escapeHtml(paymentData.customer_name)}</strong>,
                        </div>
                        
                        <p>Thank you for your payment! Your transaction has been completed successfully.</p>
                        
                        <div class="details-box">
                            <div class="detail-row">
                                <span class="detail-label">Receipt Number:</span>
                                <span class="detail-value">${paymentData.receipt_number}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date & Time:</span>
                                <span class="detail-value">${paymentData.date} at ${paymentData.time}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Policy ID:</span>
                                <span class="detail-value">${paymentData.policy_id}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Policy Type:</span>
                                <span class="detail-value">${paymentData.policy_type}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Method:</span>
                                <span class="detail-value">${paymentData.payment_method}</span>
                            </div>
                            ${paymentData.transaction_ref ? `
                            <div class="detail-row">
                                <span class="detail-label">Transaction Reference:</span>
                                <span class="detail-value">${paymentData.transaction_ref}</span>
                            </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value" style="color: #28a745;">${paymentData.status}</span>
                            </div>
                        </div>
                        
                        <div class="amount">
                            Amount Paid: $${amount.toFixed(2)}
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="https://healthinsura360.com/customer-dashboard" class="button">
                                View Your Dashboard
                            </a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated message from HealthInsura360. Please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                        <p>Need help? Contact us at support@healthinsura360.com</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Generate printable receipt HTML (for print/download)
    generatePrintableReceipt(paymentData) {
        const amount = parseFloat(paymentData.amount) || 0;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Receipt - ${paymentData.receipt_number}</title>
                <style>
                    @media print {
                        body { margin: 0; padding: 0; }
                        .no-print { display: none; }
                    }
                    body {
                        font-family: 'Courier New', monospace;
                        margin: 0;
                        padding: 20px;
                        background: #f0f0f0;
                    }
                    .receipt {
                        max-width: 400px;
                        margin: 0 auto;
                        background: white;
                        border: 1px solid #000;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    .company-name { font-size: 18px; font-weight: bold; }
                    .row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 12px;
                    }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
                    .footer { text-align: center; font-size: 10px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
                    button {
                        display: block;
                        margin: 20px auto;
                        padding: 10px 20px;
                        background: #0cc0df;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <div class="company-name">HealthInsura360</div>
                        <div>PAYMENT RECEIPT</div>
                    </div>
                    
                    <div class="row"><span>Receipt No:</span><span>${paymentData.receipt_number}</span></div>
                    <div class="row"><span>Date:</span><span>${paymentData.date}</span></div>
                    <div class="row"><span>Time:</span><span>${paymentData.time}</span></div>
                    
                    <div class="divider"></div>
                    
                    <div class="row"><span>Customer:</span><span>${paymentData.customer_name}</span></div>
                    <div class="row"><span>Policy ID:</span><span>${paymentData.policy_id}</span></div>
                    <div class="row"><span>Policy Type:</span><span>${paymentData.policy_type}</span></div>
                    
                    <div class="divider"></div>
                    
                    <div class="row"><span>Payment Method:</span><span>${paymentData.payment_method}</span></div>
                    ${paymentData.transaction_ref ? `<div class="row"><span>Reference:</span><span>${paymentData.transaction_ref}</span></div>` : ''}
                    
                    <div class="divider"></div>
                    
                    <div class="row total"><span>TOTAL PAID:</span><span>$${amount.toFixed(2)}</span></div>
                    <div class="row"><span>Status:</span><span>${paymentData.status}</span></div>
                    
                    <div class="footer">Thank you for your payment!</div>
                </div>
                <button class="no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
                <button class="no-print" onclick="window.close()">Close</button>
            </body>
            </html>
        `;
    }

    // Send receipt email (NO PDF attachment - just HTML)
    async sendReceiptEmail(paymentData, recipientEmail) {
        console.log('📧 Sending receipt email to:', recipientEmail);
        
        try {
            // Check if email service is configured
            if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
                console.error('❌ SMTP not configured. Please check .env file');
                return { success: false, error: 'SMTP not configured' };
            }
            
            if (!recipientEmail) {
                console.error('❌ No recipient email provided');
                return { success: false, error: 'No recipient email provided' };
            }
            
            const emailContent = this.generateReceiptHTML(paymentData);
            
            const mailOptions = {
                from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
                to: recipientEmail,
                subject: `💰 Payment Receipt - ${paymentData.receipt_number}`,
                html: emailContent,
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Receipt email sent to ${recipientEmail}: ${info.messageId}`);
            
            return { success: true, messageId: info.messageId };
            
        } catch (error) {
            console.error('❌ Failed to send receipt email:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Helper method to escape HTML
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

module.exports = new ReceiptService();