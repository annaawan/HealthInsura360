const db = require('../config/database');

// Get user notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userType = req.user?.userType || 'customer';
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        const result = await db.query(
            `SELECT 
                notification_id,
                type,
                title,
                message,
                related_id,
                is_read,
                created_at
             FROM notifications
             WHERE user_id = $1 AND user_type = $2
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId, userType]
        );
        
        const unreadResult = await db.query(
            `SELECT COUNT(*) as unread_count
             FROM notifications
             WHERE user_id = $1 AND user_type = $2 AND is_read = false`,
            [userId, userType]
        );
        
        res.json({
            success: true,
            notifications: result.rows,
            unreadCount: parseInt(unreadResult.rows[0].unread_count) || 0,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.json({ success: true, notifications: [], unreadCount: 0 });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        
        await db.query(
            `UPDATE notifications 
             SET is_read = true, updated_at = NOW()
             WHERE notification_id = $1 AND user_id = $2`,
            [id, userId]
        );
        
        res.json({ success: true, message: 'Notification marked as read' });
        
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userType = req.user?.userType || 'customer';
        
        await db.query(
            `UPDATE notifications 
             SET is_read = true, updated_at = NOW()
             WHERE user_id = $1 AND user_type = $2 AND is_read = false`,
            [userId, userType]
        );
        
        res.json({ success: true, message: 'All notifications marked as read' });
        
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        
        await db.query(
            `DELETE FROM notifications
             WHERE notification_id = $1 AND user_id = $2`,
            [id, userId]
        );
        
        res.json({ success: true, message: 'Notification deleted' });
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};