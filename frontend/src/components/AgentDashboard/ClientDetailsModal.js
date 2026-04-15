// frontend/src/components/AgentDashboard/ClientDetailsModal.js
import { useState, useEffect } from 'react';
import { X, FileText, FileCheck, CreditCard, History, Calendar, DollarSign, Shield, Phone, Mail, MapPin } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from '../../config';
// Add this import at the top with your other imports
import { PolicyActionModal } from './PolicyActionModal';

export function ClientDetailsModal({ isOpen, onClose, client, onStatusUpdate }) {
  const [activeTab, setActiveTab] = useState('policy'); // policy, claims, payments
  const [policyDetails, setPolicyDetails] = useState(null);
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newStatus, setNewStatus] = useState(null);
  const [policyActionModal, setPolicyActionModal] = useState({
  isOpen: false,
  actionType: null, // 'add', 'renew', 'upgrade'
  existingPolicy: null
});


  useEffect(() => {
    if (isOpen && client) {
      fetchClientDetails();
    }
  }, [isOpen, client]);

  const fetchClientDetails = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      
      // Fetch policy details
      const policyRes = await axios.get(`${API_BASE_URL}/agent/clients/${client.client_id}/policies`, config);
      setPolicyDetails(policyRes.data[0] || null);
      
      // Fetch claims history
      const claimsRes = await axios.get(`${API_BASE_URL}/agent/clients/${client.client_id}/claims`, config);
      setClaims(claimsRes.data);
      
      // Fetch payment history
      const paymentsRes = await axios.get(`${API_BASE_URL}/agent/clients/${client.client_id}/payments`, config);
      setPayments(paymentsRes.data);
      
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };
   // Add these functions
const handleAddPolicy = () => {
  setPolicyActionModal({
    isOpen: true,
    actionType: 'add',
    existingPolicy: null
  });
};

const handleRenewPolicy = (policy) => {
  setPolicyActionModal({
    isOpen: true,
    actionType: 'renew',
    existingPolicy: policy
  });
};


const handlePolicyActionSuccess = () => {
  fetchClientDetails(); // Refresh all data
};
  const handleStatusToggle = async () => {
    const isActive = client.status?.toLowerCase() === 'active';
    const newStatusValue = isActive ? 'inactive' : 'active';
    setNewStatus(newStatusValue);
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    setUpdatingStatus(true);
    try {
      const config = getAxiosConfig();
      const response = await axios.put(
        `${API_BASE_URL}/agent/clients/${client.client_id}/status`,
        { status: newStatus },
        config
      );
      
      if (response.data.success) {
        client.status = newStatus;
        alert(response.data.message);
        if (onStatusUpdate) {
          onStatusUpdate(); // Refresh the client list
        }
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Error updating client status');
    } finally {
      setUpdatingStatus(false);
      setShowConfirmDialog(false);
    }
  };

  // Get status color for badges
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
      case 'deactivated':
        return 'bg-gray-100 text-gray-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Get status display text
  const getStatusText = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'Active';
      case 'inactive':
      case 'deactivated':
        return 'Inactive';
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'paid':
      case 'completed':
        return 'Paid';
      case 'failed':
        return 'Failed';
      default:
        return status || 'Active';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div>
            <h2 className="text-xl font-semibold">Client Details</h2>
            <p className="text-purple-100 text-sm mt-1">View complete client information</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-purple-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Client Info Summary */}
        <div className="bg-gray-50 p-6 border-b">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-600">
                {client.first_name?.[0]}{client.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {client.first_name} {client.last_name}
              </h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone || 'N/A'}</span>
                </div>
                {client.street && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                    <MapPin className="h-4 w-4" />
                    <span>{client.street}, {client.city}, {client.state} {client.zipcode}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(client.status)}`}>
                {getStatusText(client.status)}
              </div>
              {/* Action Button */}
              <button
                onClick={handleStatusToggle}
                disabled={updatingStatus}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  client.status?.toLowerCase() === 'active'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {client.status?.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'policy'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            Policy Details
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'claims'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Claims History
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'payments'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Payment History
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirm {newStatus === 'active' ? 'Activation' : 'Deactivation'}
                </h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to {newStatus === 'active' ? 'activate' : 'deactivate'} {client.first_name} {client.last_name}'s account?
                </p>
                {newStatus === 'inactive' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Deactivating this account will prevent the client from logging in and accessing their policies.
                    </p>
                  </div>
                )}
                {newStatus === 'active' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800">
                      ✅ Activating this account will restore full access for the client.
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmStatusChange}
                    disabled={updatingStatus}
                    className={`px-4 py-2 rounded-lg text-white ${
                      newStatus === 'active'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50`}
                  >
                    {updatingStatus ? 'Processing...' : `Yes, ${newStatus === 'active' ? 'Activate' : 'Deactivate'}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Policy Details Tab */}
{activeTab === 'policy' && (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Current Policies</h3>
      <button
        onClick={handleAddPolicy}
        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
      >
        + Add New Policy
      </button>
    </div>
    
    {policyDetails ? (
      <div className="space-y-6">
        {/* Existing Policy Card */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">{policyDetails.policy_type || 'Health Insurance'}</h4>
              <p className="text-sm text-gray-500">Policy #{policyDetails.policy_id}</p>
            </div>
            {/* Only show Renew button - no upgrade button */}
            <button
              onClick={() => handleRenewPolicy(policyDetails)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Renew Policy
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 uppercase">Premium Amount</label>
              <p className="text-lg font-semibold text-gray-900">${policyDetails.premium_amount}/month</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 uppercase">Sum Insured</label>
              <p className="text-lg font-semibold text-gray-900">${policyDetails.sum_insured?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 uppercase">Start Date</label>
              <p className="text-gray-900">{new Date(policyDetails.start_date).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500 uppercase">End Date</label>
              <p className="text-gray-900">{new Date(policyDetails.end_date).toLocaleDateString()}</p>
              {(() => {
                const endDate = new Date(policyDetails.end_date);
                const today = new Date();
                if (endDate < today) {
                  return <p className="text-xs text-red-600 mt-1">⚠️ Expired - Renewal needed</p>;
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="text-center py-12 text-gray-500">
        <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No active policy found for this client.</p>
        <button
          onClick={handleAddPolicy}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Add First Policy
        </button>
      </div>
    )}
  </div>
)}

              {/* Claims History Tab */}
              {activeTab === 'claims' && (
                <div>
                  {claims.length > 0 ? (
                    <div className="space-y-4">
                      {claims.map((claim) => (
                        <div key={claim.claim_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">Claim #{claim.claim_id}</h4>
                              <p className="text-sm text-gray-500">{new Date(claim.filing_date).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                              {getStatusText(claim.status)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Claim Type:</span>
                              <span className="ml-2 text-gray-900">{claim.claim_type}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Claim Amount:</span>
                              <span className="ml-2 text-gray-900">${claim.claim_amount}</span>
                            </div>
                            {claim.approved_amount && (
                              <div>
                                <span className="text-gray-500">Approved Amount:</span>
                                <span className="ml-2 text-green-600">${claim.approved_amount}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Hospital:</span>
                              <span className="ml-2 text-gray-900">{claim.hospital_id || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FileCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No claims found for this client.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment History Tab */}
              {activeTab === 'payments' && (
                <div>
                  {payments.length > 0 ? (
                    <div className="space-y-4">
                      {payments.map((payment) => (
                        <div key={payment.payment_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">Payment #{payment.payment_id}</h4>
                              <p className="text-sm text-gray-500">{new Date(payment.paid_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {getStatusText(payment.status)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Amount:</span>
                              <span className="ml-2 text-gray-900 font-semibold">${payment.amount}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Method:</span>
                              <span className="ml-2 text-gray-900">{payment.method || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Transaction Ref:</span>
                              <span className="ml-2 text-gray-900 font-mono text-xs">{payment.transaction_ref || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No payment history found for this client.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Policy Action Modal */}
<PolicyActionModal
  isOpen={policyActionModal.isOpen}
  onClose={() => setPolicyActionModal({ isOpen: false, actionType: null, existingPolicy: null })}
  client={client}
  actionType={policyActionModal.actionType}
  existingPolicy={policyActionModal.existingPolicy}
  onSuccess={handlePolicyActionSuccess}
/>
    </div>
  );
}