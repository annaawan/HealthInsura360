import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Logo from "../assets/HealthInsura360.png";
import { auditLogger } from '../utils/auditLogger';
import {
  LogOut,
  Menu,
  Bell,
  User,
  FileText,
  ShoppingCart,
  RefreshCw,
  Download,
  AlertCircle,
  ChevronDown,
  Edit,
  Eye,
  Printer,
  Heart,
  DollarSign,
  Check,
  X,
  ClipboardList,
  Calendar,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// API configuration
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

// ==================== POLICY MANAGEMENT COMPONENT ====================
function PoliciesSection() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showPolicyDetail, setShowPolicyDetail] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const response = await axios.get(`${API_BASE_URL}/policies/customer`, config);
      if (response.data.success) {
        setPolicies(response.data.data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to fetch policies');
      // Mock data for demo
      setPolicies([
        {
          id: 1,
          policy_number: 'HI360-2024-001',
          plan_name: 'Premium Health Coverage',
          status: 'active',
          start_date: '2024-01-15',
          end_date: '2025-01-15',
          premium: 5000,
          coverage_amount: 500000,
          policy_type: 'Individual'
        },
        {
          id: 2,
          policy_number: 'HI360-2023-045',
          plan_name: 'Basic Health Plan',
          status: 'expiring_soon',
          start_date: '2023-06-10',
          end_date: '2024-12-25',
          premium: 3000,
          coverage_amount: 300000,
          policy_type: 'Family'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const downloadPolicyDoc = (policyId) => {
    console.log('Downloading policy document for:', policyId);
    // Implementation for downloading policy document
    alert('Policy document download initiated');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Policies</h2>
        <button className="w-full sm:w-auto px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors flex items-center justify-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span>Purchase New Policy</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-burgundy-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading policies...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </p>
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No policies found</p>
          <button className="px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700">
            Browse Plans
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {policies.map((policy) => (
            <div key={policy.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{policy.plan_name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{policy.policy_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                    policy.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : policy.status === 'expiring_soon'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {policy.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Coverage Amount</p>
                    <p className="text-base sm:text-lg font-bold text-burgundy-600">${policy.coverage_amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Annual Premium</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">${policy.premium?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Valid From</p>
                    <p className="text-xs sm:text-sm text-gray-900">{new Date(policy.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Valid Till</p>
                    <p className="text-xs sm:text-sm text-gray-900">{new Date(policy.end_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setSelectedPolicy(policy);
                      setShowPolicyDetail(true);
                    }}
                    className="flex-1 px-3 py-2 border border-burgundy-600 text-burgundy-600 rounded-lg hover:bg-burgundy-50 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => downloadPolicyDoc(policy.id)}
                    className="flex-1 px-3 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  {(policy.status === 'active' || policy.status === 'expiring_soon') && (
                    <button className="flex-1 px-3 py-2 bg-burgundy-100 text-burgundy-600 rounded-lg hover:bg-burgundy-200 transition-colors flex items-center justify-center gap-2 text-sm">
                      <RefreshCw className="h-4 w-4" />
                      <span>Renew</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy Details Modal */}
      {showPolicyDetail && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Policy Details</h3>
              <button
                onClick={() => setShowPolicyDetail(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Policy Number</p>
                  <p className="font-semibold text-gray-900">{selectedPolicy.policy_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Plan Name</p>
                  <p className="font-semibold text-gray-900">{selectedPolicy.plan_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Coverage Amount</p>
                  <p className="font-semibold text-burgundy-600">${selectedPolicy.coverage_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Annual Premium</p>
                  <p className="font-semibold text-gray-900">${selectedPolicy.premium?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{selectedPolicy.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-semibold text-gray-900">{selectedPolicy.policy_type}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== CLAIMS SECTION ====================
function ClaimsSection() {
  const [claims, setClaims] = useState([]);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimFormData, setClaimFormData] = useState({
    policy_id: '',
    claim_amount: '',
    claim_date: '',
    description: '',
    documents: []
  });

  const mockClaims = [
    {
      id: 1,
      claim_number: 'CLM-2024-001',
      policy_id: 'HI360-2024-001',
      claim_amount: 25000,
      claim_date: '2024-11-15',
      status: 'approved',
      description: 'Hospital treatment and medicines'
    },
    {
      id: 2,
      claim_number: 'CLM-2024-002',
      policy_id: 'HI360-2024-001',
      claim_amount: 15000,
      claim_date: '2024-12-01',
      status: 'processing',
      description: 'Laboratory tests and consultation'
    }
  ];

  useEffect(() => {
    setClaims(mockClaims);
  }, []);

  const submitClaim = async () => {
    if (!claimFormData.policy_id || !claimFormData.claim_amount) {
      alert('Please fill all required fields');
      return;
    }
    try {
      const config = getAxiosConfig();
      await axios.post(`${API_BASE_URL}/claims`, claimFormData, config);
      alert('Claim submitted successfully');
      setShowClaimForm(false);
      setClaimFormData({
        policy_id: '',
        claim_amount: '',
        claim_date: '',
        description: '',
        documents: []
      });
    } catch (err) {
      alert('Failed to submit claim');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Claims</h2>
        <button
          onClick={() => setShowClaimForm(!showClaimForm)}
          className="px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors flex items-center gap-2"
        >
          <ClipboardList className="h-5 w-5" />
          File New Claim
        </button>
      </div>

      {showClaimForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Reimbursement Claim</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Policy</label>
              <select
                value={claimFormData.policy_id}
                onChange={(e) => setClaimFormData({ ...claimFormData, policy_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
              >
                <option value="">Choose a policy</option>
                <option value="HI360-2024-001">HI360-2024-001 - Premium Health Coverage</option>
                <option value="HI360-2023-045">HI360-2023-045 - Basic Health Plan</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Claim Date</label>
                <input
                  type="date"
                  value={claimFormData.claim_date}
                  onChange={(e) => setClaimFormData({ ...claimFormData, claim_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Claim Amount</label>
                <input
                  type="number"
                  value={claimFormData.claim_amount}
                  onChange={(e) => setClaimFormData({ ...claimFormData, claim_amount: e.target.value })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={claimFormData.description}
                onChange={(e) => setClaimFormData({ ...claimFormData, description: e.target.value })}
                placeholder="Describe the claim..."
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitClaim}
                className="flex-1 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors"
              >
                Submit Claim
              </button>
              <button
                onClick={() => setShowClaimForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {claims.map((claim) => (
          <div key={claim.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900">{claim.claim_number}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    claim.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : claim.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {claim.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{claim.description}</p>
                <p className="text-xs text-gray-500">Filed on {new Date(claim.claim_date).toLocaleDateString()}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-lg font-bold text-burgundy-600">${claim.claim_amount?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== PROFILE SECTION ====================
function ProfileSection() {
  const [showEditForm, setShowEditForm] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    phone: '+92-3001234567',
    address: '123 Main Street',
    city: 'Karachi',
    state: 'Sindh',
    zip_code: '74000'
  });
  const [editFormData, setEditFormData] = useState(profileData);

  const updateProfile = async () => {
    try {
      const config = getAxiosConfig();
      await axios.put(`${API_BASE_URL}/customers/profile`, editFormData, config);
      setProfileData(editFormData);
      setShowEditForm(false);
      alert('Profile updated successfully');
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <button
          onClick={() => setShowEditForm(!showEditForm)}
          className="px-4 py-2 border border-burgundy-600 text-burgundy-600 rounded-lg hover:bg-burgundy-50 transition-colors flex items-center gap-2"
        >
          <Edit className="h-5 w-5" />
          Edit Profile
        </button>
      </div>

      {showEditForm ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={editFormData.state}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={editFormData.zip_code}
                  onChange={(e) => setEditFormData({ ...editFormData, zip_code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={updateProfile}
                className="flex-1 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditFormData(profileData);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-burgundy-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{profileData.name}</h3>
                <p className="text-gray-600">{profileData.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Phone</p>
                <p className="font-semibold text-gray-900">{profileData.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="font-semibold text-gray-900">{profileData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Address</p>
                <p className="font-semibold text-gray-900">{profileData.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">City, State</p>
                <p className="font-semibold text-gray-900">{profileData.city}, {profileData.state} {profileData.zip_code}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== NOTIFICATIONS SECTION ====================
function NotificationsSection() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'claim_approved',
      title: 'Claim Approved',
      message: 'Your claim CLM-2024-001 has been approved. Amount: $25,000',
      date: '2024-12-10',
      read: false
    },
    {
      id: 2,
      type: 'policy_expiring',
      title: 'Policy Expiring Soon',
      message: 'Your policy HI360-2023-045 will expire on 2024-12-25. Renew now to avoid coverage gaps.',
      date: '2024-12-08',
      read: false
    },
    {
      id: 3,
      type: 'payment_received',
      title: 'Payment Received',
      message: 'Your premium payment of $5,000 has been received successfully.',
      date: '2024-12-01',
      read: true
    }
  ]);

  const markAsRead = (id) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No notifications</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                notif.read
                  ? 'bg-white border-gray-200'
                  : 'bg-burgundy-50 border-burgundy-200'
              }`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(notif.date).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="text-gray-400 hover:text-gray-600 ml-4"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== SIDEBAR COMPONENT ====================
function Sidebar({ currentView, setCurrentView, isSidebarOpen, setIsSidebarOpen }) {
  const handleLogout = () => {
    localStorage.removeItem('healthinsura360_token');
    window.location.href = '/login';
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Heart },
    { id: 'policies', label: 'My Policies', icon: FileText },
    { id: 'claims', label: 'My Claims', icon: ClipboardList },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed left-0 top-0 h-screen w-64 bg-burgundy-900 text-white transition-transform duration-300 z-40 lg:translate-x-0 overflow-y-auto`}>
      <div className="p-4 sm:p-6 border-b border-burgundy-800 sticky top-0 bg-burgundy-900">
        <img src={Logo} alt="HealthInsura360" className="h-8 mb-2" />
        <h1 className="text-lg sm:text-xl font-bold break-words">HealthInsura360</h1>
      </div>
      
      <nav className="flex-1 p-4 sm:p-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-burgundy-700 text-white'
                  : 'text-burgundy-100 hover:bg-burgundy-800'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 sm:p-6 border-t border-burgundy-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-burgundy-700 hover:bg-burgundy-600 text-white rounded-lg transition-colors text-sm sm:text-base"
        >
          <LogOut className="h-5 w-5" />
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Log out</span>
        </button>
      </div>
    </div>
  );
}

// ==================== MAIN DASHBOARD COMPONENT ====================
export function CustomerDashboard() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = 2; // Example count

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardOverviewSection />;
      case 'policies':
        return <PoliciesSection />;
      case 'claims':
        return <ClaimsSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'profile':
        return <ProfileSection />;
      default:
        return <DashboardOverviewSection />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 relative z-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-gray-900 flex-shrink-0"
              >
                <Menu className="h-5 sm:h-6 w-5 sm:w-6" />
              </button>
              <h1 className="text-lg sm:text-2xl font-bold text-burgundy-900 truncate">HealthInsura360</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1 sm:p-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
                >
                  <Bell className="h-5 sm:h-6 w-5 sm:w-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-burgundy-600 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3 sm:p-4 z-50">
                    <h3 className="font-semibold text-gray-900 mb-3">Recent Notifications</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <p className="text-sm text-gray-600">Your policy renewal is due soon</p>
                      <p className="text-sm text-gray-600">Claim CLM-2024-001 approved</p>
                    </div>
                  </div>
                )}
              </div>
              <button className="w-9 sm:w-10 h-9 sm:h-10 bg-burgundy-100 rounded-full flex items-center justify-center text-burgundy-600 flex-shrink-0">
                <User className="h-5 sm:h-6 w-5 sm:w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {renderView()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD OVERVIEW SECTION ====================
function DashboardOverviewSection() {
  const mockPolicies = [
    { id: 1, plan_name: 'Premium Health Coverage', status: 'active', premium: 5000, coverage: 500000 },
    { id: 2, plan_name: 'Basic Health Plan', status: 'expiring_soon', premium: 3000, coverage: 300000 }
  ];

  const mockClaims = [
    { status: 'approved', count: 2 },
    { status: 'processing', count: 1 },
    { status: 'rejected', count: 0 }
  ];

  const claimsData = mockClaims;
  const chartData = [
    { name: 'Approved', value: 2, color: '#10b981' },
    { name: 'Processing', value: 1, color: '#3b82f6' },
    { name: 'Rejected', value: 0, color: '#ef4444' }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-burgundy-600 to-burgundy-800 rounded-lg p-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-2">Welcome back, Ahmed Hassan!</h1>
        <p className="text-burgundy-100">Manage your health insurance policies with ease</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Active</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">2</div>
          <div className="text-gray-600 text-sm mt-1">Active Policies</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">1</div>
          <div className="text-gray-600 text-sm mt-1">Claims Processing</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">$8,000</div>
          <div className="text-gray-600 text-sm mt-1">Annual Premium</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Coverage</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">$8L</div>
          <div className="text-gray-600 text-sm mt-1">Total Coverage</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims Overview */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Policies */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Policies</h3>
          <div className="space-y-4">
            {mockPolicies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{policy.plan_name}</p>
                  <p className="text-sm text-gray-600">${policy.premium.toLocaleString()} / year</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  policy.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {policy.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center">
          <ShoppingCart className="h-8 w-8 text-burgundy-600 mx-auto mb-2" />
          <p className="font-medium text-gray-900">Buy Policy</p>
        </button>
        <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center">
          <RefreshCw className="h-8 w-8 text-burgundy-600 mx-auto mb-2" />
          <p className="font-medium text-gray-900">Renew Policy</p>
        </button>
        <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center">
          <ClipboardList className="h-8 w-8 text-burgundy-600 mx-auto mb-2" />
          <p className="font-medium text-gray-900">File Claim</p>
        </button>
        <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center">
          <Download className="h-8 w-8 text-burgundy-600 mx-auto mb-2" />
          <p className="font-medium text-gray-900">Download Docs</p>
        </button>
      </div>
    </div>
  );
}
