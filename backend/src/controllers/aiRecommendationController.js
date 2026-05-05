// backend/src/controllers/aiRecommendationController.js
const db = require('../config/database');
const groqRecommender = require('../services/groqRecommender');  // ✅ Changed to Groq

// Initialize on server start
groqRecommender.init();

exports.getAIRecommendations = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        // Get customer profile
        const customerResult = await db.query(
            `SELECT 
                c.customer_id,
                c.first_name,
                c.last_name,
                c.dob,
                c.family_size,
                c.monthly_budget,
                c.health_score,
                c.annual_income,
                COUNT(cl.claim_id) as previous_claims
             FROM customer c
             LEFT JOIN claim cl ON c.customer_id = cl.customer_id
             WHERE c.customer_id = $1
             GROUP BY c.customer_id`,
            [userId]
        );
        
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        const customer = customerResult.rows[0];
        
        // Calculate age
        let age = 30;
        if (customer.dob) {
            const birthDate = new Date(customer.dob);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
        }
        
        // Get purchased policies
        const policiesResult = await db.query(
            `SELECT plan_id FROM policy WHERE customer_id = $1 AND status = 'active'`,
            [userId]
        );
        
        const purchasedPlanIds = new Set(policiesResult.rows.map(p => p.plan_id));
        
        // Get all active plans
        const plansResult = await db.query(
            `SELECT 
                plan_id, plan_name, description, policy_type, category,
                premium_amount, coverage_amount, deductible, status
             FROM policy_plans
             WHERE status = 'active'`
        );
        
        const allPlans = plansResult.rows;
        
        const customerData = {
            age: age,
            family_size: customer.family_size || 1,
            budget: customer.monthly_budget || 10000,
            health_score: customer.health_score || 0.7,
            income: customer.annual_income || 50000,
            previous_claims: parseInt(customer.previous_claims) || 0,
            purchased_plan_ids: purchasedPlanIds
        };
        
        // Try Groq first
        let aiRecommendations = await groqRecommender.getRecommendations(customerData, allPlans);
        
        if (aiRecommendations && aiRecommendations.success && aiRecommendations.recommendations.length > 0) {
            // Groq succeeded
            const firstName = customer.first_name || 'Valued Customer';
            let greeting;
            if (age >= 60) {
                greeting = `Dear ${firstName}, our AI recommends these senior-friendly plans for your health needs.`;
            } else if (age < 35) {
                greeting = `Dear ${firstName}, start your health journey with these AI-curated affordable plans.`;
            } else {
                greeting = `Dear ${firstName}, here are personalized AI recommendations based on your profile.`;
            }
            
            return res.json({
                success: true,
                recommendations: aiRecommendations.recommendations,
                greeting: greeting,
                ai_metadata: {
                    source: 'groq',
                    model: aiRecommendations.model_used,
                    provider: aiRecommendations.provider,
                    insights: aiRecommendations.ai_insights,
                    timestamp: aiRecommendations.timestamp
                },
                customer_profile: {
                    age: age,
                    family_size: customerData.family_size,
                    health_score: customerData.health_score,
                    previous_claims: customerData.previous_claims
                }
            });
        }
        
        // If Groq fails, return empty for frontend fallback
        console.log('⚠️ Groq failed, frontend will use fallback');
        
        const firstName = customer.first_name || 'Valued Customer';
        let greeting;
        if (age >= 60) {
            greeting = `Dear ${firstName}, recommendations are being prepared. Please refresh.`;
        } else {
            greeting = `Dear ${firstName}, personalized recommendations are loading.`;
        }
        
        res.json({
            success: false,
            recommendations: [],
            greeting: greeting,
            ai_metadata: {
                source: 'groq_failed',
                timestamp: new Date().toISOString()
            },
            customer_profile: {
                age: age,
                family_size: customerData.family_size,
                health_score: customerData.health_score,
                previous_claims: customerData.previous_claims
            },
            fallback_required: true
        });
        
    } catch (error) {
        console.error('❌ AI Recommendation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            fallback_required: true
        });
    }
};