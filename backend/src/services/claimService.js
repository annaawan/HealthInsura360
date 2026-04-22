// backend/src/services/claimService.js
const nodemailer = require('nodemailer');
const db = require('../config/database');

class ClaimService {
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

    // Send claim approval email
    async sendClaimApprovalEmail(claimData, claimantEmail, claimantName, paymentDetails = null) {
        console.log('📧 Sending claim approval email to:', claimantEmail);
        
        try {
            const emailContent = this.generateClaimApprovalTemplate(claimData, claimantName, paymentDetails);
            
            const mailOptions = {
                from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
                to: claimantEmail,
                subject: `✅ Claim Approved - Claim #${claimData.claim_id}`,
                html: emailContent
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Claim approval email sent: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Failed to send approval email:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Send claim payment confirmation email (when payment is successful)
    async sendClaimPaymentConfirmationEmail(claimData, claimantEmail, claimantName) {
        console.log('📧 Sending claim payment confirmation email to:', claimantEmail);
        
        try {
            const emailContent = this.generateClaimPaymentConfirmationTemplate(claimData, claimantName);
            
            const mailOptions = {
                from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
                to: claimantEmail,
                subject: `💰 Payment Confirmed - Claim #${claimData.claim_id}`,
                html: emailContent
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Claim payment confirmation email sent: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Failed to send payment confirmation email:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Send claim disapproval email
    async sendClaimDisapprovalEmail(claimData, claimantEmail, claimantName, reason) {
        console.log('📧 Sending claim disapproval email to:', claimantEmail);
        
        try {
            const emailContent = this.generateClaimDisapprovalTemplate(claimData, claimantName, reason);
            
            const mailOptions = {
                from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
                to: claimantEmail,
                subject: `❌ Claim Decision - Claim #${claimData.claim_id}`,
                html: emailContent
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Claim disapproval email sent: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Failed to send disapproval email:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Generate claim payment confirmation email template
    generateClaimPaymentConfirmationTemplate(claimData, claimantName) {
        const amount = parseFloat(claimData.insurance_paid || claimData.approved_amount || claimData.claim_amount) || 0;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Payment Confirmed</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #1a56db, #1e429f); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .details-box { background: #f8f9fa; border-left: 4px solid #1a56db; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                    .amount { font-size: 32px; font-weight: bold; color: #1a56db; text-align: center; padding: 15px; background: #dbeafe; border-radius: 8px; margin: 20px 0; }
                    .success-icon { font-size: 48px; text-align: center; margin-bottom: 10px; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="success-icon">💰</div>
                        <h2>Payment Confirmed!</h2>
                        <p>HealthInsura360</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${claimantName}</strong>,</p>
                        <p>Great news! Your claim payment has been successfully processed and transferred to your account.</p>
                        
                        <div class="details-box">
                            <h3 style="margin-top: 0;">Payment Details</h3>
                            <div class="detail-row"><strong>Claim ID:</strong> <span>#${claimData.claim_id}</span></div>
                            <div class="detail-row"><strong>Payment ID:</strong> <span>${claimData.payment_id || 'N/A'}</span></div>
                            <div class="detail-row"><strong>Transaction ID:</strong> <span>${claimData.transaction_id || 'N/A'}</span></div>
                            <div class="detail-row"><strong>Transfer ID:</strong> <span>${claimData.stripe_transfer_id || 'N/A'}</span></div>
                            <div class="detail-row"><strong>Transfer Date:</strong> <span>${new Date().toLocaleDateString()}</span></div>
                        </div>
                        
                        <div class="amount">
                            Amount Transferred: $${amount.toFixed(2)}
                        </div>
                        
                        <p>The amount has been sent to your registered bank account. Please allow 2-3 business days for the funds to appear in your account depending on your bank's processing time.</p>
                        
                        <p>If you have any questions about this payment, please contact our support team.</p>
                        
                        <p>Thank you for choosing HealthInsura360.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from HealthInsura360.</p>
                        <p>© ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Generate claim approval email template
    generateClaimApprovalTemplate(claimData, claimantName, paymentDetails) {
        const amount = parseFloat(claimData.claim_amount) || 0;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Claim Approved</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .details-box { background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                    .amount { font-size: 28px; font-weight: bold; color: #28a745; text-align: center; padding: 15px; background: #d4edda; border-radius: 8px; margin: 20px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>✅ Claim Approved</h2>
                        <p>HealthInsura360</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${claimantName}</strong>,</p>
                        <p>We are pleased to inform you that your claim has been <strong>APPROVED</strong>.</p>
                        
                        <div class="details-box">
                            <div class="detail-row"><strong>Claim ID:</strong> <span>#${claimData.claim_id}</span></div>
                            <div class="detail-row"><strong>Policy ID:</strong> <span>#${claimData.policy_id}</span></div>
                            <div class="detail-row"><strong>Claim Type:</strong> <span>${claimData.claim_type}</span></div>
                            <div class="detail-row"><strong>Approved Amount:</strong> <span>$${amount.toFixed(2)}</span></div>
                            ${claimData.approval_notes ? `<div class="detail-row"><strong>Notes:</strong> <span>${claimData.approval_notes}</span></div>` : ''}
                        </div>
                        
                        <div class="amount">Approved Amount: $${amount.toFixed(2)}</div>
                        
                        ${paymentDetails ? `
                        <div class="details-box">
                            <h3>💰 Payment Information</h3>
                            <div class="detail-row"><strong>Payment Status:</strong> <span>${paymentDetails.status}</span></div>
                            <div class="detail-row"><strong>Payment ID:</strong> <span>${paymentDetails.payment_intent_id}</span></div>
                            <div class="detail-row"><strong>Transfer Date:</strong> <span>${paymentDetails.transfer_date}</span></div>
                        </div>
                        <p>The amount has been transferred to your registered account. Please allow 2-3 business days for the funds to appear.</p>
                        ` : '<p>Your payment is being processed and will be transferred shortly.</p>'}
                        
                        <p>Thank you for choosing HealthInsura360.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from HealthInsura360.</p>
                        <p>© ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Generate claim disapproval email template
    generateClaimDisapprovalTemplate(claimData, claimantName, reason) {
        const amount = parseFloat(claimData.claim_amount) || 0;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Claim Update</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .details-box { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .reason-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>❌ Claim Update</h2>
                        <p>HealthInsura360</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${claimantName}</strong>,</p>
                        <p>After careful review, your claim has been <strong>DECLINED</strong>.</p>
                        
                        <div class="details-box">
                            <div class="detail-row"><strong>Claim ID:</strong> <span>#${claimData.claim_id}</span></div>
                            <div class="detail-row"><strong>Policy ID:</strong> <span>#${claimData.policy_id}</span></div>
                            <div class="detail-row"><strong>Claim Type:</strong> <span>${claimData.claim_type}</span></div>
                            <div class="detail-row"><strong>Requested Amount:</strong> <span>$${amount.toFixed(2)}</span></div>
                        </div>
                        
                        <div class="reason-box">
                            <strong>Reason for Disapproval:</strong><br>
                            ${reason}
                        </div>
                        
                        <p>If you have any questions about this decision, please contact our support team or your insurance agent.</p>
                        
                        <p>We appreciate your understanding.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from HealthInsura360.</p>
                        <p>© ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Log claim audit
    async logClaimAudit(claimId, action, oldStatus, newStatus, performedBy, performedByType, reason, notes, ipAddress) {
        try {
            await db.query(`
                INSERT INTO claim_audit_log (
                    claim_id, action, old_status, new_status,
                    performed_by, performed_by_type, reason, notes, ip_address, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            `, [claimId, action, oldStatus, newStatus, performedBy, performedByType, reason, notes, ipAddress]);
            console.log(`✅ Claim audit logged for claim ${claimId}: ${action}`);
        } catch (error) {
            console.error('❌ Failed to log claim audit:', error.message);
        }
    }

    // Send detailed claim approval email with payment information
    async sendDetailedClaimApprovalEmail(claimData, claimantEmail, claimantName) {
        console.log('📧 Sending detailed claim approval email to:', claimantEmail);
        
        try {
            const emailContent = this.generateDetailedClaimApprovalTemplate(claimData, claimantName);
            
            const mailOptions = {
                from: `"HealthInsura360" <${process.env.SMTP_EMAIL}>`,
                to: claimantEmail,
                subject: `✅ Claim Approved - Payment Processed - #${claimData.claim_id}`,
                html: emailContent
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Detailed claim email sent: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Failed to send detailed email:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Generate detailed claim approval email template
    generateDetailedClaimApprovalTemplate(claimData, claimantName) {
        const coverageTypeLabels = {
            'full_coverage': 'Full Coverage',
            'with_deductible': 'Deductible Applied',
            'with_copay': 'Co-pay Applied',
            'partial': 'Partial Approval',
            'excess_coverage_copay': 'Excess Coverage with Co-pay'
        };
        
        const coverageTypeLabel = coverageTypeLabels[claimData.coverage_type] || 'Standard Approval';
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Claim Decision</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .explanation-box { background: #e8f4f8; border-left: 4px solid #0cc0df; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .details-box { background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .amount-breakdown { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
                    .insurance-amount { font-size: 28px; font-weight: bold; color: #28a745; text-align: center; padding: 15px; background: #d4edda; border-radius: 8px; margin: 20px 0; }
                    .client-amount { font-size: 20px; font-weight: bold; color: #dc3545; text-align: center; padding: 10px; background: #f8d7da; border-radius: 8px; margin: 10px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>✅ Claim Decision</h2>
                        <p>HealthInsura360</p>
                    </div>
                    
                    <div class="content">
                        <p>Dear <strong>${claimantName}</strong>,</p>
                        <p>Your claim has been reviewed and processed.</p>
                        
                        <div class="explanation-box">
                            <h3 style="margin-top: 0; color: #0cc0df;">Coverage Type: ${coverageTypeLabel}</h3>
                            <p>${claimData.coverage_explanation || 'Your claim has been processed according to your policy coverage.'}</p>
                        </div>
                        
                        <div class="details-box">
                            <h3 style="margin-top: 0;">Claim Details</h3>
                            <div class="detail-row"><strong>Claim ID:</strong> <span>#${claimData.claim_id}</span></div>
                            <div class="detail-row"><strong>Policy Type:</strong> <span>${claimData.policy_type}</span></div>
                            <div class="detail-row"><strong>Requested Amount:</strong> <span>$${claimData.claim_amount.toFixed(2)}</span></div>
                            <div class="detail-row"><strong>Approved Amount:</strong> <span>$${claimData.approved_amount.toFixed(2)}</span></div>
                        </div>
                        
                        <div class="amount-breakdown">
                            <h3 style="margin-top: 0;">💰 Payment Breakdown</h3>
                            ${claimData.deductible_applied > 0 ? `<div class="detail-row"><strong>Deductible Applied:</strong> <span>$${claimData.deductible_applied.toFixed(2)}</span></div>` : ''}
                            ${claimData.co_pay_amount > 0 ? `<div class="detail-row"><strong>Co-pay Amount:</strong> <span>$${claimData.co_pay_amount.toFixed(2)}</span></div>` : ''}
                            <div class="insurance-amount">
                                Insurance Pays: $${claimData.insurance_paid.toFixed(2)}
                            </div>
                            ${claimData.client_responsibility > 0 ? `
                            <div class="client-amount">
                                Your Responsibility: $${claimData.client_responsibility.toFixed(2)}
                            </div>
                            ` : ''}
                        </div>
                        
                        <!-- Payment Information Section -->
                        ${claimData.payment_id ? `
                        <div class="details-box">
                            <h3 style="margin-top: 0;">💰 Payment Information</h3>
                            <div class="detail-row"><strong>Payment ID:</strong> <span>${claimData.payment_id}</span></div>
                            <div class="detail-row"><strong>Transaction ID:</strong> <span>${claimData.transaction_id || 'N/A'}</span></div>
                            <div class="detail-row"><strong>Amount Paid:</strong> <span>$${claimData.insurance_paid.toFixed(2)}</span></div>
                            <div class="detail-row"><strong>Payment Date:</strong> <span>${new Date().toLocaleDateString()}</span></div>
                            <div class="detail-row"><strong>Payment Method:</strong> <span>Stripe / Bank Transfer</span></div>
                            <div class="detail-row"><strong>Status:</strong> <span style="color: #28a745;">Completed</span></div>
                        </div>
                        ` : ''}
                        
                        <div class="details-box">
                            <h3 style="margin-top: 0;">📋 Remaining Coverage</h3>
                            <div class="detail-row"><strong>Remaining Coverage:</strong> <span>$${claimData.remaining_coverage.toFixed(2)}</span></div>
                        </div>
                        
                        <p>If you have any questions about this decision, please contact your insurance agent.</p>
                        
                        <p>Thank you for choosing HealthInsura360.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated message from HealthInsura360.</p>
                        <p>© ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = new ClaimService();