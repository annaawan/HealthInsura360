// frontend/src/components/AgentDashboard/AgentPayments.js
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  Clock, 
  Eye,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Mail,
  Printer
} from 'lucide-react';
import axios from 'axios';

function AgentPayments({ agent }) {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [clientPolicies, setClientPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    customer_id: '',
    policy_id: '',
    amount: '',
    method: 'cash',
    transaction_ref: '',
    notes: ''
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Helper function to get auth token
  const getAuthToken = () => {
    let token = localStorage.getItem('healthinsura360_token');
    if (!token) {
      token = localStorage.getItem('token');
    }
    return token;
  };

  // Get auth headers
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch agent's clients
  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get('http://localhost:5000/api/payments/agent/clients', {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setClients(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to fetch clients');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch client policies
  const fetchClientPolicies = async (customerId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/payments/agent/clients/${customerId}/policies`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setClientPolicies(response.data.policies || []);
        return response.data.policies;
      }
      return [];
    } catch (error) {
      console.error('Error fetching client policies:', error);
      return [];
    }
  };
  
  // Fetch payment statistics
  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/payments/agent/payments/stats', {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  // Fetch client payment history
  const fetchClientPayments = async (customerId) => {
    console.log('🔵 Fetching payments for customer ID:', customerId);
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/payments/agent/clients/${customerId}/payments`, {
        headers: getAuthHeaders()
      });
      
      console.log('📦 Payments API Response:', response.data);
      
      if (response.data.success) {
        console.log('✅ Payments found:', response.data.payments?.length || 0);
        setPayments(response.data.payments || []);
      } else {
        console.log('❌ No payments found:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching payments:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Email receipt to client
  const emailReceipt = async (paymentId, customerEmail) => {
    const email = prompt('Enter recipient email address:', customerEmail);
    if (!email) return;
    
    setSendingEmail(paymentId);
    try {
      const token = getAuthToken();
      const response = await axios.post(`http://localhost:5000/api/payments/receipt/${paymentId}/email`, 
        { email },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        alert(`Receipt sent to ${email}`);
      } else {
        alert(response.data.message || 'Failed to send receipt');
      }
    } catch (error) {
      console.error('Error emailing receipt:', error);
      alert(error.response?.data?.message || 'Failed to send receipt email');
    } finally {
      setSendingEmail(null);
    }
  };
  
  // Print receipt
  const printReceipt = async (paymentId) => {
    try {
      const token = getAuthToken();
      
      const response = await axios.get(`http://localhost:5000/api/payments/receipt/${paymentId}/print`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/html'
        }
      });
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(response.data);
        printWindow.document.close();
        printWindow.focus();
      } else {
        alert('Please allow pop-ups to print receipts');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert(error.response?.data?.message || 'Failed to print receipt');
    }
  };
  
  // Record payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    
    if (!paymentForm.policy_id) {
      alert('Please select a policy first');
      return;
    }
    
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setRecordingPayment(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/payments/agent/record-payment', 
        {
          customer_id: parseInt(paymentForm.customer_id, 10),
          policy_id: parseInt(paymentForm.policy_id, 10),
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          transaction_ref: paymentForm.transaction_ref,
          notes: paymentForm.notes
        },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        alert('Payment recorded successfully!');
        setShowPaymentModal(false);
        setPaymentForm({
          customer_id: '',
          policy_id: '',
          amount: '',
          method: 'cash',
          transaction_ref: '',
          notes: ''
        });
        setClientPolicies([]);
        await fetchClients();
        if (selectedClient) {
          await fetchClientPayments(selectedClient.customer_id);
        }
        await fetchStats();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };
  
  // Open payment modal for a client
  const openPaymentModal = async (client) => {
    setPaymentForm({
      customer_id: client.customer_id,
      policy_id: '',
      amount: '',
      method: 'cash',
      transaction_ref: '',
      notes: ''
    });
    
    const policies = await fetchClientPolicies(client.customer_id);
    
    if (policies.length === 0) {
      alert('This client has no active policies. Please add a policy first.');
      return;
    }
    
    setShowPaymentModal(true);
  };
  
  // View client details
  const viewClientDetails = async (client) => {
    setSelectedClient(client);
    await fetchClientPayments(client.customer_id);
  };
  
  // Go back to clients list
  const backToClients = () => {
    setSelectedClient(null);
    setPayments([]);
  };
  
  // Refresh all data
  const handleRefresh = async () => {
    await fetchClients();
    await fetchStats();
  };
  
  // Filter clients based on search
  const filteredClients = clients.filter(client => 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );
  
  // Pagination
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  useEffect(() => {
    fetchClients();
    fetchStats();
  }, []);
  
  // Stats Cards Component
  const StatsCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );
  
  if (loading && clients.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }
  
  if (!selectedClient) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Premium Payments</h1>
          <p className="text-gray-600">View and manage premium payments from your clients</p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard title="Total Clients" value={stats.total_clients || 0} icon={Users} color="blue" />
            <StatsCard title="Total Collection" value={formatCurrency(stats.total_collection)} icon={Wallet} color="green" />
            <StatsCard title="Pending Collection" value={formatCurrency(stats.pending_collection)} icon={Clock} color="yellow" />
            <StatsCard title="Monthly Collection" value={formatCurrency(stats.monthly_collection)} icon={TrendingUp} color="purple" />
          </div>
        )}
        
        {/* Search and Filter */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        
        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Client Name</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Contact</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Policies</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Total Paid</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Last Payment</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClients.map((client) => (
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
                    <td className="px-6 py-4 text-gray-600">{client.total_policies || 0}</td>
                    <td className="px-6 py-4 font-bold text-green-600">{formatCurrency(client.total_paid)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {client.last_payment_date ? formatDate(client.last_payment_date) : 'No payments'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.customer_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {client.customer_status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewClientDetails(client)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Payment History"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openPaymentModal(client)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Record Payment"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedClients.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'No clients match your search' : 'No clients found. You may not have any assigned clients yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Payment History View
  console.log('🎯 Rendering Payment History View');
  console.log('📊 Payments data:', payments);
  console.log('📊 Payments length:', payments.length);
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={backToClients}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Clients
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment History: {selectedClient.first_name} {selectedClient.last_name}
          </h1>
          <p className="text-gray-600">{selectedClient.email} | {selectedClient.phone}</p>
        </div>
        <button
          onClick={() => openPaymentModal(selectedClient)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <DollarSign className="h-4 w-4" /> Record Payment
        </button>
      </div>
      
      {/* Payments Table with Receipt Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Payment ID</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Policy</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Amount</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Method</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Date</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Receipt Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.payment_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{payment.payment_id}</td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{payment.policy_type || 'N/A'}</div>
                    <div className="text-sm text-gray-500">ID: {payment.policy_id}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-4 capitalize">{payment.method}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                      payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(payment.paid_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {/* Email Receipt Button */}
                      <button
                        onClick={() => emailReceipt(payment.payment_id, selectedClient.email)}
                        disabled={sendingEmail === payment.payment_id}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Email Receipt"
                      >
                        {sendingEmail === payment.payment_id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </button>
                      
                      {/* Print Receipt Button */}
                      <button
                        onClick={() => printReceipt(payment.payment_id)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Print Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No payment records found for this client
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment}>
              <div className="space-y-4">
                {/* Policy Selection */}
                <div>
                  <label className="block text-gray-700 mb-2">Select Policy *</label>
                  <select
                    required
                    value={paymentForm.policy_id}
                    onChange={(e) => {
                      const selectedPolicyId = e.target.value;
                      const selectedPolicy = clientPolicies.find(p => p.policy_id === selectedPolicyId);
                      setPaymentForm({
                        ...paymentForm,
                        policy_id: selectedPolicyId,
                        amount: selectedPolicy?.premium_amount || ''
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a policy --</option>
                    {clientPolicies.map((policy) => (
                      <option key={policy.policy_id} value={policy.policy_id}>
                        {policy.policy_type || 'Policy'} - ${(policy.premium_amount || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {clientPolicies.length === 0 && (
                    <p className="text-sm text-red-500 mt-1">No policies found for this client</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">Payment Method *</label>
                  <select
                    required
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="check">Check</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">Transaction Reference</label>
                  <input
                    type="text"
                    value={paymentForm.transaction_ref}
                    onChange={(e) => setPaymentForm({...paymentForm, transaction_ref: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional reference number"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">Notes</label>
                  <textarea
                    rows="3"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this payment"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={recordingPayment || !paymentForm.policy_id}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recordingPayment ? 'Processing...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentPayments;