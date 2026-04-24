// backend/src/services/reminderScheduler.js
const cron = require('node-cron');
const db = require('../config/database');
const reminderService = require('./reminderService');

class ReminderScheduler {
    constructor() {
        this.isRunning = false;
    }

    // Start the scheduler
    start() {
        if (this.isRunning) {
            console.log('⚠️ Reminder scheduler is already running');
            return;
        }

        console.log('🕐 Starting reminder scheduler...');

        // Run every minute to check for reminders
        cron.schedule('* * * * *', async () => {
            await this.checkAndSendReminders();
        });

        // Also run every hour to update recurring reminders
        cron.schedule('0 * * * *', async () => {
            await this.updateRecurringReminders();
        });

        this.isRunning = true;
        console.log('✅ Reminder scheduler started successfully');
    }

    // Check and send due reminders
    async checkAndSendReminders() {
        try {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
            const currentDate = now.toISOString().split('T')[0];
            
            console.log(`🔍 Checking for reminders at ${currentDate} ${currentTime}`);
            
            // Find active reminders that are due
            const query = `
                SELECT 
                    r.reminder_id,
                    r.customer_id,
                    r.policy_id,
                    r.reminder_date,
                    r.reminder_time,
                    r.frequency,
                    r.notification_methods,
                    r.message,
                    c.first_name,
                    c.last_name,
                    c.email,
                    c.phone,
                    p.policy_type,
                    p.premium_amount,
                    p.end_date as policy_end_date
                FROM payment_reminders r
                JOIN customer c ON r.customer_id = c.customer_id
                JOIN policy p ON r.policy_id = p.policy_id
                WHERE r.status = 'active'
                    AND r.reminder_date <= $1
                    AND (r.reminder_time <= $2 OR r.reminder_time IS NULL)
                    AND (r.last_sent_at IS NULL OR DATE(r.last_sent_at) < $1)
                    AND (r.recurring_end_date IS NULL OR r.recurring_end_date >= $1)
            `;
            
            const result = await db.query(query, [currentDate, currentTime]);
            
            if (!result.rows || result.rows.length === 0) {
                console.log('📭 No reminders due at this time');
                return;
            }
            
            console.log(`📨 Found ${result.rows.length} reminder(s) to send`);
            
            for (const reminder of result.rows) {
                await this.sendReminder(reminder);
            }
            
        } catch (error) {
            console.error('❌ Error checking reminders:', error.message);
        }
    }

    // Send individual reminder
    async sendReminder(reminder) {
        try {
            const dueDate = new Date(reminder.reminder_date);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            const emailData = {
                customer_name: `${reminder.first_name} ${reminder.last_name}`,
                customer_email: reminder.email,
                policy_id: reminder.policy_id,
                policy_type: reminder.policy_type,
                amount: parseFloat(reminder.premium_amount),
                due_date: reminder.reminder_date,
                days_until_due: daysUntilDue,
                subject: `Payment Reminder - Policy #${reminder.policy_id}`
            };
            
            // Send email if method includes email
            if (reminder.notification_methods && reminder.notification_methods.includes('email') && reminder.email) {
                const emailResult = await reminderService.sendEmailReminder(emailData);
                
                if (emailResult.success) {
                    // Log successful email
                    await db.query(`
                        INSERT INTO reminder_logs (
                            reminder_id, customer_id, customer_email, customer_phone,
                            notification_type, subject, message, status, sent_at
                        ) VALUES ($1, $2, $3, $4, 'email', $5, $6, 'sent', NOW())
                    `, [
                        reminder.reminder_id, reminder.customer_id, reminder.email, reminder.phone || null,
                        emailData.subject, reminder.message || emailData.subject
                    ]);
                    console.log(`✅ Reminder ${reminder.reminder_id} email sent to ${reminder.email}`);
                } else {
                    // Log failed email
                    await db.query(`
                        INSERT INTO reminder_logs (
                            reminder_id, customer_id, customer_email, customer_phone,
                            notification_type, subject, message, status, error_message, sent_at
                        ) VALUES ($1, $2, $3, $4, 'email', $5, $6, 'failed', $7, NOW())
                    `, [
                        reminder.reminder_id, reminder.customer_id, reminder.email, reminder.phone || null,
                        emailData.subject, reminder.message || emailData.subject, emailResult.error
                    ]);
                    console.error(`❌ Failed to send email for reminder ${reminder.reminder_id}: ${emailResult.error}`);
                }
            }
            
            // Update reminder last_sent_at
            await db.query(`
                UPDATE payment_reminders 
                SET last_sent_at = NOW(), 
                    status = CASE 
                        WHEN frequency = 'one-time' THEN 'sent'
                        ELSE 'active'
                    END
                WHERE reminder_id = $1
            `, [reminder.reminder_id]);
            
            console.log(`✅ Reminder ${reminder.reminder_id} processed successfully`);
            
        } catch (error) {
            console.error(`❌ Failed to send reminder ${reminder.reminder_id}:`, error.message);
            
            // Log error
            await db.query(`
                INSERT INTO reminder_logs (
                    reminder_id, customer_id, customer_email, notification_type,
                    status, error_message, sent_at
                ) VALUES ($1, $2, $3, 'email', 'failed', $4, NOW())
            `, [reminder.reminder_id, reminder.customer_id, reminder.email, error.message]);
        }
    }

    // Update recurring reminders (create new instances for next cycle)
    async updateRecurringReminders() {
        try {
            console.log('🔄 Checking for recurring reminders to update...');
            
            const query = `
                SELECT 
                    r.reminder_id,
                    r.customer_id,
                    r.policy_id,
                    r.agent_id,
                    r.reminder_date,
                    r.reminder_time,
                    r.frequency,
                    r.recurring_end_date,
                    r.notification_methods,
                    r.message
                FROM payment_reminders r
                WHERE r.status = 'active'
                    AND r.frequency IN ('weekly', 'monthly')
                    AND (r.recurring_end_date IS NULL OR r.recurring_end_date >= CURRENT_DATE)
                    AND (r.next_reminder_date IS NULL OR r.next_reminder_date <= CURRENT_DATE)
            `;
            
            const result = await db.query(query);
            
            if (!result.rows || result.rows.length === 0) {
                console.log('🔄 No recurring reminders to update');
                return;
            }
            
            console.log(`🔄 Found ${result.rows.length} recurring reminder(s) to update`);
            
            for (const reminder of result.rows) {
                let nextDate = new Date(reminder.reminder_date);
                
                if (reminder.frequency === 'weekly') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (reminder.frequency === 'monthly') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                
                const nextDateStr = nextDate.toISOString().split('T')[0];
                
                // Only update if not beyond end date
                if (!reminder.recurring_end_date || nextDate <= new Date(reminder.recurring_end_date)) {
                    await db.query(`
                        UPDATE payment_reminders 
                        SET reminder_date = $1,
                            next_reminder_date = $2,
                            updated_at = NOW()
                        WHERE reminder_id = $3
                    `, [nextDateStr, nextDateStr, reminder.reminder_id]);
                    
                    console.log(`🔄 Updated recurring reminder ${reminder.reminder_id} to ${nextDateStr}`);
                } else {
                    // Mark as completed if beyond end date
                    await db.query(`
                        UPDATE payment_reminders 
                        SET status = 'completed',
                            updated_at = NOW()
                        WHERE reminder_id = $1
                    `, [reminder.reminder_id]);
                    
                    console.log(`✅ Recurring reminder ${reminder.reminder_id} completed (end date reached)`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error updating recurring reminders:', error.message);
        }
    }

    // Manual trigger for testing
    async manualTrigger() {
        console.log('🔧 Manual trigger activated');
        await this.checkAndSendReminders();
        await this.updateRecurringReminders();
    }

    // Stop the scheduler
    stop() {
        this.isRunning = false;
        console.log('🛑 Reminder scheduler stopped');
    }
}

module.exports = new ReminderScheduler();