// backend/src/services/groqRecommender.js
const Groq = require('groq-sdk');

class GroqRecommender {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async init() {
        if (!process.env.GROQ_API_KEY) {
            console.log('⚠️ GROQ_API_KEY not found, Groq recommendations disabled');
            return false;
        }
        
        this.client = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
        this.initialized = true;
        console.log('✅ Groq Recommender initialized (free tier - 14,400 requests/day)');
        return true;
    }

    async getRecommendations(customerData, allPlans) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.initialized || !this.client) {
            return null;
        }

        try {
            console.log('🤖 Calling Groq API for recommendations...');
            
            // Prepare customer profile
            const customerProfile = `
- Age: ${customerData.age}
- Family Size: ${customerData.family_size}
- Monthly Budget: Rs. ${customerData.budget}
- Health Score: ${customerData.health_score}/1.0
- Annual Income: Rs. ${customerData.income}
- Previous Claims: ${customerData.previous_claims}
- Already Owned Plan IDs: ${[...(customerData.purchased_plan_ids || [])].join(', ')}
            `;
            
            // Prepare available plans (only those not purchased)
            const availablePlans = allPlans.filter(plan => 
                !customerData.purchased_plan_ids?.has(plan.plan_id)
            );
            
            const plansData = availablePlans.map((plan) => ({
                id: plan.plan_id,
                name: plan.plan_name,
                premium: plan.premium_amount,
                coverage: plan.coverage_amount,
                deductible: plan.deductible || 0,
                type: plan.policy_type,
                description: plan.description
            }));
            
            const prompt = `You are an AI Insurance Advisor for HealthInsura360. Recommend health insurance plans to customers.

## Customer Profile:
${customerProfile}

## Available Insurance Plans:
${JSON.stringify(plansData, null, 2)}

## Instructions:
1. Recommend TOP 3 plans from available list
2. For each recommendation provide:
   - plan_id (match the exact ID from above)
   - plan_name (use the exact name)
   - match_percentage (0-100)
   - match_reasons (short, customer-friendly, 10-15 words)
3. Consider: age, budget, family size, health score, income, claim history
4. Return ONLY valid JSON in this exact format:

{
    "recommendations": [
        {
            "plan_id": 1,
            "plan_name": "Plan Name Here",
            "match_percentage": 85,
            "match_reasons": "Perfect for your age group and budget"
        }
    ],
    "ai_insights": {
        "confidence_score": 92,
        "analysis_summary": "Brief summary of why these plans were chosen"
    }
}`;

            const response = await this.client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { 
                        role: "system", 
                        content: "You are an expert insurance advisor AI. Provide accurate, helpful recommendations. Always return valid JSON." 
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            let content = response.choices[0].message.content;
            console.log('📝 Groq response received, parsing...');
            
            // Clean response (remove markdown code blocks if present)
            if (content.includes('```json')) {
                content = content.split('```json')[1].split('```')[0];
            } else if (content.includes('```')) {
                content = content.split('```')[1].split('```')[0];
            }
            
            const aiResponse = JSON.parse(content);
            
            // Match recommendations with actual plan data
            const recommendations = aiResponse.recommendations.map(aiRec => {
                const plan = allPlans.find(p => p.plan_id === aiRec.plan_id);
                if (!plan) return null;
                return {
                    ...plan,
                    match_percentage: aiRec.match_percentage,
                    match_reasons: aiRec.match_reasons,
                    ai_generated: true
                };
            }).filter(r => r !== null);
            
            console.log(`✅ Groq generated ${recommendations.length} recommendations`);
            
            return {
                success: true,
                recommendations: recommendations,
                ai_insights: aiResponse.ai_insights,
                model_used: "llama-3.3-70b-versatile (Groq)",
                provider: "groq",
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Groq API error:', error.message);
            return null;
        }
    }
}

module.exports = new GroqRecommender();