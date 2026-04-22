const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ============ GET CUSTOMER NOTIFICATIONS ============
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        
        // Only return notifications for this specific user
        const result = await db.query(
            `SELECT notification_id, type, title, message, related_id, is_read, created_at
             FROM notifications 
             WHERE user_id = $1 AND user_type = $2 
             ORDER BY created_at DESC 
             LIMIT 100`,
            [userId, userType]
        );
        
        // Get unread count
        const unreadResult = await db.query(
            `SELECT COUNT(*) FROM notifications 
             WHERE user_id = $1 AND user_type = $2 AND is_read = FALSE`,
            [userId, userType]
        );
        
        res.json({
            success: true,
            notifications: result.rows,
            unreadCount: parseInt(unreadResult.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

// ============ MARK SINGLE NOTIFICATION AS READ ============
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        await db.query(
            `UPDATE notifications 
             SET is_read = TRUE, updated_at = NOW() 
             WHERE notification_id = $1 AND user_id = $2`,
            [id, userId]
        );
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification'
        });
    }
});

// ============ MARK ALL NOTIFICATIONS AS READ ============
router.put('/read-all', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        
        await db.query(
            `UPDATE notifications 
             SET is_read = TRUE, updated_at = NOW() 
             WHERE user_id = $1 AND user_type = $2 AND is_read = FALSE`,
            [userId, userType]
        );
        
        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notifications'
        });
    }
});

// ============ DELETE NOTIFICATION ============
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        await db.query(
            'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2',
            [id, userId]
        );
        
        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

// ============ HELPER FUNCTION TO CREATE NOTIFICATIONS ============
const createNotification = async (userId, userType, type, title, message, relatedId = null) => {
    try {
        const result = await db.query(
            `INSERT INTO notifications (user_id, user_type, type, title, message, related_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING notification_id`,
            [userId, userType, type, title, message, relatedId]
        );
        console.log(`✅ Notification created for ${userType} ${userId}: ${title}`);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

module.exports = router;
module.exports.createNotification = createNotification;