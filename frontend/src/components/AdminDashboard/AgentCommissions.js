// src/components/AdminDashboard/AgentCommissions.js
import React, { useState, useEffect } from 'react';
import { useCommissions } from '../../context/CommissionContext';
import { Check, Edit, Eye, RefreshCw, X, CreditCard } from 'lucide-react';
import StripePaymentModal from './StripePaymentModel.jsx';

function AgentCommissions() {
  const { 
    commissions, 
    summary, 
    loading, 
    totalPending,
    totalPaid,
    updateCommissionRate, 
    payCommission,
    cancelCommission,
    refreshData,
    approveCommission,
    disapproveCommission 
  } = useCommissions();
  
  const [editingCommission, setEditingCommission] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  
  // State for Stripe payment modal
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  
  const handleUpdateRate = async (commissionId) => {
    if (newRate && !isNaN(parseFloat(newRate))) {
      try {
        await updateCommissionRate(commissionId, parseFloat(newRate));
        setEditingCommission(null);
        setNewRate('');
      } catch (error) {
        alert('Failed to update commission rate: ' + error.message);
      }
    }
  };
  
  // Legacy payment method (manual reference entry)
  const handleManualPayCommission = async (commission, paymentDetails) => {
    if (paymentDetails.transaction_reference) {
        try {
            await payCommission(
                commission.commission_id, 
                paymentDetails.transaction_reference,
                paymentDetails.payment_method,
                paymentDetails.payment_date,
                paymentDetails.notes
            );
            setShowPaymentModal(null);
            setPaymentReference('');
            alert('Commission paid successfully!');
            refreshData();
        } catch (error) {
            alert('Failed to process payment: ' + error.message);
        }
    }
  };
  
  // Stripe payment method
  const handlePayWithStripe = (commission) => {
    setSelectedCommission(commission);
    setShowStripeModal(true);
  };
  
  const handlePaymentSuccess = () => {
    alert('Payment successful! Commission has been marked as paid.');
    refreshData(); // Refresh the commissions list
  };
  
  const handleCancelCommission = async (commissionId, reason) => {
    try {
        const response = await cancelCommission(commissionId, reason);
        if (response.success) {
            alert(`Commission cancelled successfully.\nReason: ${reason}`);
            refreshData();
        }
    } catch (error) {
        alert('Failed to cancel commission: ' + error.message);
    }
  };
  
  // Case-insensitive filter for status
  const filteredCommissions = commissions.filter(commission => {
    const commissionStatus = commission.status?.toLowerCase() || '';
    if (filterStatus === 'pending') return commissionStatus === 'pending';
    if (filterStatus === 'paid') return commissionStatus === 'paid';
    return true;
  });
  
  // Group by agent for summary
  const getAgentSummary = () => {
    const agentMap = new Map();
    filteredCommissions.forEach(comm => {
      if (!agentMap.has(comm.agent_id)) {
        agentMap.set(comm.agent_id, {
          agent_id: comm.agent_id,
          agent_name: comm.agent_name,
          total_premium: 0,
          total_commission: 0,
          pending: 0,
          paid: 0
        });
      }
      const agent = agentMap.get(comm.agent_id);
      agent.total_premium += comm.premium_amount || 0;
      agent.total_commission += comm.amount || 0;
      const commissionStatus = comm.status?.toLowerCase() || '';
      if (commissionStatus === 'pending') agent.pending += comm.amount || 0;
      else if (commissionStatus === 'paid') agent.paid += comm.amount || 0;
    });
    return Array.from(agentMap.values());
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading commissions...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Agent Commissions</h1>
          <p className="text-gray-600">Review and manage commission payments</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={refreshData} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>
      
      {/* Stats Cards
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-gray-600">Total Commissions</div>
          <div className="text-2xl font-bold">${summary?.totalCommissions?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">${summary?.totalPending?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-500">{summary?.pendingCount || 0} transactions</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-gray-600">Paid</div>
          <div className="text-2xl font-bold text-green-600">${summary?.totalPaid?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-500">{summary?.paidCount || 0} transactions</div>
        </div>
      </div> */}
{/* Stats Cards */}
<div className="grid grid-cols-3 gap-4 mb-8">
  <div className="bg-white p-4 rounded-lg shadow border">
    <div className="text-gray-600">Total Commissions</div>
    <div className="text-2xl font-bold">
      ${((totalPaid || 0) + (totalPending || 0)).toLocaleString()}
    </div>
  </div>
  <div className="bg-white p-4 rounded-lg shadow border">
    <div className="text-gray-600">Pending</div>
    <div className="text-2xl font-bold text-yellow-600">
      ${(totalPending || 0).toLocaleString()}
    </div>
    <div className="text-sm text-gray-500">{summary?.pendingCount || 0} transactions</div>
  </div>
  <div className="bg-white p-4 rounded-lg shadow border">
    <div className="text-gray-600">Paid</div>
    <div className="text-2xl font-bold text-green-600">
      ${(totalPaid || 0).toLocaleString()}
    </div>
    <div className="text-sm text-gray-500">{summary?.paidCount || 0} transactions</div>
  </div>
</div>
      
      {/* Filter */}
      <div className="mb-4">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)} 
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All Commissions</option>
          <option value="pending">Pending Only</option>
          <option value="paid">Paid Only</option>
        </select>
      </div>
      
      {/* Agent Summary Table */}
      <div className="bg-white rounded-lg shadow border mb-8">
        <div className="px-6 py-4 border-b font-semibold">Agent Summary</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Agent</th>
                <th className="px-6 py-3 text-left">Total Premium</th>
                <th className="px-6 py-3 text-left">Total Commission</th>
                <th className="px-6 py-3 text-left">Pending</th>
                <th className="px-6 py-3 text-left">Paid</th>
              </tr>
            </thead>
            <tbody>
              {getAgentSummary().map(agent => (
                <tr key={agent.agent_id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{agent.agent_name || 'N/A'}</td>
                  <td className="px-6 py-4">${(agent.total_premium || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-blue-600 font-bold">${(agent.total_commission || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-yellow-600">${(agent.pending || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-green-600">${(agent.paid || 0).toLocaleString()}</td>
                </tr>
              ))}
              {getAgentSummary().length === 0 && (
                <tr className="border-t">
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No agents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b font-semibold">Commission Details</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Agent</th>
                <th className="px-6 py-3 text-left">Policy</th>
                <th className="px-6 py-3 text-left">Premium</th>
                <th className="px-6 py-3 text-left">Rate</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Created</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.map(comm => {
                const isPending = comm.status?.toLowerCase() === 'pending';
                return (
                  <tr key={comm.commission_id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">{comm.agent_name || 'N/A'}</td>
                    <td className="px-6 py-4">#{comm.policy_id || 'N/A'}</td>
                    <td className="px-6 py-4">${(comm.premium_amount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {editingCommission === comm.commission_id ? (
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            value={newRate} 
                            onChange={(e) => setNewRate(e.target.value)} 
                            className="w-20 px-2 py-1 border rounded text-sm" 
                            step="0.1"
                          />
                          <button 
                            onClick={() => handleUpdateRate(comm.commission_id)} 
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => { setEditingCommission(null); setNewRate(''); }} 
                            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{comm.rate || 0}%</span>
                          {isPending && (
                            <button 
                              onClick={() => { setEditingCommission(comm.commission_id); setNewRate(comm.rate || 0); }} 
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit Rate"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-600">${(comm.amount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        comm.status?.toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' : 
                        comm.status?.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {comm.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{comm.created_at || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {isPending ? (
                          <>
                            <button 
                              onClick={() => handlePayWithStripe(comm)} 
                              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              title="Pay with Credit Card"
                            >
                              <CreditCard className="h-3 w-3" />
                              Pay with Card
                            </button>
                            <button 
                              onClick={() => setShowPaymentModal(comm)} 
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              title="Manual Payment Entry"
                            >
                              <Check className="h-3 w-3" />
                              Manual
                            </button>
                            <button 
                              onClick={() => {
                                const reason = prompt('Please enter the reason for cancellation:');
                                if (reason && reason.trim()) {
                                  if (window.confirm(`Are you sure you want to cancel this commission?\nReason: ${reason}`)) {
                                    handleCancelCommission(comm.commission_id, reason);
                                  }
                                } else if (reason === '') {
                                  alert('Please provide a reason for cancellation.');
                                }
                              }} 
                              className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                              title="Cancel Commission"
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm italic">No actions available</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCommissions.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No commissions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Manual Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Manual Payment Entry</h3>
              <button onClick={() => setShowPaymentModal(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Agent: <span className="font-bold">{showPaymentModal.agent_name}</span></p>
              <p className="text-gray-600">Amount: <span className="font-bold text-green-600 text-lg">${(showPaymentModal.amount || 0).toLocaleString()}</span></p>
              <p className="text-gray-600">Commission ID: <span className="font-mono">#{showPaymentModal.commission_id}</span></p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Transaction Reference / ID *</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., TRX-2024-001, BANK-12345"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Payment Method *</label>
                <select
                  id="paymentMethod"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  id="paymentDate"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Notes / Remarks</label>
                <textarea
                  id="paymentNotes"
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional payment details..."
                ></textarea>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const transactionRef = paymentReference;
                  const paymentMethod = document.getElementById('paymentMethod').value;
                  const paymentDate = document.getElementById('paymentDate').value;
                  const paymentNotes = document.getElementById('paymentNotes').value;
                  
                  if (!transactionRef) {
                    alert('Please enter a transaction reference');
                    return;
                  }
                  
                  handleManualPayCommission(showPaymentModal, {
                    transaction_reference: transactionRef,
                    payment_method: paymentMethod,
                    payment_date: paymentDate,
                    notes: paymentNotes
                  });
                }}
                disabled={!paymentReference}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Confirm Payment
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(null);
                  setPaymentReference('');
                }}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stripe Payment Modal */}
      <StripePaymentModal
        commission={selectedCommission}
        isOpen={showStripeModal}
        onClose={() => {
          setShowStripeModal(false);
          setSelectedCommission(null);
        }}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default AgentCommissions;