// src/hooks/useCommissionTracking.js

// import { useEffect } from 'react';
import { useCommissions } from '../context/CommissionContext';
import commissionService from '../services/commissionService';

export const useCommissionTracking = () => {
  const { addCommission, updateCommission } = useCommissions();
  
  const trackPolicySale = (policy, agent) => {
    const commissionAmount = commissionService.calculatePolicyCommission(policy);
    const tieredCommission = commissionService.calculateTieredCommission(agent.yearlySales + policy.premium);
    
    const commissionData = {
      agent: agent.name,
      agentId: agent.id,
      totalSales: agent.yearlySales + policy.premium,
      commissionRate: `${(tieredCommission / (agent.yearlySales + policy.premium) * 100).toFixed(1)}%`,
      commissionAmount: tieredCommission,
      pending: tieredCommission - agent.totalPaid,
      paid: agent.totalPaid,
      lastPayment: agent.lastPaymentDate || '-',
      policyId: policy.id,
      saleDate: new Date().toISOString()
    };
    
    addCommission(commissionData);
    
    // Update agent's total sales in your database
    updateAgentSales(agent.id, policy.premium);
  };
  
  const updateAgentSales = async (agentId, saleAmount) => {
    // API call to update agent's sales total
    try {
      const response = await fetch(`/api/agents/${agentId}/sales`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleAmount })
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating agent sales:', error);
    }
  };
  
  return { trackPolicySale };
};