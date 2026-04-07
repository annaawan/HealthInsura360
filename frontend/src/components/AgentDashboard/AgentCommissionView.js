// src/components/AgentDashboard/AgentCommissionView.js

import React from 'react';
import { useCommissions } from '../../context/CommissionContext';

function AgentCommissionView({ agentId, agentName }) {
  const { getAgentCommissions, getAgentCommissionSummary } = useCommissions();
  
  const commissions = getAgentCommissions(agentId);
  const summary = getAgentCommissionSummary(agentId);
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">My Commissions</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm">Total Commission Earned</div>
          <div className="text-3xl font-bold text-blue-600">
            ${summary.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm">Pending Payment</div>
          <div className="text-3xl font-bold text-yellow-600">
            ${summary.pending.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">{summary.pendingCount} transactions pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm">Already Paid</div>
          <div className="text-3xl font-bold text-green-600">
            ${summary.paid.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">{summary.paidCount} transactions paid</div>
        </div>
      </div>
      
      {/* Commissions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Policy ID</th>
              <th className="px-6 py-3 text-left">Premium Amount</th>
              <th className="px-6 py-3 text-left">Commission Rate</th>
              <th className="px-6 py-3 text-left">Commission Amount</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map(comm => (
              <tr key={comm.commission_id} className="border-t">
                <td className="px-6 py-4">#{comm.policy_id}</td>
                <td className="px-6 py-4">${comm.premium_amount.toLocaleString()}</td>
                <td className="px-6 py-4">{comm.rate}%</td>
                <td className="px-6 py-4 font-bold text-blue-600">${comm.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    comm.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {comm.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{comm.created_at}</td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No commissions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AgentCommissionView;