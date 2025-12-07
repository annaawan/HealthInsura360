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

// Test email function (for testing SMTP)
// In backend/utils/emailService.js, add:

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