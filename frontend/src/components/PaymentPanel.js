// frontend/src/components/CustomerDashboard/PaymentPanel.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Calendar, Clock, CheckCircle, XCircle, AlertCircle, CreditCard, Bell, Wallet } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const getAxiosConfig = () => {
  const token = localStorage.getItem('healthinsura360_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.floor(amount || 0));
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

function PaymentPanel() {
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [summary, setSummary] = useState({ total_due: 0, reminders_count: 0, last_payment_date: null });
  const [customerBalance, setCustomerBalance] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const config = getAxiosConfig();
      
      // Fetch customer balance
      const balanceRes = await axios.get(`${API_BASE_URL}/payments/customer/balance`, config);
      if (balanceRes.data.success) {
        setCustomerBalance(balanceRes.data.balance || 0);
        setTotalReceived(balanceRes.data.total_received || 0);
      }
      
      // Fetch payments history
      const paymentsRes = await axios.get(`${API_BASE_URL}/payments/customer/payments`, config);
      if (paymentsRes.data.success) {
        setPayments(paymentsRes.data.payments || []);
      }
      
      // Fetch reminders
      const remindersRes = await axios.get(`${API_BASE_URL}/payments/customer/reminders`, config);
      if (remindersRes.data.success) {
        setReminders(remindersRes.data.reminders || []);
      }
      
      // Fetch summary
      const summaryRes = await axios.get(`${API_BASE_URL}/payments/customer/upcoming-summary`, config);
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
      
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (reminder) => {
    if (!window.confirm(`Pay ${formatCurrency(reminder.premium_amount)} for ${reminder.plan_name || reminder.policy_type} policy?`)) {
      return;
    }
    
    setProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const config = getAxiosConfig();
      const response = await axios.post(
        `${API_BASE_URL}/payments/customer/process-payment`,
        {
          policyId: reminder.policy_id,
          amount: reminder.premium_amount,
          paymentMethod: 'card',
          reminderId: reminder.reminder_id
        },
        config
      );
      
      if (response.data.success) {
        setSuccessMessage(`Payment of ${formatCurrency(reminder.premium_amount)} completed successfully!`);
        fetchData(); // Refresh all data
      } else {
        setError(response.data.error || 'Payment failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || 'Payment processing failed');
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (amount > customerBalance) {
      alert(`Insufficient balance. Available balance: ${formatCurrency(customerBalance)}`);
      return;
    }
    
    setWithdrawLoading(true);
    setError(null);
    
    try {
      const config = getAxiosConfig();
      const response = await axios.post(
        `${API_BASE_URL}/payments/customer/withdraw`,
        { amount: amount },
        config
      );
      
      if (response.data.success) {
        setSuccessMessage(`Withdrawal request of ${formatCurrency(amount)} submitted successfully!`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        fetchData(); // Refresh balance
      } else {
        setError(response.data.error || 'Withdrawal failed');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err.response?.data?.error || 'Withdrawal processing failed');
    } finally {
      setWithdrawLoading(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Completed</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status || 'Unknown'}</span>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading payment information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {successMessage}
          </p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </p>
        </div>
      )}

      {/* Summary Cards - Now 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Available Balance Card - NEW */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 shadow-sm border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-gray-600 font-medium">Available Balance</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(customerBalance)}</div>
          <div className="text-sm text-gray-500 mt-1">From approved claims</div>
          {customerBalance > 0 && (
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              Withdraw Funds →
            </button>
          )}
        </div>

        {/* Total Received Card - NEW */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-gray-600">Total Received</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalReceived)}</div>
          <div className="text-sm text-gray-500 mt-1">From all claim payouts</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-gray-600">Reminders</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.reminders_count}</div>
          <div className="text-sm text-gray-500 mt-1">Active payment reminders</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-gray-600">Last Payment</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.last_payment_date ? formatDate(summary.last_payment_date) : 'No payments'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Most recent payment</div>
        </div>
      </div>

      {/* Payment Reminders Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-sky-600" />
          Payment Reminders
        </h3>
        
        {reminders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active payment reminders</p>
            <p className="text-gray-400 text-sm mt-1">Your agent will create reminders for upcoming payments</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((reminder) => (
              <div key={reminder.reminder_id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{reminder.plan_name || reminder.policy_type}</h4>
                    <p className="text-sm text-gray-600">Policy #{reminder.policy_id}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    {reminder.reminder_type || 'Payment'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Due Date</span>
                    <span className="font-medium text-gray-900">{formatDate(reminder.reminder_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-bold text-sky-600">{formatCurrency(reminder.premium_amount)}</span>
                  </div>
                  {reminder.agent_first_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Agent</span>
                      <span className="text-gray-700">{reminder.agent_first_name} {reminder.agent_last_name}</span>
                    </div>
                  )}
                  {reminder.message && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                      {reminder.message}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handlePayNow(reminder)}
                  disabled={processing}
                  className="w-full mt-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-sky-600" />
          Payment History
        </h3>
        
        {payments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No payment history</p>
            <p className="text-gray-400 text-sm mt-1">Your payment transactions will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(payment.paid_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{payment.plan_name || payment.policy_type}</td>
                    <td className="px-6 py-4 text-sm font-medium text-sky-600">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{payment.method || 'card'}</td>
                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{payment.transaction_ref?.substring(0, 12)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Withdraw Funds</h3>
            <p className="text-gray-600 mb-4">
              Available Balance: <span className="font-bold text-green-600">{formatCurrency(customerBalance)}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Withdraw</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                max={customerBalance}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {withdrawLoading ? 'Processing...' : 'Request Withdrawal'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Withdrawal requests will be processed within 3-5 business days.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentPanel;