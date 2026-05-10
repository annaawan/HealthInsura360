
// frontend/src/services/webhookService.js

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

class WebhookService {
    
    // Trigger webhook when policy is sold
    async triggerPolicySold(policyData) {
        const webhookPayload = {
            event_type: 'policy_sold',
            source: 'frontend',
            payload: {
                policy_id: policyData.policy_id,
                customer_id: policyData.customer_id,
                agent_id: policyData.agent_id,
                premium_amount: policyData.premium_amount,
                policy_type: policyData.policy_type,
                start_date: policyData.start_date,
                end_date: policyData.end_date,
                timestamp: new Date().toISOString()
            }
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/webhooks/policy-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookPayload)
            });
            
            if (!response.ok) {
                throw new Error('Failed to trigger webhook');
            }
            
            const result = await response.json();
            console.log('Webhook triggered successfully:', result);
            return result;
            
        } catch (error) {
            console.error('Error triggering webhook:', error);
            throw error;
        }
    }
    
    // Trigger webhook when policy is renewed
    async triggerPolicyRenewed(policyId, renewalYear, premiumAmount) {
        const webhookPayload = {
            event_type: 'policy_renewed',
            source: 'frontend',
            payload: {
                policy_id: policyId,
                renewal_year: renewalYear,
                premium_amount: premiumAmount,
                timestamp: new Date().toISOString()
            }
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/webhooks/policy-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookPayload)
            });
            
            return await response.json();
            
        } catch (error) {
            console.error('Error triggering renewal webhook:', error);
            throw error;
        }
    }
    
    // Trigger webhook when policy is cancelled
    async triggerPolicyCancelled(policyId, reason) {
        const webhookPayload = {
            event_type: 'policy_cancelled',
            source: 'frontend',
            payload: {
                policy_id: policyId,
                cancellation_reason: reason,
                timestamp: new Date().toISOString()
            }
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/webhooks/policy-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookPayload)
            });
            
            return await response.json();
            
        } catch (error) {
            console.error('Error triggering cancellation webhook:', error);
            throw error;
        }
    }
    
    // Get webhook logs (admin only)
    async getWebhookLogs(filters = {}) {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(filters).toString();
        const url = `${API_BASE_URL}/webhooks/logs${queryParams ? '?' + queryParams : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.json();
    }
    
    // Retry failed webhook (admin only)
    async retryFailedWebhook(webhookId) {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/webhooks/retry-failed`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ webhook_id: webhookId })
        });
        
        return response.json();
    }
}

export default new WebhookService();