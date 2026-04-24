// frontend/src/services/mlRecommender.js

class MLRecommender {
    constructor() {
        this.initialized = false;
    }

    async init() {
        console.log('🤖 Initializing ML Recommender...');
        this.initialized = true;
        return true;
    }

    async getRecommendations(customerData, allPlans) {
    console.log('📊 Generating recommendations for customer:', customerData);
    console.log('📊 Purchased plan IDs:', [...(customerData.purchased_plan_ids || new Set())]);
    
    const recommendations = allPlans.map(plan => {
        let matchScore = 0;
        let matchReasons = [];
        
        // Age-based scoring
        if (customerData.age >= 60 && plan.plan_name && plan.plan_name.toLowerCase().includes('senior')) {
            matchScore += 30;
            matchReasons.push('👴 Perfect for seniors');
        } else if (customerData.age >= 50 && plan.coverage_amount > 500000) {
            matchScore += 20;
            matchReasons.push('🛡️ High coverage for comprehensive protection');
        } else if (customerData.age < 35 && plan.premium_amount < 5000) {
            matchScore += 25;
            matchReasons.push('💰 Budget-friendly for young adults');
        }
        
        // Budget-based scoring
        if (plan.premium_amount <= customerData.budget) {
            matchScore += 25;
            matchReasons.push('💵 Within your monthly budget');
        } else if (plan.premium_amount <= customerData.budget * 1.2) {
            matchScore += 10;
            matchReasons.push('📈 Slightly above budget but valuable');
        }
        
        // Family size scoring
        if (customerData.family_size > 3 && plan.plan_name && plan.plan_name.toLowerCase().includes('family')) {
            matchScore += 15;
            matchReasons.push('👨‍👩‍👧‍👦 Great for families');
        }
        
        // Income-based scoring
        if (customerData.income >= 100000 && plan.coverage_amount > 1000000) {
            matchScore += 15;
            matchReasons.push('💎 Premium coverage option');
        }
        
        // Health score based
        if (customerData.health_score < 0.5 && plan.coverage_amount > 500000) {
            matchScore += 10;
            matchReasons.push('🏥 Comprehensive coverage recommended');
        }
        
        // Previous claims
        if (customerData.previous_claims > 0 && plan.coverage_amount > 300000) {
            matchScore += 10;
            matchReasons.push('🔄 Higher coverage based on your claim history');
        }
        
        // Coverage scoring
        if (plan.coverage_amount >= 500000) {
            matchScore += 20;
            matchReasons.push('🏥 Extensive coverage benefits');
        }
        
        // Deductible scoring
        if (plan.deductible === 0) {
            matchScore += 10;
            matchReasons.push('✨ Zero deductible benefit');
        }
        
        // Premium amount scoring
        if (plan.premium_amount === 0) {
            matchScore = 95;
            matchReasons = ['🎖️ Government-subsidized • Zero cost • Excellent coverage'];
        }
        
        matchScore = Math.min(matchScore, 95);
        
        return {
            ...plan,
            match_percentage: matchScore,
            match_reasons: matchReasons.join(' • ') || '👍 Good match for your profile'
        };
    });
    
    // Sort by match percentage
    recommendations.sort((a, b) => b.match_percentage - a.match_percentage);
    
    // ✅ FIX: Filter by plan_id instead of policy_type
    const purchasedPlanIds = customerData.purchased_plan_ids || new Set();
    const availableRecommendations = recommendations.filter(rec => !purchasedPlanIds.has(rec.plan_id));
    
    console.log('📊 Total recommendations before filtering:', recommendations.length);
    console.log('📊 Purchased plan IDs:', [...purchasedPlanIds]);
    console.log('📊 Available recommendations after filtering:', availableRecommendations.length);
    console.log('📊 Available plan IDs:', availableRecommendations.map(r => ({ id: r.plan_id, name: r.plan_name })));
    
    // Return only non-purchased plans
    return availableRecommendations;
}
}

// ✅ Fixed: Create instance and export as default (not anonymous)
const mlRecommender = new MLRecommender();
export default mlRecommender;