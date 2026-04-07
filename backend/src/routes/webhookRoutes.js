// backend/routes/webhookRoutes.js

const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');
const db = require('../config/database'); // Add this line

// Public webhook endpoint (no authentication required)
router.post('/policy-event', async (req, res) => {
    try {
        const { event_type, payload, source } = req.body;
        
        // Validate required fields
        if (!event_type || !payload) {
            return res.status(400).json({ 
                error: 'Missing required fields: event_type and payload' 
            });
        }
        
        // Process webhook asynchronously
        webhookService.handleWebhook(event_type, payload, source || 'api')
            .then(result => {
                console.log(`✅ Webhook processed successfully: ${event_type}`, result);
            })
            .catch(error => {
                console.error(`❌ Webhook processing failed: ${event_type}`, error);
            });
        
        // Return immediate acknowledgment
        res.json({
            received: true,
            event_type,
            message: 'Webhook received and queued for processing'
        });
        
    } catch (error) {
        console.error('Webhook endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to retry failed webhooks (admin only)
router.post('/retry-failed', async (req, res) => {
    try {
        const { webhook_id } = req.body;
        
        // Get failed webhook
        const [webhooks] = await db.query(
            'SELECT * FROM webhook_logs WHERE webhook_id = ? AND processed = FALSE AND error_message IS NOT NULL',
            [webhook_id]
        );
        
        if (!webhooks.length) {
            return res.status(404).json({ error: 'Failed webhook not found' });
        }
        
        const webhook = webhooks[0];
        
        // Reprocess
        const result = await webhookService.handleWebhook(
            webhook.event_type,
            JSON.parse(webhook.payload),
            webhook.source
        );
        
        res.json({ success: true, result });
        
    } catch (error) {
        console.error('Error retrying webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get webhook logs (admin only)
router.get('/logs', async (req, res) => {
    try {
        const { limit = 100, offset = 0, event_type, processed } = req.query;
        
        let query = 'SELECT * FROM webhook_logs WHERE 1=1';
        const params = [];
        
        if (event_type) {
            query += ' AND event_type = ?';
            params.push(event_type);
        }
        
        if (processed !== undefined) {
            query += ' AND processed = ?';
            params.push(processed === 'true');
        }
        
        query += ' ORDER BY received_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [logs] = await db.query(query, params);
        
        res.json(logs);
        
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;