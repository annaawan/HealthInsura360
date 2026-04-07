// backend/utils/emailService.js
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP
let transporter;

try {
  transporter = nodemailer.createTransport({
    service: 'gmail', // You can use 'gmail', 'outlook', etc.
    auth: {
      user: process.env.SMTP_EMAIL || 'quratulainazhar470@gmail.com',
      pass: process.env.SMTP_PASSWORD // App password for Gmail
    }
  });

  // Verify connection
  transporter.verify(function(error, success) {
    if (error) {
      console.error('SMTP Connection Error:', error);
    } else {
      console.log('✅ SMTP Server is ready to send emails');
    }
  });
} catch (error) {
  console.error('Failed to create email transporter:', error);
}

// Function to send password reset email
exports.sendPasswordResetEmail = async (toEmail, userName, resetToken, userType) => {
  try {
    if (!transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    // Create reset link
    const encodedToken = Buffer.from(resetToken).toString('base64');
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${encodedToken}&type=${userType}`;
    
    // Email content
    const mailOptions = {
      from: {
        name: 'HealthInsura360',
        address: process.env.SMTP_EMAIL || 'quratulainazhar470@gmail.com'
      },
      to: toEmail,
      subject: 'Password Reset Request - HealthInsura360',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    padding: 20px 0;
                    background-color: #0cc0df;
                    border-radius: 8px 8px 0 0;
                }
                .header h1 {
                    color: white;
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                    background-color: #f8fafc;
                    border-radius: 0 0 8px 8px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #0cc0df;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 12px;
                }
                .warning {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>HealthInsura360</h1>
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello ${userName},</p>
                <p>You recently requested to reset your password for your HealthInsura360 account.</p>
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" class="button">Reset Password</a>
                </div>
                
                <div class="warning">
                    <p><strong>Important:</strong> This password reset link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #0cc0df; background-color: #f0faff; padding: 10px; border-radius: 4px;">
                    ${resetLink}
                </p>
                
                <div class="footer">
                    <p>This email was sent from <strong>HealthInsura360</strong> - Your Health Insurance Partner</p>
                    <p>If you need assistance, please contact our support team.</p>
                    <p>© ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `Password Reset Request for HealthInsura360\n\nHello ${userName},\n\nYou requested to reset your password. Click this link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nHealthInsura360 Team`
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    console.log('📧 Email sent to:', toEmail);
    console.log('📋 Reset link:', resetLink);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
};

// ============================================
// UPDATED: Hospital Approval Email with Password Setup Link (Stage C)
// ============================================
exports.sendApprovalEmail = async (toEmail, hospitalName, registrationNumber) => {
  try {
    if (!transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    // Generate password setup token (valid for 24 hours)
    const crypto = require('crypto');
    const setupToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours expiry

    // Store token in database (you need to implement this function or call your route)
    // You can either:
    // Option 1: Call an API endpoint
    // Option 2: Direct database query (if you have db access here)
    
    // For now, we'll assume you have a function to store the token
    // You'll need to implement this based on your project structure
    const tokenStored = await storePasswordSetupToken(toEmail, setupToken, tokenExpiry);
    
    if (!tokenStored) {
      console.warn('⚠️ Could not store password setup token, but continuing with email');
    }

    // Create password setup link
    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/hospital/setup-password?token=${setupToken}&email=${encodeURIComponent(toEmail)}`;

    const mailOptions = {
      from: {
        name: 'HealthInsura360',
        address: process.env.SMTP_EMAIL || 'quratulainazhar470@gmail.com'
      },
      to: toEmail,
      subject: '✅ Your HealthInsura360 Hospital Registration is Approved',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hospital Registration Approved</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    padding: 20px 0;
                    background: linear-gradient(135deg, #0cc0df 0%, #0a9fb3 100%);
                    border-radius: 8px 8px 0 0;
                }
                .header h1 {
                    color: white;
                    margin: 0;
                    font-size: 28px;
                }
                .content {
                    padding: 30px;
                    background-color: #f8fafc;
                    border-radius: 0 0 8px 8px;
                    border: 1px solid #e2e8f0;
                }
                .greeting {
                    font-size: 18px;
                    color: #0a2540;
                    margin-bottom: 20px;
                }
                .approval-badge {
                    background-color: #d4edda;
                    border: 1px solid #c3e6cb;
                    color: #155724;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    text-align: center;
                }
                .credentials-box {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 25px;
                    border-radius: 8px;
                    margin: 25px 0;
                    color: white;
                }
                .reg-number {
                    font-size: 32px;
                    font-weight: bold;
                    text-align: center;
                    letter-spacing: 2px;
                    background: rgba(255,255,255,0.2);
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                }
                .login-id {
                    font-size: 18px;
                    text-align: center;
                    padding: 10px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 8px;
                    margin: 10px 0;
                }
                .setup-button {
                    display: inline-block;
                    padding: 15px 40px;
                    background-color: #0cc0df;
                    color: white;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 25px 0;
                    box-shadow: 0 4px 6px rgba(12,192,223,0.3);
                }
                .setup-button:hover {
                    background-color: #0a9fb3;
                }
                .warning-box {
                    background-color: #fff3cd;
                    border: 1px solid #ffeeba;
                    color: #856404;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #e2e8f0;
                    color: #64748b;
                    font-size: 12px;
                    text-align: center;
                }
                .note {
                    font-size: 13px;
                    color: #666;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 HealthInsura360</h1>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Dear <strong>${hospitalName}</strong>,
                </div>

                <div class="approval-badge">
                    ✅ Your registration with HealthInsura360 has been APPROVED
                </div>

                <p>We are pleased to inform you that your hospital has been successfully verified and approved to join the HealthInsura360 network.</p>

                <div class="credentials-box">
                    <h3 style="margin-top: 0; text-align: center;">Your Official Credentials</h3>
                    
                    <div class="reg-number">
                        ${registrationNumber}
                    </div>
                    
                    <div class="login-id">
                        📧 Login ID: ${toEmail}
                    </div>
                    
                    <p style="text-align: center; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                        Please use these credentials to access your hospital portal
                    </p>
                </div>

                <p style="font-size: 16px; margin-bottom: 10px;">
                    <strong>🔐 Set Up Your Password</strong>
                </p>
                
                <p>For security reasons, please set your password using the link below:</p>

                <div style="text-align: center;">
                    <a href="${setupLink}" class="setup-button">
                        Set Your Password
                    </a>
                    
                    <p style="font-size: 14px; color: #666; margin-top: 5px;">
                        (This link will expire in 24 hours)
                    </p>
                </div>

                <div class="warning-box">
                    <strong>⚠️ Important Security Information:</strong>
                    <ul style="margin-top: 5px; margin-bottom: 0;">
                        <li>This password setup link will expire in 24 hours</li>
                        <li>Choose a strong password (minimum 8 characters with letters, numbers, and special characters)</li>
                        <li>Never share your credentials with anyone</li>
                        <li>HealthInsura360 will never ask for your password via email or phone</li>
                    </ul>
                </div>

                <h3 style="color: #0a2540;">Next Steps After Setting Password:</h3>
                <ol>
                    <li>Log in to the Hospital Portal using your email and new password</li>
                    <li>Complete your hospital profile information</li>
                    <li>Upload any additional required documents</li>
                    <li>Start accepting patients and managing insurance claims</li>
                    <li>Connect with insurance agents in your network</li>
                </ol>

                <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;">
                        <strong>📞 Need Assistance?</strong><br>
                        Contact our Hospital Support Team:<br>
                        Email: hospital.support@healthinsura360.com<br>
                        Phone: +92 300 123 4567<br>
                        Hours: Monday-Friday, 9:00 AM - 6:00 PM
                    </p>
                </div>

                <div class="footer">
                    <p>This email contains confidential information. If you did not request this registration, please contact us immediately.</p>
                    <p><strong>HealthInsura360</strong> - Your Trusted Healthcare Partner</p>
                    <p>© ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                    <p class="note">This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
YOUR HEALTHINSURA360 HOSPITAL REGISTRATION IS APPROVED

Dear ${hospitalName},

Your registration with HealthInsura360 has been approved.

YOUR OFFICIAL CREDENTIALS:
================================
Registration Number: ${registrationNumber}
Login ID: ${toEmail}
================================

Please use this Registration Number along with your registered email to log in to the Hospital Portal.

For security reasons, please set your password using the link below:
${setupLink}

This password setup link will expire in 24 hours.

After setting your password, you can access the hospital portal at:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/hospital/login

Important Security Tips:
- Choose a strong password (min. 8 characters with letters, numbers, and symbols)
- Never share your credentials
- HealthInsura360 will never ask for your password

Need Help?
Contact: hospital.support@healthinsura360.com
Phone: +92 300 123 4567

© ${new Date().getFullYear()} HealthInsura360. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Hospital approval email sent successfully:');
    console.log('📧 To:', toEmail);
    console.log('🔑 Registration Number:', registrationNumber);
    console.log('🔗 Password Setup Link:', setupLink);
    console.log('📨 Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId, setupToken };
  } catch (error) {
    console.error('❌ Failed to send hospital approval email:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to store password setup token
// Add this function to your emailService.js file
async function storePasswordSetupToken(email, token, expiry) {
  try {
    // If you have database access in this file
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        user_type VARCHAR(50) DEFAULT 'hospital',
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Delete any existing tokens for this email
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE email = $1 AND user_type = $2',
      [email, 'hospital']
    );

    // Insert new token
    await pool.query(
      `INSERT INTO password_reset_tokens (email, token, user_type, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [email, token, 'hospital', expiry]
    );

    console.log('✅ Password setup token stored for:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to store password setup token:', error);
    return false;
  }
}

// ============================================
// NEW: Hospital Rejection Email
// ============================================
exports.sendRejectionEmail = async (toEmail, hospitalName, reason = '') => {
  try {
    if (!transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const contactLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/contact`;

    const mailOptions = {
      from: {
        name: 'HealthInsura360',
        address: process.env.SMTP_EMAIL || 'quratulainazhar470@gmail.com'
      },
      to: toEmail,
      subject: '❌ Hospital Registration Update - HealthInsura360',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Registration Status Update</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    padding: 20px 0;
                    background-color: #dc3545;
                    border-radius: 8px 8px 0 0;
                }
                .header h1 {
                    color: white;
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                    background-color: #f8fafc;
                    border-radius: 0 0 8px 8px;
                }
                .rejection-box {
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    color: #721c24;
                    padding: 20px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .reason-box {
                    background-color: #fff3cd;
                    border: 1px solid #ffeeba;
                    color: #856404;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #0cc0df;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 12px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 HealthInsura360</h1>
            </div>
            
            <div class="content">
                <div class="rejection-box">
                    <h2 style="margin-top: 0;">Registration Status Update</h2>
                    <p>We regret to inform you that your hospital registration could not be approved at this time.</p>
                </div>

                <p>Dear <strong>${hospitalName}</strong>,</p>
                
                ${reason ? `
                    <div class="reason-box">
                        <strong>Reason for rejection:</strong>
                        <p style="margin-top: 5px;">${reason}</p>
                    </div>
                ` : ''}

                <h3 style="color: #0a2540;">Possible reasons for rejection:</h3>
                <ul>
                    <li>Incomplete or invalid documentation</li>
                    <li>Registration number could not be verified</li>
                    <li>Missing required information</li>
                    <li>Non-compliance with network requirements</li>
                </ul>

                <h3 style="color: #0a2540;">What you can do:</h3>
                <ol>
                    <li>Review your application and ensure all information is correct</li>
                    <li>Provide any missing documentation</li>
                    <li>Contact our support team for clarification</li>
                    <li>Submit a new application with corrected information</li>
                </ol>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${contactLink}" class="button">📧 Contact Support</a>
                </div>

                <p>If you believe this is an error or would like more information, please don't hesitate to reach out to our support team.</p>

                <div class="footer">
                    <p>This is an automated message from HealthInsura360.</p>
                    <p>&copy; ${new Date().getFullYear()} HealthInsura360. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `Hospital Registration Update - HealthInsura360\n\nDear ${hospitalName},\n\nWe regret to inform you that your hospital registration could not be approved at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Please contact our support team for more information: ${contactLink}`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Hospital rejection email sent:', info.messageId);
    console.log('📧 Email sent to:', toEmail);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send rejection email:', error);
    return false;
  }
};

// ============================================
// EXISTING: Test email function (for testing SMTP)
// ============================================
exports.testEmail = async () => {
  try {
    if (!transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const mailOptions = {
      from: {
        name: 'HealthInsura360 Test',
        address: process.env.SMTP_EMAIL || 'quratulainazhar470@gmail.com'
      },
      to: process.env.SMTP_EMAIL || 'quratulainazhar470@gmail.com',
      subject: 'Test Email from HealthInsura360',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<h1>Test Email</h1><p>This is a test email from HealthInsura360 to verify SMTP configuration.</p>'
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Test email failed:', error);
    return false;
  }
};

// ============================================
// EXISTING: Hospital registration notification to admin
// ============================================
exports.sendHospitalRegistrationNotification = async (hospitalData) => {
  try {
    if (!transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'kaynatmughal.cui@gmail.com';
    const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/hospitals/pending`;

    const mailOptions = {
      from: {
        name: 'HealthInsura360',
        address: process.env.SMTP_EMAIL || 'quratulainazhar470@gmail.com'
      },
      to: adminEmail,
      subject: `New Hospital Registration Request - ${hospitalData.name} | HealthInsura360`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Hospital Registration Request</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 700px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    padding: 20px 0;
                    background-color: #0cc0df;
                    border-radius: 8px 8px 0 0;
                }
                .header h1 {
                    color: white;
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                    background-color: #f8fafc;
                    border-radius: 0 0 8px 8px;
                    border: 1px solid #e2e8f0;
                }
                .alert {
                    background-color: #fef3c7;
                    border: 1px solid #f59e0b;
                    color: #92400e;
                    padding: 15px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
                .hospital-details {
                    background-color: white;
                    padding: 20px;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e2e8f0;
                }
                .detail-row:last-child {
                    border-bottom: none;
                }
                .detail-label {
                    font-weight: bold;
                    color: #0a2540;
                    min-width: 150px;
                }
                .detail-value {
                    color: #475569;
                    word-break: break-word;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #0cc0df;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .button:hover {
                    background-color: #0a9fb3;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 12px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 New Hospital Registration Request</h1>
            </div>
            
            <div class="content">
                <div class="alert">
                    <strong>⚠️ Action Required:</strong> A new hospital has submitted a registration request. Please review and verify the details below.
                </div>

                <h2 style="color: #0a2540; margin-top: 0;">Hospital Details</h2>
                <div class="hospital-details">
                    <div class="detail-row">
                        <span class="detail-label">Hospital Name:</span>
                        <span class="detail-value"><strong>${hospitalData.name}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${hospitalData.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${hospitalData.phone || 'Not provided'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Contact Person:</span>
                        <span class="detail-value">${hospitalData.contactPerson || 'Not provided'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Registration Number:</span>
                        <span class="detail-value">${hospitalData.registrationNumber || 'Not provided'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Address:</span>
                        <span class="detail-value">${[hospitalData.street, hospitalData.city, hospitalData.state, hospitalData.zipcode].filter(Boolean).join(', ') || 'Not provided'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Submitted At:</span>
                        <span class="detail-value">${new Date().toLocaleString()}</span>
                    </div>
                </div>

                <h3 style="color: #0a2540;">Documents Submitted:</h3>
                <p>${hospitalData.documents && hospitalData.documents.length > 0 
                  ? hospitalData.documents.map(doc => `<li>${doc}</li>`).join('') 
                  : '<em>No documents uploaded</em>'}</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardLink}" class="button">👉 Review Hospital Applications</a>
                </div>

                <p style="color: #475569; margin: 20px 0;">
                    <strong>Next Steps:</strong>
                </p>
                <ol>
                    <li>Review the hospital's information and documents</li>
                    <li>Verify registration number with government database</li>
                    <li>Check certifications and licenses</li>
                    <li>Approve or Reject the application in the admin dashboard</li>
                </ol>

                <div class="footer">
                    <p>This is an automated notification from HealthInsura360 Hospital Management System.</p>
                    <p>&copy; 2025 HealthInsura360. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `New Hospital Registration Request\n\nHospital Name: ${hospitalData.name}\nEmail: ${hospitalData.email}\nPhone: ${hospitalData.phone || 'Not provided'}\n\nPlease log in to your admin dashboard to review this application.\n\nDashboard Link: ${dashboardLink}`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Hospital registration notification sent to admin:', info.messageId);
    console.log('📧 Email sent to:', adminEmail);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send hospital registration notification:', error);
    return false;
  }
};