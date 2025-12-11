// // routes/adminRoutes.js
// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const { authenticateAdmin } = require('../middleware/authMiddleware');
// const db = require('../config/database');

// // ---------------------------
// // 1. GET ADMIN PROFILE
// // ---------------------------
// router.get('/profile', authenticateAdmin, async (req, res) => {
//   try {
//     const adminId = req.user.admin_id;
    
//     const result = await db.query(
//       `SELECT 
//         admin_id,
//         full_name,
//         email,
//         TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
//         TO_CHAR(created_at, 'Month DD, YYYY') as formatted_created_at
//       FROM admin 
//       WHERE admin_id = $1`,
//       [adminId]
//     );
    
//     if (result.rows.length === 0) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Admin profile not found' 
//       });
//     }
    
//     // Get last login from audit_log
//     const lastLogin = await db.query(
//       `SELECT TO_CHAR(MAX(timestamp), 'Month DD, YYYY HH12:MI AM') as last_login
//        FROM audit_log 
//        WHERE user_type = 'admin' 
//        AND user_id = $1 
//        AND action = 'LOGIN'`,
//       [adminId]
//     );
    
//     const adminData = {
//       ...result.rows[0],
//       last_login: lastLogin.rows[0]?.last_login || 'Never'
//     };
    
//     res.json({ 
//       success: true, 
//       message: 'Profile fetched successfully',
//       data: adminData
//     });
    
//   } catch (error) {
//     console.error('Error fetching admin profile:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error while fetching profile' 
//     });
//   }
// });

// // ---------------------------
// // 2. UPDATE ADMIN PROFILE
// // ---------------------------
// router.put('/profile', authenticateAdmin, async (req, res) => {
//   try {
//     const adminId = req.user.admin_id;
//     const { full_name, email } = req.body;
    
//     // Validate input
//     if (!full_name || full_name.trim().length < 2) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Full name must be at least 2 characters long' 
//       });
//     }
    
//     if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Please provide a valid email address' 
//       });
//     }
    
//     // Check if email already exists (excluding current admin)
//     const emailCheck = await db.query(
//       'SELECT admin_id FROM admin WHERE email = $1 AND admin_id != $2',
//       [email.trim(), adminId]
//     );
    
//     if (emailCheck.rows.length > 0) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Email address is already in use by another admin' 
//       });
//     }
    
//     // Update admin profile
//     const result = await db.query(
//       `UPDATE admin 
//        SET full_name = $1, 
//            email = $2, 
//            updated_at = CURRENT_TIMESTAMP
//        WHERE admin_id = $3 
//        RETURNING admin_id, full_name, email`,
//       [full_name.trim(), email.trim(), adminId]
//     );
    
//     if (result.rows.length === 0) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Admin not found' 
//       });
//     }
    
//     // Log the action in audit_log
//     await db.query(
//       `INSERT INTO audit_log 
//        (user_type, user_id, action, entity, entity_id, timestamp) 
//        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
//       ['admin', adminId, 'UPDATE', 'admin', adminId]
//     );
    
//     res.json({ 
//       success: true, 
//       message: 'Profile updated successfully',
//       data: result.rows[0]
//     });
    
//   } catch (error) {
//     console.error('Error updating admin profile:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error while updating profile' 
//     });
//   }
// });

// // ---------------------------
// // 3. CHANGE PASSWORD
// // ---------------------------
// router.put('/change-password', authenticateAdmin, async (req, res) => {
//   try {
//     const adminId = req.user.admin_id;
//     const { current_password, new_password } = req.body;
    
//     // Validate input
//     if (!current_password) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Current password is required' 
//       });
//     }
    
//     if (!new_password || new_password.length < 8) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'New password must be at least 8 characters long' 
//       });
//     }
    
//     // Validate password complexity
//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
//     if (!passwordRegex.test(new_password)) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
//       });
//     }
    
//     // Get current password hash from database
//     const adminResult = await db.query(
//       'SELECT password_hash FROM admin WHERE admin_id = $1',
//       [adminId]
//     );
    
//     if (adminResult.rows.length === 0) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Admin not found' 
//       });
//     }
    
//     // Verify current password
//     const isValidPassword = await bcrypt.compare(
//       current_password, 
//       adminResult.rows[0].password_hash
//     );
    
//     if (!isValidPassword) {
//       return res.status(401).json({ 
//         success: false, 
//         message: 'Current password is incorrect' 
//       });
//     }
    
//     // Hash new password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(new_password, salt);
    
//     // Update password in database
//     await db.query(
//       `UPDATE admin 
//        SET password_hash = $1, 
//            updated_at = CURRENT_TIMESTAMP 
//        WHERE admin_id = $2`,
//       [hashedPassword, adminId]
//     );
    
//     // Log password change in audit_log
//     await db.query(
//       `INSERT INTO audit_log 
//        (user_type, user_id, action, entity, entity_id, timestamp) 
//        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
//       ['admin', adminId, 'UPDATE_PASSWORD', 'admin', adminId]
//     );
    
//     res.json({ 
//       success: true, 
//       message: 'Password changed successfully' 
//     });
    
//   } catch (error) {
//     console.error('Error changing password:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error while changing password' 
//     });
//   }
// });

// // ---------------------------
// // 4. GET SYSTEM STATISTICS (For General Info Tab)
// // ---------------------------
// router.get('/system-stats', authenticateAdmin, async (req, res) => {
//   try {
//     const stats = {};
    
//     // Get total counts from different tables
//     const [
//       totalCustomers,
//       totalAgents,
//       totalPolicies,
//       totalClaims,
//       totalHospitals,
//       recentPayments,
//       pendingClaims
//     ] = await Promise.all([
//       // Total customers
//       db.query('SELECT COUNT(*) as count FROM customer WHERE status = $1', ['active']),
      
//       // Total agents
//       db.query('SELECT COUNT(*) as count FROM agent WHERE status = $1', ['active']),
      
//       // Total policies
//       db.query('SELECT COUNT(*) as count FROM policy WHERE status = $1', ['active']),
      
//       // Total claims
//       db.query('SELECT COUNT(*) as count FROM claim'),
      
//       // Total hospitals
//       db.query('SELECT COUNT(*) as count FROM hospital WHERE status = $1', ['active']),
      
//       // Recent payments (last 7 days)
//       db.query(
//         `SELECT COUNT(*) as count FROM payment 
//          WHERE status = 'completed' 
//          AND paid_at >= CURRENT_DATE - INTERVAL '7 days'`
//       ),
      
//       // Pending claims
//       db.query(`SELECT COUNT(*) as count FROM claim WHERE status = $1`, ['pending'])
//     ]);
    
//     stats.total_customers = parseInt(totalCustomers.rows[0].count);
//     stats.total_agents = parseInt(totalAgents.rows[0].count);
//     stats.total_policies = parseInt(totalPolicies.rows[0].count);
//     stats.total_claims = parseInt(totalClaims.rows[0].count);
//     stats.total_hospitals = parseInt(totalHospitals.rows[0].count);
//     stats.recent_payments = parseInt(recentPayments.rows[0].count);
//     stats.pending_claims = parseInt(pendingClaims.rows[0].count);
    
//     // Get database version/size
//     const dbInfo = await db.query(
//       `SELECT 
//         version() as db_version,
//         pg_size_pretty(pg_database_size(current_database())) as db_size,
//         CURRENT_DATE as system_date`
//     );
    
//     stats.db_version = dbInfo.rows[0].db_version.split(' ')[1];
//     stats.db_size = dbInfo.rows[0].db_size;
//     stats.system_date = dbInfo.rows[0].system_date;
    
//     res.json({ 
//       success: true, 
//       message: 'System stats fetched successfully',
//       data: stats
//     });
    
//   } catch (error) {
//     console.error('Error fetching system stats:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error while fetching system statistics' 
//     });
//   }
// });

// // ---------------------------
// // 5. GET ADMIN ACTIVITY LOG
// // ---------------------------
// router.get('/activity-log', authenticateAdmin, async (req, res) => {
//   try {
//     const adminId = req.user.admin_id;
//     const { limit = 20 } = req.query;
    
//     const activities = await db.query(
//       `SELECT 
//         action,
//         entity,
//         TO_CHAR(timestamp, 'Mon DD, YYYY HH12:MI AM') as formatted_time,
//         timestamp
//        FROM audit_log 
//        WHERE user_type = 'admin' 
//        AND user_id = $1
//        ORDER BY timestamp DESC
//        LIMIT $2`,
//       [adminId, parseInt(limit)]
//     );
    
//     res.json({ 
//       success: true, 
//       message: 'Activity log fetched successfully',
//       data: activities.rows
//     });
    
//   } catch (error) {
//     console.error('Error fetching activity log:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error while fetching activity log' 
//     });
//   }
// });

// // ---------------------------
// // 6. VALIDATE PASSWORD STRENGTH
// // ---------------------------
// router.post('/validate-password', (req, res) => {
//   try {
//     const { password } = req.body;
    
//     if (!password) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Password is required' 
//       });
//     }
    
//     let strength = 0;
//     let feedback = [];
    
//     // Check length
//     if (password.length >= 8) {
//       strength += 1;
//     } else {
//       feedback.push('At least 8 characters');
//     }
    
//     // Check for lowercase
//     if (/[a-z]/.test(password)) {
//       strength += 1;
//     } else {
//       feedback.push('One lowercase letter');
//     }
    
//     // Check for uppercase
//     if (/[A-Z]/.test(password)) {
//       strength += 1;
//     } else {
//       feedback.push('One uppercase letter');
//     }
    
//     // Check for numbers
//     if (/\d/.test(password)) {
//       strength += 1;
//     } else {
//       feedback.push('One number');
//     }
    
//     // Check for special characters
//     if (/[^A-Za-z0-9]/.test(password)) {
//       strength += 1;
//     } else {
//       feedback.push('One special character');
//     }
    
//     const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
//     const strengthColors = ['#ff4444', '#ff8800', '#ffbb33', '#00C851', '#007E33', '#006400'];
    
//     res.json({ 
//       success: true,
//       data: {
//         strength: strength,
//         label: strengthLabels[strength - 1] || 'Very Weak',
//         color: strengthColors[strength - 1] || '#ff4444',
//         percentage: (strength / 6) * 100,
//         suggestions: feedback,
//         is_valid: strength >= 4
//       }
//     });
    
//   } catch (error) {
//     console.error('Error validating password:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error while validating password' 
//     });
//   }
// });

// module.exports = router;