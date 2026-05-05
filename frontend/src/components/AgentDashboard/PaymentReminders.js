// frontend/src/components/AgentDashboard/PaymentReminders.js
import React, { useState, useEffect } from 'react';
import { 
  Bell, Calendar, Clock, Repeat, Mail, Phone, 
  Send, Trash2, Edit, Eye, X, CheckCircle, 
  AlertCircle, RefreshCw, Plus, Filter
} from 'lucide-react';
import axios from 'axios';

function PaymentReminders({ agent }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);
  
  // Form state
  const [reminderForm, setReminderForm] = useState({
    customer_id: '',
    policy_id: '',
    reminder_date: '',
    reminder_time: '09:00',
    frequency: 'one-time',
    recurring_end_date: '',
    notification_methods: ['email'],
    message: ''
  });

  // ============================================
  // DATE & TIME VALIDATION HELPERS
  // ============================================
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Get minimum time for today (only future times allowed, with 5 min buffer)
  const getMinTimeForToday = (selectedDate) => {
    const today = getTodayDate();
    
    // If selected date is not today, any time is allowed
    if (selectedDate !== today) {
      return '00:00';
    }
    
    // For today, only allow future times (add 5 min buffer)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes() + 5; // 5 minutes buffer
    
    if (currentMinute >= 60) {
      const nextHour = (currentHour + 1) % 24;
      return `${nextHour.toString().padStart(2, '0')}:00`;
    }
    
    return `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  };
  
  // Check if selected date/time is in the future
  const isDateTimeValid = (date, time) => {
    if (!date || !time) return false;
    const selectedDateTime = new Date(`${date}T${time}`);
    return selectedDateTime > new Date();
  };
  
  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const getAuthToken = () => {
    let token = localStorage.getItem('healthinsura360_token');
    if (!token) token = localStorage.getItem('token');
    return token;
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  });

  // Fetch clients for dropdown
  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/payments/agent/clients', {
        headers: getAuthHeaders()
      });
      if (response.data.success) {
        setClients(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Fetch policies for selected client
  const fetchPoliciesForClient = async (customerId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/payments/agent/clients/${customerId}/policies`, {
        headers: getAuthHeaders()
      });
      if (response.data.success) {
        setPolicies(response.data.policies || []);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  // Fetch all reminders
  const fetchReminders = async () => {
    setLoading(true);
    try {
      const url = filterStatus === 'all' 
        ? 'http://localhost:5000/api/payments/reminders'
        : `http://localhost:5000/api/payments/reminders?status=${filterStatus}`;
      
      const response = await axios.get(url, { headers: getAuthHeaders() });
      if (response.data.success) {
        setReminders(response.data.data);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  };

  // Create reminder with validation
  const handleCreateReminder = async (e) => {
    e.preventDefault();
    
    // ✅ Validate date/time is in the future
    if (!isDateTimeValid(reminderForm.reminder_date, reminderForm.reminder_time)) {
      alert('Please select a future date and time for the reminder.');
      return;
    }
    
    try {
      const response = await axios.post('http://localhost:5000/api/payments/reminders', 
        reminderForm,
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        alert('Reminder created successfully!');
        setShowCreateModal(false);
        setReminderForm({
          customer_id: '',
          policy_id: '',
          reminder_date: '',
          reminder_time: '09:00',
          frequency: 'one-time',
          recurring_end_date: '',
          notification_methods: ['email'],
          message: ''
        });
        fetchReminders();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create reminder');
    }
  };

  // Send reminder now
  const handleSendReminder = async (reminderId) => {
    if (!window.confirm('Send this reminder now?')) return;
    
    setSendingReminder(reminderId);
    try {
      const response = await axios.post(`http://localhost:5000/api/payments/reminders/${reminderId}/send`, 
        {},
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        alert('Reminder sent successfully!');
        fetchReminders();
      } else {
        alert(response.data.message || 'Failed to send reminder');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  // Cancel/Delete reminder
  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      const response = await axios.delete(`http://localhost:5000/api/payments/reminders/${reminderId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        alert('Reminder deleted successfully');
        fetchReminders();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete reminder');
    }
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
  
  // Mark reminder as completed (when client pays offline)
  const handleMarkAsCompleted = async (reminderId, policyId, amount) => {
    const paymentReference = prompt('Enter payment reference number (optional):');
    
    if (!window.confirm(`Mark this reminder as PAID? This will record the payment for policy #${policyId} for $${parseFloat(amount).toLocaleString()}.`)) {
        return;
    }
    
    try {
        const response = await axios.put(
            `http://localhost:5000/api/payments/reminders/${reminderId}/complete`,
            { 
                paymentReference: paymentReference || 'MANUAL_PAYMENT',
                notes: `Payment marked as completed by agent. Reference: ${paymentReference || 'Manual'}`
            },
            { headers: getAuthHeaders() }
        );
        
        if (response.data.success) {
            alert('✅ Payment recorded successfully! Reminder marked as completed.');
            fetchReminders();
        } else {
            alert(response.data.message || 'Failed to mark as completed');
        }
    } catch (error) {
        console.error('Error marking reminder as completed:', error);
        alert(error.response?.data?.message || 'Failed to mark payment as completed');
    }
  };
  
  // Handle client selection change
  const handleClientChange = async (customerId) => {
    setReminderForm({ ...reminderForm, customer_id: customerId, policy_id: '' });
    if (customerId) {
      await fetchPoliciesForClient(customerId);
    } else {
      setPolicies([]);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'sent': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800',
      'completed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get frequency badge
  const getFrequencyBadge = (frequency) => {
    const labels = {
      'one-time': 'One Time',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly'
    };
    return labels[frequency] || frequency;
  };

  useEffect(() => {
    fetchClients();
    fetchReminders();
  }, [filterStatus]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Reminders</h1>
          <p className="text-gray-600">Set and manage payment reminders for your clients</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" /> Create Reminder
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 font-medium ${filterStatus === 'all' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}`}
        >
          All Reminders
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 font-medium ${filterStatus === 'active' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilterStatus('sent')}
          className={`px-4 py-2 font-medium ${filterStatus === 'sent' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}`}
        >
          Sent
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Reminders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reminders...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reminders</h3>
          <p className="text-gray-500">Create your first payment reminder for a client</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reminders.map((reminder) => (
            <div key={reminder.reminder_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(reminder.status)}`}>
                      {reminder.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {getFrequencyBadge(reminder.frequency)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900">
                    {reminder.first_name} {reminder.last_name}
                  </h3>
                  <p className="text-gray-600 text-sm">{reminder.email} | {reminder.phone}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-xs text-gray-500">Policy</div>
                      <div className="text-sm font-medium">#{reminder.policy_id} - {reminder.policy_type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Due Date</div>
                      <div className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(reminder.reminder_date)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Amount</div>
                      <div className="text-sm font-medium">{formatCurrency(reminder.premium_amount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Notification</div>
                      <div className="text-sm font-medium flex items-center gap-1">
                        {reminder.notification_methods?.includes('email') && <Mail className="h-3 w-3" />}
                        {reminder.notification_methods?.includes('sms') && <Phone className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                  
                  {reminder.message && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                      {reminder.message}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  {/* Send Reminder Button (only for active reminders) */}
                  {reminder.status === 'active' && (
                    <button
                      onClick={() => handleSendReminder(reminder.reminder_id)}
                      disabled={sendingReminder === reminder.reminder_id}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Send Reminder Now"
                    >
                      {sendingReminder === reminder.reminder_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  
                  {/* Mark as Paid Button (for active or sent reminders) */}
                  {(reminder.status === 'active' || reminder.status === 'sent') && (
                    <button
                      onClick={() => handleMarkAsCompleted(reminder.reminder_id, reminder.policy_id, reminder.premium_amount)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Mark as Paid (Record Payment)"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Delete Reminder Button */}
                  <button
                    onClick={() => handleDeleteReminder(reminder.reminder_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Payment Reminder</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-purple-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateReminder}>
              <div className="space-y-4">
                {/* Select Client */}
                <div>
                  <label className="block text-gray-700 mb-2">Select Client *</label>
                  <select
                    required
                    value={reminderForm.customer_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Select a client --</option>
                    {clients.map(client => (
                      <option key={client.customer_id} value={client.customer_id}>
                        {client.first_name} {client.last_name} - {client.email}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Select Policy - IMPROVED DISPLAY */}
                <div>
                  <label className="block text-gray-700 mb-2">Select Policy *</label>
                  <select
                    required
                    value={reminderForm.policy_id}
                    onChange={(e) => setReminderForm({...reminderForm, policy_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    disabled={!reminderForm.customer_id}
                  >
                    <option value="">-- Select a policy --</option>
                    {policies.map(policy => (
                      <option key={policy.policy_id} value={policy.policy_id}>
                        Policy #{policy.policy_id} - {policy.plan_name || policy.policy_type} - {formatCurrency(policy.premium_amount)}/month
                      </option>
                    ))}
                  </select>
                  {policies.length === 0 && reminderForm.customer_id && (
                    <p className="text-xs text-amber-600 mt-1">
                      No active policies found for this client
                    </p>
                  )}
                </div>
                
                {/* Reminder Date & Time - WITH VALIDATION */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Reminder Date *</label>
                    <input
                      type="date"
                      required
                      value={reminderForm.reminder_date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setReminderForm({
                          ...reminderForm, 
                          reminder_date: newDate,
                          reminder_time: newDate === getTodayDate() ? getMinTimeForToday(newDate) : reminderForm.reminder_time
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      min={getTodayDate()}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Reminder Time *</label>
                    <input
                      type="time"
                      required
                      value={reminderForm.reminder_time}
                      onChange={(e) => setReminderForm({...reminderForm, reminder_time: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      min={getMinTimeForToday(reminderForm.reminder_date)}
                      step="300"
                    />
                  </div>
                </div>
                
                {/* Warning message for invalid selection */}
                {!isDateTimeValid(reminderForm.reminder_date, reminderForm.reminder_time) && 
                 reminderForm.reminder_date && reminderForm.reminder_time && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please select a future date and time.</span>
                  </div>
                )}
                
                {/* Frequency */}
                <div>
                  <label className="block text-purple-700 mb-2">Frequency</label>
                  <select
                    value={reminderForm.frequency}
                    onChange={(e) => setReminderForm({...reminderForm, frequency: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="one-time">One Time</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                {/* Recurring End Date - With validation */}
                {reminderForm.frequency !== 'one-time' && (
                  <div>
                    <label className="block text-purple-700 mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={reminderForm.recurring_end_date}
                      onChange={(e) => setReminderForm({...reminderForm, recurring_end_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min={reminderForm.reminder_date}
                    />
                    {reminderForm.recurring_end_date && reminderForm.recurring_end_date < reminderForm.reminder_date && (
                      <p className="text-xs text-red-600 mt-1">End date must be after or equal to start date</p>
                    )}
                  </div>
                )}
                
                {/* Notification Methods */}
                <div>
                  <label className="block text-purple-700 mb-2">Notification Methods</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={reminderForm.notification_methods.includes('email')}
                        onChange={(e) => {
                          const methods = e.target.checked
                            ? [...reminderForm.notification_methods, 'email']
                            : reminderForm.notification_methods.filter(m => m !== 'email');
                          setReminderForm({...reminderForm, notification_methods: methods});
                        }}
                        className="rounded"
                      />
                      <Mail className="h-4 w-4" /> Email
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={reminderForm.notification_methods.includes('sms')}
                        onChange={(e) => {
                          const methods = e.target.checked
                            ? [...reminderForm.notification_methods, 'sms']
                            : reminderForm.notification_methods.filter(m => m !== 'sms');
                          setReminderForm({...reminderForm, notification_methods: methods});
                        }}
                        className="rounded"
                      />
                      <Phone className="h-4 w-4" /> SMS (Coming Soon)
                    </label>
                  </div>
                </div>
                
                {/* Custom Message */}
                <div>
                  <label className="block text-purple-700 mb-2">Custom Message (Optional)</label>
                  <textarea
                    rows="3"
                    value={reminderForm.message}
                    onChange={(e) => setReminderForm({...reminderForm, message: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Add a personal message to your client..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Create Reminder
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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

export default PaymentReminders;