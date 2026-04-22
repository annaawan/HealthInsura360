// frontend/src/components/AgentDashboard/ClaimManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, CheckCircle, XCircle, Clock, Eye, 
  Download, Search, RefreshCw, ChevronLeft, 
  ChevronRight, Users, ClipboardList, X, AlertTriangle, Shield
} from 'lucide-react';
import axios from 'axios';

function ClaimManagement({ agent }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [clientStats, setClientStats] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [disapprovalReason, setDisapprovalReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDisapproveModal, setShowDisapproveModal] = useState(false);
  const [currentClaim, setCurrentClaim] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getAuthToken = () => {
    let token = localStorage.getItem('healthinsura360_token');
    if (!token) token = localStorage.getItem('token');
    return token;
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  });

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/payments/agent/clients', {
        headers: getAuthHeaders()
      });
      if (response.data.success) {
        setClients(response.data.data || []);
        // Fetch claim stats for each client
        for (let client of response.data.data) {
          await fetchClientClaimStats(client.customer_id);
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch claim statistics for a specific client
  const fetchClientClaimStats = async (customerId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/payments/agent/clients/${customerId}/claim-stats`, {
        headers: getAuthHeaders()
      });
      if (response.data.success) {
        setClientStats(prev => ({
          ...prev,
          [customerId]: response.data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching client claim stats:', error);
    }
  };

 // Fetch claims for a specific client
const fetchClientClaims = async (customerId, statusValue = null) => {
    setLoading(true);
    try {
        const activeStatus = statusValue !== null ? statusValue : filterStatus;
        let url = `http://localhost:5000/api/payments/agent/clients/${customerId}/claims`;
        
        if (activeStatus !== 'all') {
            url += `?status=${activeStatus}`;
        }
        
        console.log('Fetching claims with filter:', activeStatus, url);
        
        const response = await axios.get(url, { headers: getAuthHeaders() });
        
        // DEBUG: Log the first claim's remaining_coverage
        if (response.data.data && response.data.data.length > 0) {
            console.log('First claim in response:', response.data.data[0]);
            console.log('Remaining coverage from API:', response.data.data[0].remaining_coverage);
            console.log('Sum insured from API:', response.data.data[0].sum_insured);
        }
        
        if (response.data.success) {
            setClaims(response.data.data || []);
            setStats(response.data.stats);
        }
    } catch (error) {
        console.error('Error fetching claims:', error);
    } finally {
        setLoading(false);
    }
};
  // View client claims
  const viewClientClaims = async (client) => {
    setSelectedClient(client);
    setFilterStatus('all');
    setSearchTerm('');
    setCurrentPage(1);
    await fetchClientClaims(client.customer_id, 'all');
  };

  // Handle filter change
  const handleFilterChange = async (status) => {
    console.log('Filter changed to:', status);
    setFilterStatus(status);
    setCurrentPage(1);
    if (selectedClient) {
      await fetchClientClaims(selectedClient.customer_id, status);
    }
  };

  // Go back to clients list
  const backToClients = () => {
    setSelectedClient(null);
    setClaims([]);
    setStats(null);
    setFilterStatus('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // View claim details
const viewClaimDetails = (claim) => {
    console.log('=== CLAIM DETAILS DEBUG ===');
    console.log('Claim object:', claim);
    console.log('remaining_coverage value:', claim.remaining_coverage);
    console.log('sum_insured value:', claim.sum_insured);
    console.log('claim_amount:', claim.claim_amount);
    setSelectedClaim(claim);
    setShowModal(true);
};

  // Approve claim
  const handleApproveClaim = async () => {
    if (!currentClaim) return;
    
    setActionLoading(true);
    try {
      const response = await axios.put(`http://localhost:5000/api/payments/agent/claims/${currentClaim.claim_id}/approve`,
        { approved_amount: approvedAmount || currentClaim.claim_amount, notes: approvalNotes },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        alert('Claim approved successfully!');
        setShowApproveModal(false);
        setApprovalNotes('');
        setApprovedAmount('');
        await fetchClientClaims(selectedClient.customer_id, filterStatus);
        await fetchClientClaimStats(selectedClient.customer_id);
        setShowModal(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve claim');
    } finally {
      setActionLoading(false);
    }
  };
// Retry payment for approved claim
const handleRetryPayment = async (claim) => {
    if (!window.confirm(`Retry payment of $${claim.approved_amount?.toLocaleString()} for claim #${claim.claim_id}?`)) {
        return;
    }
    
    setActionLoading(true);
    try {
        const response = await axios.post(`http://localhost:5000/api/payments/agent/claims/${claim.claim_id}/retry-payment`,
            {},
            { headers: getAuthHeaders() }
        );
        
        if (response.data.success) {
            alert(`✅ ${response.data.message}`);
            // Refresh the claims list
            await fetchClientClaims(selectedClient.customer_id, filterStatus);
            await fetchClientClaimStats(selectedClient.customer_id);
        }
    } catch (error) {
        console.error('Error retrying payment:', error);
        const errorMessage = error.response?.data?.message || 'Failed to process payment';
        alert(`❌ Payment failed: ${errorMessage}`);
    } finally {
        setActionLoading(false);
    }
};
  // Disapprove claim
  const handleDisapproveClaim = async () => {
    if (!currentClaim) return;
    
    if (!disapprovalReason) {
      alert('Please provide a reason for disapproval');
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await axios.put(`http://localhost:5000/api/payments/agent/claims/${currentClaim.claim_id}/disapprove`,
        { reason: disapprovalReason, notes: approvalNotes },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        alert('Claim disapproved successfully!');
        setShowDisapproveModal(false);
        setDisapprovalReason('');
        setApprovalNotes('');
        await fetchClientClaims(selectedClient.customer_id, filterStatus);
        await fetchClientClaimStats(selectedClient.customer_id);
        setShowModal(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to disapprove claim');
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    const badges = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'disapproved': 'bg-red-100 text-red-800',
      'paid': 'bg-blue-100 text-blue-800'
    };
    return badges[statusLower] || 'bg-gray-100 text-gray-800';
  };

  // Get claim type badge
  const getClaimTypeBadge = (type) => {
    const typeLower = (type || '').toLowerCase();
    const badges = {
      'medical': 'bg-blue-100 text-blue-800',
      'hospital': 'bg-purple-100 text-purple-800',
      'critical_illness': 'bg-red-100 text-red-800',
      'accident': 'bg-orange-100 text-orange-800'
    };
    return badges[typeLower] || 'bg-gray-100 text-gray-800';
  };
const handleRenewPolicy = async (policyId) => {
    const months = prompt('Enter renewal period in months (default 12):', '12');
    if (!months) return;
    
    try {
        const response = await axios.post(`http://localhost:5000/api/payments/agent/policies/${policyId}/renew`,
            { renewal_period_months: parseInt(months) },  // No notes field
            { headers: getAuthHeaders() }
        );
        
        if (response.data.success) {
            alert(`Policy renewed successfully! Coverage reset to ${formatCurrency(response.data.data.remaining_coverage)}`);
            // Refresh the claims list
            await fetchClientClaims(selectedClient.customer_id, filterStatus);
            await fetchClientClaimStats(selectedClient.customer_id);
        }
    } catch (error) {
        alert(error.response?.data?.message || 'Failed to renew policy');
    }
};
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };
 // In the handleApproveClaimWithType function
const handleApproveClaimWithType = async (coverageType) => {
    if (!currentClaim) return;
    
    const approvedAmt = parseFloat(document.getElementById('approvedAmount').value);
    const coverageExplanation = document.getElementById('coverageExplanation').value;
    
    if (isNaN(approvedAmt) || approvedAmt <= 0) {
        alert('Please enter a valid approved amount');
        return;
    }
    
    // For partial coverage, the approved amount is what INSURANCE pays
    if (coverageType === 'partial' && approvedAmt > currentClaim.remaining_coverage) {
        alert(`Cannot approve $${approvedAmt.toLocaleString()}. Remaining coverage is only $${currentClaim.remaining_coverage.toLocaleString()}.`);
        return;
    }
    
    setActionLoading(true);
    try {
        const response = await axios.put(`http://localhost:5000/api/payments/agent/claims/${currentClaim.claim_id}/approve`,
            { 
                approved_amount: approvedAmt,  // This is what insurance pays
                coverage_type: coverageType,
                notes: `${approvalNotes}\n\nCoverage Explanation: ${coverageExplanation}`
            },
            { headers: getAuthHeaders() }
        );
        
        if (response.data.success) {
            alert(response.data.message);
            setShowApproveModal(false);
            setApprovalNotes('');
            setApprovedAmount('');
            await fetchClientClaims(selectedClient.customer_id, filterStatus);
            await fetchClientClaimStats(selectedClient.customer_id);
            setShowModal(false);
        }
    } catch (error) {
        alert(error.response?.data?.message || 'Failed to approve claim');
    } finally {
        setActionLoading(false);
    }
};

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Filter claims by search (client-side)
  const filteredClaims = claims.filter(claim => 
    searchTerm === '' || 
    claim.claim_id?.toString().includes(searchTerm) ||
    claim.claim_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const paginatedClaims = filteredClaims.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);

  // Filter clients by search
  const filteredClients = clients.filter(client => 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  useEffect(() => {
    fetchClients();
  }, []);

  // If no client selected, show client list
  if (!selectedClient) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Management</h1>
          <p className="text-gray-600">View and manage insurance claims from your clients</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={fetchClients} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 ml-4">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Clients Found</h3>
            <p className="text-gray-500">No clients assigned to you yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Client Name</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Contact</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Total Claims</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Pending</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Approved</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client) => {
                    const clientStat = clientStats[client.customer_id] || {};
                    return (
                      <tr key={client.customer_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {client.first_name} {client.last_name}
                          </div>
                         </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{client.email}</div>
                          <div className="text-sm text-gray-500">{client.phone}</div>
                         </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-semibold text-gray-900">{clientStat.total_claims || 0}</span>
                         </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {clientStat.pending_count || 0}
                          </span>
                         </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {clientStat.approved_count || 0}
                          </span>
                         </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => viewClientClaims(client)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <ClipboardList className="h-4 w-4" />
                            View Claims
                          </button>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Claims View for selected client
return (
  <div className="p-8">
    <div className="mb-6">
      <button
        onClick={backToClients}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Clients
      </button>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Claims: {selectedClient.first_name} {selectedClient.last_name}
          </h1>
          <p className="text-gray-600">{selectedClient.email} | {selectedClient.phone}</p>
        </div>
        <button
          onClick={() => fetchClientClaims(selectedClient.customer_id, filterStatus)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
    </div>

    {/* Stats Cards */}
    {stats && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm">Total Claims</div>
          <div className="text-2xl font-bold">{stats.total_claims || 0}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-200">
          <div className="text-yellow-600 text-sm">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pending_count || 0}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
          <div className="text-green-600 text-sm">Approved</div>
          <div className="text-2xl font-bold text-green-700">{stats.approved_count || 0}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-200">
          <div className="text-red-600 text-sm">Disapproved</div>
          <div className="text-2xl font-bold text-red-700">{stats.disapproved_count || 0}</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-200">
          <div className="text-blue-600 text-sm">Approved Amount</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(stats.total_approved_amount)}</div>
        </div>
      </div>
    )}

    {/* Filter Tabs */}
    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
      {['all', 'pending', 'approved', 'disapproved', 'paid'].map((status) => (
        <button
          key={status}
          onClick={() => handleFilterChange(status)}
          className={`px-4 py-2 font-medium capitalize transition-colors ${
            filterStatus === status 
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px]' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {status === 'all' ? 'All' : status}
        </button>
      ))}
    </div>

    {/* Search */}
    <div className="mb-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by claim ID or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    {/* Claims Table */}
{loading ? (
  <div className="text-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p className="text-gray-600">Loading claims...</p>
  </div>
) : paginatedClaims.length === 0 ? (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Found</h3>
    <p className="text-gray-500">
      {filterStatus !== 'all' 
        ? `No ${filterStatus} claims found for this client`
        : 'No claims have been submitted by this client'}
    </p>
  </div>
) : (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-gray-700 font-medium">Claim ID</th>
            <th className="px-6 py-3 text-left text-gray-700 font-medium">Type</th>
            <th className="px-6 py-3 text-left text-gray-700 font-medium">Amount</th>
            <th className="px-6 py-3 text-left text-gray-700 font-medium">Approved</th>
            <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
            <th className="px-6 py-3 text-left text-gray-700 font-medium">Filing Date</th>
            <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {paginatedClaims.map((claim) => (
            <tr key={claim.claim_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-mono text-sm">#{claim.claim_id}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getClaimTypeBadge(claim.claim_type)}`}>
                  {claim.claim_type || 'Medical'}
                </span>
              </td>
              <td className="px-6 py-4 font-bold">{formatCurrency(claim.claim_amount)}</td>
              <td className="px-6 py-4">{claim.approved_amount ? formatCurrency(claim.approved_amount) : '-'}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(claim.status)}`}>
                  {claim.status}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-600">{formatDate(claim.filing_date)}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  {/* View Details Button */}
                  <button
                    onClick={() => viewClaimDetails(claim)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {/* Retry Payment Button - Shows only for 'approved' status (payment pending/failed) */}
                  {claim.status === 'approved' && (
                    <button
                      onClick={() => handleRetryPayment(claim)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Retry Payment Transfer"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Renew Policy Button - Shows only when coverage is exhausted AND claim is pending */}
                  {claim.remaining_coverage <= 0 && claim.status === 'pending' && (
                    <button
                      onClick={() => handleRenewPolicy(claim.policy_id)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Renew Policy to Approve"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Pagination */}
    {totalPages > 1 && (
      <div className="flex justify-between items-center px-6 py-4 border-t">
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1} 
          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages} 
          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )}
  </div>
)}

    {/* Claim Details Modal */}
    {showModal && selectedClaim && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Claim Details - #{selectedClaim.claim_id}</h2>
            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Claim Type</div>
                <div className="font-medium capitalize">{selectedClaim.claim_type || 'Medical'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Policy ID</div>
                <div className="font-medium">#{selectedClaim.policy_id}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Claim Amount</div>
                <div className="font-bold text-lg">{formatCurrency(selectedClaim.claim_amount)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(selectedClaim.status)}`}>
                  {selectedClaim.status}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                <div className="text-sm text-gray-600">Filing Date</div>
                <div className="font-medium">{formatDate(selectedClaim.filing_date)}</div>
              </div>
            </div>
           
            {/* Coverage Information */}
            {selectedClaim.sum_insured && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Policy Coverage Status
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Total Coverage:</span>
                    <span className="font-medium ml-2 text-blue-700">
                      {formatCurrency(selectedClaim.sum_insured)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Remaining Coverage:</span>
                    <span className={`font-medium ml-2 ${selectedClaim.remaining_coverage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedClaim.remaining_coverage)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Used Coverage:</span>
                    <span className="font-medium ml-2 text-orange-600">
                      {formatCurrency(selectedClaim.used_coverage)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Usage Percentage:</span>
                    <span className="font-medium ml-2">
                      {selectedClaim.coverage_used_percentage || 0}%
                    </span>
                  </div>
                  {selectedClaim.deductible_amount > 0 && (
                    <div>
                      <span className="text-gray-600">Deductible:</span>
                      <span className="font-medium ml-2">${selectedClaim.deductible_amount}</span>
                    </div>
                  )}
                  {selectedClaim.co_pay_percentage > 0 && (
                    <div>
                      <span className="text-gray-600">Co-pay:</span>
                      <span className="font-medium ml-2">{selectedClaim.co_pay_percentage}%</span>
                    </div>
                  )}
                </div>
                
                {/* Warning if claim amount exceeds remaining coverage */}
{Number(selectedClaim.claim_amount) > Number(selectedClaim.remaining_coverage) && Number(selectedClaim.remaining_coverage) > 0 && (
    <div className="mt-3 p-2 bg-yellow-100 rounded text-yellow-800 text-sm flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Warning: Claim amount ({formatCurrency(selectedClaim.claim_amount)}) exceeds remaining coverage ({formatCurrency(selectedClaim.remaining_coverage)}). Only partial approval possible.
    </div>
)}
              </div>
            )}
            
            {/* Coverage Exhausted Warning and Renew Button */}
            {selectedClaim.remaining_coverage <= 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Coverage Exhausted!</span>
                </div>
                <p className="text-sm text-red-600 mb-3">
                  This policy has ${formatCurrency(selectedClaim.remaining_coverage)} remaining coverage. 
                  You cannot approve any more claims until the policy is renewed.
                </p>
                <button
                  onClick={() => {
                    handleRenewPolicy(selectedClaim.policy_id);
                    setShowModal(false);
                  }}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Renew Policy Now
                </button>
              </div>
            )}
            
            {selectedClaim.approval_notes && (
              <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">Review Notes</div>
                <div className="text-sm text-blue-700">{selectedClaim.approval_notes}</div>
              </div>
            )}
            
            {/* Action Buttons - Only show if coverage is available and claim is pending */}
            {selectedClaim.status === 'pending' && selectedClaim.remaining_coverage > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setCurrentClaim(selectedClaim); setShowApproveModal(true); setShowModal(false); }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 inline mr-2" /> Approve Claim
                </button>
                <button
                  onClick={() => { setCurrentClaim(selectedClaim); setShowDisapproveModal(true); setShowModal(false); }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 inline mr-2" /> Disapprove
                </button>
              </div>
            )}
            
            {/* Disabled message when coverage exhausted */}
            {selectedClaim.status === 'pending' && selectedClaim.remaining_coverage <= 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  disabled
                  className="flex-1 bg-gray-400 text-white py-2 rounded-lg cursor-not-allowed"
                  title="Cannot approve - coverage exhausted. Please renew policy first."
                >
                  <CheckCircle className="h-4 w-4 inline mr-2" /> Approve Claim (Disabled - No Coverage)
                </button>
                <button
                  onClick={() => { setCurrentClaim(selectedClaim); setShowDisapproveModal(true); setShowModal(false); }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 inline mr-2" /> Disapprove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    
    {/* Approve Modal */}
{showApproveModal && currentClaim && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Approve Claim - #{currentClaim.claim_id}</h2>
            
            {/* Coverage Exhausted Warning */}
            {currentClaim.remaining_coverage <= 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">No Remaining Coverage!</span>
                    </div>
                    <p className="text-sm text-red-600 mb-3">
                        This policy has ${currentClaim.remaining_coverage?.toLocaleString()} remaining coverage. You cannot approve any more claims until the policy is renewed.
                    </p>
                    <button
                        onClick={() => {
                            handleRenewPolicy(currentClaim.policy_id);
                            setShowApproveModal(false);
                        }}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                        Renew Policy Now
                    </button>
                </div>
            )}
            
            {/* Claim Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm"><strong>Claim ID:</strong> #{currentClaim.claim_id}</p>
                <p className="text-sm"><strong>Requested Amount:</strong> <span className="font-bold text-blue-600">{formatCurrency(currentClaim.claim_amount)}</span></p>
                <p className="text-sm"><strong>Remaining Coverage:</strong> <span className={`font-bold ${currentClaim.remaining_coverage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(currentClaim.remaining_coverage)}
                </span></p>
                <p className="text-sm"><strong>Policy Deductible:</strong> {formatCurrency(currentClaim.deductible_amount)}</p>
                <p className="text-sm"><strong>Policy Co-pay:</strong> {currentClaim.co_pay_percentage || 0}%</p>
            </div>
            
            {/* Sufficient Coverage Message */}
            {currentClaim.remaining_coverage > 0 && currentClaim.claim_amount <= currentClaim.remaining_coverage && (
                <div className="mb-4 p-2 bg-green-100 rounded-lg text-green-700 text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Sufficient coverage available. Full claim amount can be approved.
                </div>
            )}
            
            {/* Coverage Type Selection */}
            {currentClaim.remaining_coverage > 0 && (
                <>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2 font-medium">Coverage Type *</label>
                        <select
                            id="coverageType"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => {
                                const type = e.target.value;
                                const claimAmount = currentClaim.claim_amount;
                                const remainingCoverage = currentClaim.remaining_coverage;
                                const deductible = currentClaim.deductible_amount || 0;
                                const copay = currentClaim.co_pay_percentage || 0;
                                
                                let approvedAmount = 0;
                                let message = '';
                                let showManualInput = false;
                                
                                if (type === 'full_coverage') {
                                    approvedAmount = Math.min(claimAmount, remainingCoverage);
                                    const clientPays = claimAmount - approvedAmount;
                                    if (clientPays > 0) {
                                        message = `✅ Full coverage: Insurance pays $${approvedAmount.toLocaleString()}. Client pays $${clientPays.toLocaleString()} (due to coverage limit).`;
                                    } else {
                                        message = `✅ Full coverage: Insurance pays $${approvedAmount.toLocaleString()}. Client pays $0.`;
                                    }
                                } 
                                else if (type === 'with_deductible') {
                                    let afterDeductible = Math.max(0, claimAmount - deductible);
                                    approvedAmount = Math.min(afterDeductible, remainingCoverage);
                                    const clientPays = claimAmount - approvedAmount;
                                    message = `💰 Deductible of $${deductible.toLocaleString()} applied. Insurance pays $${approvedAmount.toLocaleString()}. Client pays $${clientPays.toLocaleString()}.`;
                                } 
                                else if (type === 'with_copay') {
                                    const clientPaysPercent = (claimAmount * copay) / 100;
                                    approvedAmount = claimAmount - clientPaysPercent;
                                    approvedAmount = Math.min(approvedAmount, remainingCoverage);
                                    const actualClientPays = claimAmount - approvedAmount;
                                    message = `📊 ${copay}% co-pay applied. Insurance pays $${approvedAmount.toLocaleString()}. Client pays $${actualClientPays.toLocaleString()}.`;
                                } 
                                else if (type === 'partial') {
                                    showManualInput = true;
                                    approvedAmount = Math.min(remainingCoverage, claimAmount);
                                    message = `✏️ Enter custom approved amount below. Maximum available: $${remainingCoverage.toLocaleString()}`;
                                } 
                                else if (type === 'excess_coverage') {
                                    if (claimAmount > remainingCoverage) {
                                        const excessAmount = claimAmount - remainingCoverage;
                                        const excessCopay = (excessAmount * 50) / 100;
                                        approvedAmount = remainingCoverage;
                                        message = `⚠️ Claim exceeds coverage by $${excessAmount.toLocaleString()}. Insurance pays full coverage $${approvedAmount.toLocaleString()}. 50% co-pay on excess: Client pays $${excessCopay.toLocaleString()}.`;
                                    } else {
                                        approvedAmount = Math.min(claimAmount, remainingCoverage);
                                        message = `✅ Full coverage: Insurance pays $${approvedAmount.toLocaleString()}. Client pays $0.`;
                                    }
                                }
                                
                                // Update the input field
                                const amountInput = document.getElementById('approvedAmount');
                                if (amountInput) {
                                    amountInput.value = approvedAmount;
                                    amountInput.disabled = !showManualInput;
                                    if (!showManualInput) {
                                        setApprovedAmount(approvedAmount.toString());
                                    }
                                }
                                
                                // Update the message display
                                const messageDiv = document.getElementById('calculationMessage');
                                if (messageDiv) {
                                    messageDiv.innerHTML = `<div class="p-2 rounded ${type === 'excess_coverage' && claimAmount > remainingCoverage ? 'bg-yellow-100 text-yellow-800' : 'bg-green-50 text-green-700'}">${message}</div>`;
                                }
                                
                                // Store the explanation
                                const explanationInput = document.getElementById('coverageExplanation');
                                if (explanationInput) {
                                    explanationInput.value = message;
                                }
                            }}
                        >
                            <option value="">-- Select Coverage Type --</option>
                            <option value="full_coverage">✅ Full Coverage (Insurance pays eligible amount)</option>
                            {currentClaim.deductible_amount > 0 && (
                                <option value="with_deductible">💰 Apply Deductible (Client pays ${formatCurrency(currentClaim.deductible_amount)})</option>
                            )}
                            {currentClaim.co_pay_percentage > 0 && (
                                <option value="with_copay">📊 Apply Co-pay (Client pays {currentClaim.co_pay_percentage}%)</option>
                            )}
                            <option value="partial">✏️ Partial Coverage (Custom Amount)</option>
                            {currentClaim.claim_amount > currentClaim.remaining_coverage && currentClaim.remaining_coverage > 0 && (
                                <option value="excess_coverage">⚠️ Excess Coverage with 50% Co-pay</option>
                            )}
                        </select>
                    </div>
                    
                    <div id="calculationMessage" className="mb-3"></div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Approved Amount (Insurance Pays) *</label>
                        <input
                            type="number"
                            step="0.01"
                            id="approvedAmount"
                            defaultValue={Math.min(currentClaim.claim_amount, currentClaim.remaining_coverage)}
                            onChange={(e) => setApprovedAmount(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Maximum available: {formatCurrency(currentClaim.remaining_coverage)}
                        </p>
                    </div>
                    
                    <input type="hidden" id="coverageExplanation" />
                </>
            )}
            
            {/* Notes Section */}
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Notes to Customer (Optional)</label>
                <textarea
                    rows="3"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any notes about this approval..."
                />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
                <button 
                    onClick={() => {
                        if (currentClaim.remaining_coverage <= 0) {
                            alert('Cannot approve - coverage exhausted. Please renew the policy first.');
                            return;
                        }
                        const coverageType = document.getElementById('coverageType')?.value;
                        if (!coverageType) {
                            alert('Please select a coverage type');
                            return;
                        }
                        const approvedAmt = document.getElementById('approvedAmount')?.value;
                        if (!approvedAmt || parseFloat(approvedAmt) <= 0) {
                            alert('Please enter a valid approved amount');
                            return;
                        }
                        if (parseFloat(approvedAmt) > currentClaim.remaining_coverage) {
                            alert(`Approved amount cannot exceed remaining coverage of ${formatCurrency(currentClaim.remaining_coverage)}`);
                            return;
                        }
                        setApprovedAmount(approvedAmt);
                        handleApproveClaimWithType(coverageType);
                    }} 
                    disabled={actionLoading} 
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {actionLoading ? 'Processing...' : 'Confirm Approval'}
                </button>
                <button 
                    onClick={() => { 
                        setShowApproveModal(false); 
                        setApprovedAmount(''); 
                        setApprovalNotes(''); 
                        // Reset the select dropdown
                        const select = document.getElementById('coverageType');
                        if (select) select.value = '';
                        const messageDiv = document.getElementById('calculationMessage');
                        if (messageDiv) messageDiv.innerHTML = '';
                    }} 
                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
)}

    {/* Disapprove Modal */}
    {showDisapproveModal && currentClaim && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Disapprove Claim</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Reason for Disapproval *</label>
            <textarea
              rows="3"
              required
              value={disapprovalReason}
              onChange={(e) => setDisapprovalReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Provide a clear reason for disapproval..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Additional Notes (Optional)</label>
            <textarea
              rows="2"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Any additional notes..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleDisapproveClaim} disabled={actionLoading} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {actionLoading ? 'Processing...' : 'Confirm Disapproval'}
            </button>
            <button onClick={() => { setShowDisapproveModal(false); setDisapprovalReason(''); setApprovalNotes(''); }} className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}

export default ClaimManagement;