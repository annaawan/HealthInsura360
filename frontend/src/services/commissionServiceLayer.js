// src/services/commissionServiceLayer.js

class CommissionService {
  // Calculate commission for a policy sale
  calculateCommission(policyAmount, agentTier = 'standard') {
    // Commission rates based on agent tier
    const rates = {
      standard: 0.10,  // 10%
      bronze: 0.08,    // 8%
      silver: 0.12,    // 12%
      gold: 0.15,      // 15%
      platinum: 0.18   // 18%
    };
    
    const rate = rates[agentTier] || rates.standard;
    const amount = policyAmount * rate;
    
    return {
      amount: Math.round(amount * 100) / 100,
      rate: rate * 100
    };
  }
  
  // Calculate tiered commission based on agent's yearly sales
  calculateTieredCommission(policyAmount, yearlySales) {
    let rate = 0.10; // default 10%
    
    if (yearlySales + policyAmount > 100000) {
      rate = 0.18;
    } else if (yearlySales + policyAmount > 50000) {
      rate = 0.15;
    } else if (yearlySales + policyAmount > 25000) {
      rate = 0.12;
    } else if (yearlySales + policyAmount > 10000) {
      rate = 0.08;
    }
    
    return {
      amount: Math.round((policyAmount * rate) * 100) / 100,
      rate: rate * 100
    };
  }
  
  // Calculate renewal commission (for policy renewals)
  calculateRenewalCommission(policyAmount, renewalYear) {
    // Lower commission for renewals
    const rate = renewalYear === 1 ? 0.05 : 0.03;
    return {
      amount: Math.round((policyAmount * rate) * 100) / 100,
      rate: rate * 100
    };
  }
  
  // Calculate commission for multiple policies
  calculateBulkCommission(policies, agentId, agentName, agentTier = 'standard') {
    const commissions = [];
    let totalAmount = 0;
    
    for (const policy of policies) {
      const { amount, rate } = this.calculateCommission(policy.premium_amount, agentTier);
      commissions.push({
        agent_id: agentId,
        agent_name: agentName,
        policy_id: policy.policy_id,
        premium_amount: policy.premium_amount,
        amount: amount,
        rate: rate,
        status: 'pending',
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0]
      });
      totalAmount += amount;
    }
    
    return { commissions, totalAmount };
  }
}

// Create an instance first, then export it
const commissionService = new CommissionService();

// Export the instance as default (not anonymous)
export default commissionService;