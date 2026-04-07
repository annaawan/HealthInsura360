// ==================== ALL IMPORTS ====================
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePayment from './Payment/StripePayment';
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

// ==================== CONSTANTS & HELPERS ====================
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Currency formatter
const formatCurrency = (amount) => {
  if (!amount) return 'Rs. 0';
  return `Rs. ${Math.floor(amount).toLocaleString('en-PK')}`;
};

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const getAxiosConfig = () => {
  const token = localStorage.getItem('healthinsura360_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// ==================== POLICIES SECTION ====================
function PoliciesSection({ setCurrentView, refreshTrigger = 0 }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showPolicyDetail, setShowPolicyDetail] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedRenewalPolicy, setSelectedRenewalPolicy] = useState(null);
  const [renewalData, setRenewalData] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchPolicies();
  }, [refreshTrigger]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const response = await axios.get(`${API_BASE_URL}/policies/my-policies`, config);
      if (response.data.success) {
        setPolicies(response.data.policies || []);
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
    alert('Policy document download initiated');
  };

  const handleRenewal = async () => {
    if (!renewalData.startDate || !renewalData.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      const config = getAxiosConfig();
      await axios.post(`${API_BASE_URL}/policies/renew`, {
        policyId: selectedRenewalPolicy.id,
        startDate: renewalData.startDate,
        endDate: renewalData.endDate
      }, config);

      alert('Policy renewal initiated successfully!');
      setShowRenewalModal(false);
      setSelectedRenewalPolicy(null);
      fetchPolicies();
    } catch (err) {
      console.error('Error renewing policy:', err);
      alert('Failed to renew policy. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Policies</h2>
        <button 
          onClick={() => setCurrentView('buy-policies')}
          className="w-full sm:w-auto px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors flex items-center justify-center gap-2">
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
          <p className="text-gray-600 mb-4">You haven't purchased any policies yet</p>
          <button 
            onClick={() => setCurrentView('buy-policies')}
            className="px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors">
            Browse Plans
          </button>
        </div>
      ) : (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Your Purchased Policies</p>
            <p className="text-green-700 text-sm">These are the policies you have purchased and own</p>
          </div>
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
                    <p className="text-base sm:text-lg font-bold text-burgundy-600">{formatCurrency(policy.coverage_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Annual Premium</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(policy.premium)}</p>
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
                    <button 
                      onClick={() => {
                        setSelectedRenewalPolicy(policy);
                        setRenewalData({
                          startDate: policy.end_date,
                          endDate: ''
                        });
                        setShowRenewalModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-burgundy-100 text-burgundy-600 rounded-lg hover:bg-burgundy-200 transition-colors flex items-center justify-center gap-2 text-sm">
                      <RefreshCw className="h-4 w-4" />
                      <span>Renew</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
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
                  <p className="font-semibold text-burgundy-600">{formatCurrency(selectedPolicy.coverage_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Annual Premium</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(selectedPolicy.premium)}</p>
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

      {/* Renewal Modal */}
      {showRenewalModal && selectedRenewalPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Renew {selectedRenewalPolicy.plan_name}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Expiry Date</label>
                <input
                  type="date"
                  value={selectedRenewalPolicy.end_date}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Start Date</label>
                <input
                  type="date"
                  value={renewalData.startDate}
                  onChange={(e) => setRenewalData({ ...renewalData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New End Date</label>
                <input
                  type="date"
                  value={renewalData.endDate}
                  onChange={(e) => setRenewalData({ ...renewalData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Annual Premium: {formatCurrency(selectedRenewalPolicy.premium)}</p>
                <p className="text-sm text-gray-600">Coverage: {formatCurrency(selectedRenewalPolicy.coverage_amount)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRenewalModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRenewal}
                className="flex-1 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors font-medium"
              >
                Renew Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== BUY POLICIES SECTION ====================
function BuyPoliciesSection({ onBack }) {
  const [availablePolicies, setAvailablePolicies] = useState([]);
  const [customerPolicies, setCustomerPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseData, setPurchaseData] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchPlansAndCustomerPolicies();
  }, []);

  const fetchPlansAndCustomerPolicies = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      
      // Fetch all available plans
      const plansResponse = await axios.get(`${API_BASE_URL}/policies/plans`, config);
      const allPlans = plansResponse.data.plans || [];

      // Fetch customer's current policies
      const customerResponse = await axios.get(`${API_BASE_URL}/policies/my-policies`, config);
      const customerPolicyList = customerResponse.data.policies || [];
      setCustomerPolicies(customerPolicyList);

      // Filter out plans the customer already has
      const purchasedPlanIds = new Set(customerPolicyList.map(p => p.plan_id));
      const available = allPlans.filter(plan => !purchasedPlanIds.has(plan.plan_id));

      setAvailablePolicies(available);
      setError(null);
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to load available policies');
    } finally {
      setLoading(false);
    }
  };

const handlePurchaseClick = (plan) => {
  // Get today's date
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  
  // Calculate end date (1 year from today)
  const endDate = new Date(today);
  endDate.setFullYear(endDate.getFullYear() + 1);
  const endDateStr = endDate.toISOString().split('T')[0];
  
  console.log('📅 Setting dates:', { startDate, endDate: endDateStr });
  
  setSelectedPlan(plan);
  setPurchaseData({
    startDate: startDate,
    endDate: endDateStr  // ✅ Now this has a value!
  });
  setShowPurchaseForm(true);
};

  // Remove the old handlePurchase function - we'll use Stripe now

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-burgundy-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading available policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          ← Back to My Policies
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Available Policies</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </p>
        </div>
      )}

      {availablePolicies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 font-medium">All Set!</p>
          <p className="text-gray-500">You have purchased all available policies</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePolicies.map((plan) => (
            <div key={plan.plan_id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.plan_name}</h3>
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              
              <div className="space-y-3 mb-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Monthly Premium</span>
                  <span className="font-bold text-burgundy-600">{formatCurrency(plan.premium_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Coverage</span>
                  <span className="font-bold text-gray-900">{formatCurrency(plan.coverage_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Deductible</span>
                  <span className="font-bold text-gray-900">{formatCurrency(plan.deductible || 0)}</span>
                </div>
              </div>

              <button
                onClick={() => handlePurchaseClick(plan)}
                className="w-full px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors font-medium"
              >
                Purchase Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Form Modal with Stripe */}
      {showPurchaseForm && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Purchase {selectedPlan.plan_name}
            </h3>
            
            <Elements stripe={stripePromise}>
              <StripePayment
  policyId={selectedPlan.plan_id}
  amount={selectedPlan.premium_amount}
  policyName={selectedPlan.plan_name}
 onSuccess={async (paymentIntent) => {
  console.log('='.repeat(50));
  console.log('✅ PAYMENT SUCCEEDED');
  console.log('='.repeat(50));
  
  try {
    const config = getAxiosConfig();
    
    // Make sure config has proper JSON headers
    config.headers = {
      ...config.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Create payload with EXPLICIT field names
    const payload = {
      planId: selectedPlan.plan_id,        // Make sure this is a number
      startDate: purchaseData.startDate,    // Make sure this is a string
      endDate: purchaseData.endDate         // Make sure this is a string
    };
    
    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));
    console.log('📤 Headers:', config.headers);
    
    // Log each field individually to verify they exist
    console.log('🔍 planId value:', selectedPlan.plan_id);
    console.log('🔍 startDate value:', purchaseData.startDate);
    console.log('🔍 endDate value:', purchaseData.endDate);
    
    const response = await axios.post(
      `${API_BASE_URL}/policies/purchase`, 
      payload, 
      config
    );
    
    console.log('✅ Policy activated:', response.data);
    alert('Payment successful! Your policy has been activated.');
    setShowPurchaseForm(false);
    setSelectedPlan(null);
    onBack();
    
  } catch (err) {
    console.error('❌ Activation error:', err);
    console.error('❌ Response data:', err.response?.data);
    alert(`Payment succeeded but policy activation failed: ${err.response?.data?.error}`);
  }
}}
  onCancel={() => {
    setShowPurchaseForm(false);
    setSelectedPlan(null);
  }}
/>
          </Elements>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== CLAIMS SECTION WITH DOCUMENT UPLOAD ====================
function ClaimsSection({ customerPolicies = [] }) {
  const [claims, setClaims] = useState([]);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const [claimFormData, setClaimFormData] = useState({
    policy_id: '',
    patient_name: '',
    hospital_name: '',
    diagnosis: '',
    service_date: '',
    claim_amount: '',
    description: '',
    documents: []
  });

  const mockClaims = [
    {
      id: 1,
      claim_number: 'CLM-2024-001',
      policy_id: 'HI360-2024-001',
      patient_name: 'John Doe',
      hospital_name: 'City Hospital',
      diagnosis: 'Viral Fever',
      claim_amount: 25000,
      service_date: '2024-11-15',
      status: 'approved',
      description: 'Hospital treatment and medicines',
      documents: [
        { filename: 'bill.pdf', originalName: 'hospital_bill.pdf', url: '/uploads/claims/bill.pdf' }
      ]
    },
    {
      id: 2,
      claim_number: 'CLM-2024-002',
      policy_id: 'HI360-2024-001',
      patient_name: 'John Doe',
      hospital_name: 'Medical Center',
      diagnosis: 'Lab Tests',
      claim_amount: 15000,
      service_date: '2024-12-01',
      status: 'processing',
      description: 'Laboratory tests and consultation',
      documents: []
    }
  ];

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const response = await axios.get(`${API_BASE_URL}/claims/my-claims`, config);
      if (response.data.success) {
        setClaims(response.data.claims || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching claims:', err);
      setClaims(mockClaims);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClaimFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const validFiles = files.filter(file => allowedTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
      alert('Only PDF, JPEG, PNG, GIF, DOC, DOCX files are allowed');
      return;
    }

    // Validate file size (max 10MB each)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validSizeFiles = validFiles.filter(file => file.size <= maxSize);
    
    if (validSizeFiles.length !== validFiles.length) {
      alert('Each file must be less than 10MB');
      return;
    }

    // Create preview of selected files
    const filePreviews = validSizeFiles.map(file => ({
      file: file,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setUploadedFiles(filePreviews);
    setClaimFormData(prev => ({
      ...prev,
      documents: validSizeFiles
    }));
  };

  const removeFile = (index) => {
    const updatedFiles = [...uploadedFiles];
    if (updatedFiles[index].preview) {
      URL.revokeObjectURL(updatedFiles[index].preview);
    }
    updatedFiles.splice(index, 1);
    setUploadedFiles(updatedFiles);
    
    const updatedFileObjects = [...claimFormData.documents];
    updatedFileObjects.splice(index, 1);
    setClaimFormData(prev => ({
      ...prev,
      documents: updatedFileObjects
    }));
  };

  const validateForm = () => {
    if (!claimFormData.policy_id) {
      alert('Please select a policy');
      return false;
    }
    if (!claimFormData.patient_name) {
      alert('Please enter patient name');
      return false;
    }
    if (!claimFormData.hospital_name) {
      alert('Please enter hospital name');
      return false;
    }
    if (!claimFormData.service_date) {
      alert('Please select service date');
      return false;
    }
    if (!claimFormData.claim_amount || parseFloat(claimFormData.claim_amount) <= 0) {
      alert('Please enter a valid claim amount');
      return false;
    }
    return true;
  };

  const submitClaim = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('healthinsura360_token');
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append all form fields
      formData.append('policy_id', claimFormData.policy_id);
      formData.append('patient_name', claimFormData.patient_name);
      formData.append('hospital_name', claimFormData.hospital_name);
      formData.append('diagnosis', claimFormData.diagnosis || '');
      formData.append('service_date', claimFormData.service_date);
      formData.append('claim_amount', claimFormData.claim_amount);
      formData.append('description', claimFormData.description || '');
      
      // Append documents
      claimFormData.documents.forEach(file => {
        formData.append('documents', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/claims/submit`,
        formData,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          }
        }
      );

      if (response.data.success) {
        alert('Claim submitted successfully!');
        setShowClaimForm(false);
        setClaimFormData({
          policy_id: '',
          patient_name: '',
          hospital_name: '',
          diagnosis: '',
          service_date: '',
          claim_amount: '',
          description: '',
          documents: []
        });
        setUploadedFiles([]);
        setUploadProgress(0);
        fetchClaims();
      }
    } catch (err) {
      console.error('Error submitting claim:', err);
      alert(err.response?.data?.error || 'Failed to submit claim');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getDocumentIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return '🖼️';
    } else if (ext === 'pdf') {
      return '📄';
    } else if (['doc', 'docx'].includes(ext)) {
      return '📝';
    }
    return '📎';
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

      {/* Claim Form */}
      {showClaimForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Reimbursement Claim</h3>
          {customerPolicies.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">You need to purchase a policy before filing a claim.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Policy Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Policy <span className="text-red-500">*</span>
                </label>
                <select
                  name="policy_id"
                  value={claimFormData.policy_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                >
                  <option value="">Choose a policy</option>
                  {customerPolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.policy_number} - {policy.plan_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="patient_name"
                    value={claimFormData.patient_name}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospital/Clinic Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="hospital_name"
                    value={claimFormData.hospital_name}
                    onChange={handleInputChange}
                    placeholder="Hospital name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                  />
                </div>
              </div>

              {/* Medical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diagnosis
                  </label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={claimFormData.diagnosis}
                    onChange={handleInputChange}
                    placeholder="Diagnosis"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="service_date"
                    value={claimFormData.service_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                  />
                </div>
              </div>

              {/* Claim Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Claim Amount (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="claim_amount"
                    value={claimFormData.claim_amount}
                    onChange={handleInputChange}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={claimFormData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the claim details, treatment, etc..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>

              {/* Document Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Supporting Documents <span className="text-gray-500 text-xs">(PDF, Images, DOC - Max 10MB each)</span>
                </label>
                
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-burgundy-500 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-burgundy-600 hover:text-burgundy-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-burgundy-500"
                      >
                        <span>Upload files</span>
                        <input
                          id="file-upload"
                          name="documents"
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="sr-only"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, JPEG, PNG, GIF, DOC, DOCX up to 10MB each
                    </p>
                  </div>
                </div>

                {/* Selected Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
                    <ul className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {file.preview ? (
                              <img src={file.preview} alt={file.name} className="h-10 w-10 object-cover rounded" />
                            ) : (
                              <span className="text-2xl">{getDocumentIcon(file.name)}</span>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-700">{file.name}</p>
                              <p className="text-xs text-gray-500">{file.size}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-burgundy-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={submitClaim}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Submitting...' : 'Submit Claim'}
                </button>
                <button
                  onClick={() => {
                    setShowClaimForm(false);
                    setClaimFormData({
                      policy_id: '',
                      patient_name: '',
                      hospital_name: '',
                      diagnosis: '',
                      service_date: '',
                      claim_amount: '',
                      description: '',
                      documents: []
                    });
                    setUploadedFiles([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Claims List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-burgundy-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading claims...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No claims filed yet</p>
        </div>
      ) : (
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
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <p className="text-gray-600">Patient: {claim.patient_name}</p>
                    <p className="text-gray-600">Hospital: {claim.hospital_name}</p>
                    <p className="text-gray-600">Diagnosis: {claim.diagnosis}</p>
                    <p className="text-gray-600">Date: {new Date(claim.service_date).toLocaleDateString()}</p>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{claim.description}</p>
                  
                  {/* Display attached documents */}
                  {claim.documents && claim.documents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Attached Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {claim.documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={`http://localhost:5000${doc.url || doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <span className="mr-1">{getDocumentIcon(doc.filename || doc.originalName)}</span>
                            {doc.originalName || doc.filename}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-burgundy-600">{formatCurrency(claim.claim_amount)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== PROFILE SECTION WITH PICTURE UPLOAD ====================
function ProfileSection() {
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    gender: '',
    dob: '',
    profile_picture: ''
  });
  const [editFormData, setEditFormData] = useState(profileData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const config = getAxiosConfig();
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, config);
      if (response.data.success) {
        const user = response.data.profile || response.data.user || response.data.data;
        const profileData = {
          first_name: user.firstName || user.first_name || '',
          last_name: user.lastName || user.last_name || '',
          email: user.email || '',
          phone: user.phone || '',
          street: user.street || '',
          city: user.city || '',
          state: user.state || '',
          zipcode: user.zipcode || '',
          gender: user.gender || '',
          dob: user.dob || user.dateOfBirth || '',
          profile_picture: user.profile_picture || ''
        };
        setProfileData(profileData);
        setEditFormData(profileData);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const customerName = localStorage.getItem('customerName') || 'Customer';
      setProfileData(prev => ({
        ...prev,
        first_name: customerName.split(' ')[0] || '',
        last_name: customerName.split(' ')[1] || ''
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const updateProfile = async () => {
    try {
      setUploading(true);
      const config = {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('healthinsura360_token')}`,
          'Content-Type': 'multipart/form-data'
        }
      };
      
      const formData = new FormData();
      
      // Append all form fields
      Object.keys(editFormData).forEach(key => {
        if (key !== 'profile_picture' && editFormData[key]) {
          formData.append(key, editFormData[key]);
        }
      });
      
      // Append profile picture if selected
      if (selectedFile) {
        formData.append('profilePicture', selectedFile);
      }

      const response = await axios.put(
        `${API_BASE_URL}/profile/update`,
        formData,
        config
      );

      if (response.data.success) {
        setProfileData(response.data.user);
        setEditFormData(response.data.user);
        setSelectedFile(null);
        setPreviewUrl(null);
        setShowEditForm(false);
        alert('Profile updated successfully');
        
        // Update stored name
        if (response.data.user.first_name) {
          localStorage.setItem('customerName', 
            `${response.data.user.first_name} ${response.data.user.last_name || ''}`.trim()
          );
        }
      }
    } catch (err) {
      console.error('Profile update error:', err);
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeProfilePicture = async () => {
    if (!profileData.profile_picture && !selectedFile) return;
    
    if (selectedFile) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    try {
      const config = getAxiosConfig();
      await axios.delete(`${API_BASE_URL}/profile/picture`, config);
      setProfileData({ ...profileData, profile_picture: '' });
      alert('Profile picture removed');
    } catch (err) {
      console.error('Error removing profile picture:', err);
      alert('Failed to remove profile picture');
    }
  };

  const getProfileImageUrl = () => {
    if (previewUrl) return previewUrl;
    if (profileData.profile_picture) {
      return `http://localhost:5000${profileData.profile_picture}`;
    }
    return null;
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
          
          {/* Profile Picture Upload Section */}
          <div className="mb-6 flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-burgundy-100 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {getProfileImageUrl() ? (
                  <img 
                    src={getProfileImageUrl()} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-12 w-12 text-burgundy-600" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={triggerFileInput}
                className="absolute bottom-0 right-0 w-8 h-8 bg-burgundy-600 rounded-full flex items-center justify-center text-white hover:bg-burgundy-700 transition-colors"
                title="Change profile picture"
              >
                <Edit className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Upload a profile picture (JPEG, PNG, GIF - max 5MB)
              </p>
              {(profileData.profile_picture || selectedFile) && (
                <button
                  type="button"
                  onClick={removeProfilePicture}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Remove picture
                </button>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={editFormData.gender}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={editFormData.dob}
                  onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                value={editFormData.street}
                onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                <input
                  type="text"
                  value={editFormData.zipcode}
                  onChange={(e) => setEditFormData({ ...editFormData, zipcode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-600"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={updateProfile}
              disabled={uploading}
              className={`flex-1 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? 'Uploading...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setShowEditForm(false);
                setEditFormData(profileData);
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {loading ? (
            <p className="text-gray-600">Loading profile...</p>
          ) : (
            <div className="space-y-4">
              {/* Profile Header with Picture */}
              <div className="flex items-center gap-6 pb-4 border-b border-gray-200">
                <div className="w-20 h-20 bg-burgundy-100 rounded-full overflow-hidden border-2 border-burgundy-200">
                  {profileData.profile_picture ? (
                    <img 
                      src={`http://localhost:5000${profileData.profile_picture}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><User class="h-10 w-10 text-burgundy-600" /></div>`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-10 w-10 text-burgundy-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {profileData.first_name} {profileData.last_name}
                  </h3>
                  <p className="text-gray-600">{profileData.email}</p>
                </div>
              </div>
              
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">First Name</p>
                  <p className="font-semibold text-gray-900">{profileData.first_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Last Name</p>
                  <p className="font-semibold text-gray-900">{profileData.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-semibold text-gray-900">{profileData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <p className="font-semibold text-gray-900">{profileData.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gender</p>
                  <p className="font-semibold text-gray-900 capitalize">{profileData.gender || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date of Birth</p>
                  <p className="font-semibold text-gray-900">
                    {profileData.dob ? new Date(profileData.dob).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'Not provided'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Street Address</p>
                  <p className="font-semibold text-gray-900">{profileData.street || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">City</p>
                  <p className="font-semibold text-gray-900">{profileData.city || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">State</p>
                  <p className="font-semibold text-gray-900">{profileData.state || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Zip Code</p>
                  <p className="font-semibold text-gray-900">{profileData.zipcode || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}
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
      message: 'Your claim CLM-2024-001 has been approved. Amount: Rs. 25,000',
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
      message: 'Your premium payment of Rs. 5,000 has been received successfully.',
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
    <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static lg:flex-shrink-0 left-0 top-0 h-screen w-64 bg-burgundy-900 text-white transition-transform duration-300 z-40 overflow-y-auto`}>
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

// ==================== DASHBOARD OVERVIEW SECTION ====================
function DashboardOverviewSection({ customerName = { first_name: '', last_name: '' }, setCurrentView }) {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const config = getAxiosConfig();
      
      // Fetch policies
      const policiesResponse = await axios.get(`${API_BASE_URL}/policies/my-policies`, config);
      if (policiesResponse.data.success) {
        setPolicies(policiesResponse.data.policies || []);
      }

      // Fetch claims
      const claimsResponse = await axios.get(`${API_BASE_URL}/claims/my-claims`, config);
      if (claimsResponse.data.success) {
        setClaims(claimsResponse.data.claims || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Fallback to mock data
      setPolicies([
        { id: 1, plan_name: 'Premium Health Coverage', status: 'active', premium: 5000, coverage: 500000 },
        { id: 2, plan_name: 'Basic Health Plan', status: 'expiring_soon', premium: 3000, coverage: 300000 }
      ]);
      setClaims([
        { id: 1, status: 'approved', amount: 25000 },
        { id: 2, status: 'approved', amount: 15000 },
        { id: 3, status: 'processing', amount: 35000 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const activePolicies = policies.filter(p => p.status === 'active').length;
  const approvedClaims = claims.filter(c => c.status === 'approved').length;
  const pendingClaims = claims.filter(c => c.status === 'processing' || c.status === 'pending').length;
  const totalPremium = policies.reduce((sum, p) => sum + (p.premium || 0), 0);
  const totalCoverage = policies.reduce((sum, p) => sum + (p.coverage_amount || p.coverage || 0), 0);

  const chartData = [
    { name: 'Approved', value: approvedClaims, color: '#10b981' },
    { name: 'Pending', value: pendingClaims, color: '#f59e0b' },
    { name: 'Rejected', value: claims.filter(c => c.status === 'rejected').length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const displayName = customerName.first_name || customerName.last_name 
    ? `${customerName.first_name} ${customerName.last_name}`.trim()
    : 'Guest';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-burgundy-600 to-burgundy-800 rounded-lg p-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-2">Welcome back, {displayName}!</h1>
        <p className="text-burgundy-100">Manage your health insurance policies with ease</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Active</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{activePolicies}</div>
          <div className="text-gray-600 text-sm mt-1">Active Policies</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{pendingClaims}</div>
          <div className="text-gray-600 text-sm mt-1">Claims Processing</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <Check className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Approved</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{approvedClaims}</div>
          <div className="text-gray-600 text-sm mt-1">Approved Claims</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalPremium)}</div>
          <div className="text-gray-600 text-sm mt-1">Annual Premium</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-burgundy-100 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-burgundy-600" />
            </div>
            <span className="text-sm text-gray-600">Coverage</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalCoverage)}</div>
          <div className="text-gray-600 text-sm mt-1">Total Coverage</div>
        </div>
      </div>

      {/* My Claims Card - Dedicated Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims Overview */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Claims Overview</h3>
            <button
              onClick={() => setCurrentView('claims')}
              className="text-burgundy-600 hover:text-burgundy-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ChevronDown className="h-4 w-4 rotate-270" />
            </button>
          </div>
          {claims.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No claims yet</p>
              <button
                onClick={() => setCurrentView('claims')}
                className="mt-3 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors text-sm"
              >
                File Your First Claim
              </button>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
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
              <div className="flex justify-center gap-4 mt-4">
                {chartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Policies */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Policies</h3>
            <button
              onClick={() => setCurrentView('policies')}
              className="text-burgundy-600 hover:text-burgundy-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ChevronDown className="h-4 w-4 rotate-270" />
            </button>
          </div>
          <div className="space-y-4">
            {policies.slice(0, 3).map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{policy.plan_name}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(policy.premium || policy.premium_amount)} / year</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  policy.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : policy.status === 'expiring_soon'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {policy.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
            {policies.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No policies yet</p>
                <button
                  onClick={() => setCurrentView('buy-policies')}
                  className="mt-3 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors text-sm"
                >
                  Browse Plans
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => setCurrentView('buy-policies')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center group hover:border-burgundy-200">
          <ShoppingCart className="h-8 w-8 text-burgundy-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-gray-900">Buy Policy</p>
        </button>
        <button 
          onClick={() => setCurrentView('policies')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center group hover:border-burgundy-200">
          <RefreshCw className="h-8 w-8 text-burgundy-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-gray-900">Renew Policy</p>
        </button>
        <button 
          onClick={() => setCurrentView('claims')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center group hover:border-burgundy-200">
          <ClipboardList className="h-8 w-8 text-burgundy-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-gray-900">File New Claim</p>
        </button>
        <button 
          onClick={() => setCurrentView('claims')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-center group hover:border-burgundy-200">
          <Eye className="h-8 w-8 text-burgundy-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-gray-900">View My Claims</p>
        </button>
      </div>
    </div>
  );
}

// ==================== MAIN DASHBOARD COMPONENT ====================
function CustomerDashboard() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const [customerName, setCustomerName] = useState({ 
    first_name: '', 
    last_name: '', 
    email: '',
    profile_picture: '' 
  });
  const [refreshPolicies, setRefreshPolicies] = useState(0);
  const [policies, setPolicies] = useState([]);

  const unreadNotifications = 2;

  // Handle click outside to close profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch customer profile on mount
  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        const config = getAxiosConfig();
        const response = await axios.get(`${API_BASE_URL}/auth/profile`, config);
        if (response.data.success) {
          const user = response.data.user || response.data.data;
          setCustomerName({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            profile_picture: user.profile_picture || ''
          });
        }
      } catch (err) {
        const storedName = localStorage.getItem('customerName');
        if (storedName) {
          const [first, last] = storedName.split(' ');
          setCustomerName({ 
            first_name: first || '', 
            last_name: last || '', 
            email: '',
            profile_picture: '' 
          });
        }
      }
    };
    fetchCustomerProfile();
  }, []);

  // Fetch customer policies
  useEffect(() => {
    const fetchCustomerPolicies = async () => {
      try {
        const config = getAxiosConfig();
        const response = await axios.get(`${API_BASE_URL}/policies/my-policies`, config);
        if (response.data.success) {
          setPolicies(response.data.policies || []);
        }
      } catch (err) {
        console.error('Error fetching policies:', err);
        setPolicies([]);
      }
    };
    fetchCustomerPolicies();
  }, [refreshPolicies]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardOverviewSection customerName={customerName} setCurrentView={setCurrentView} />;
      case 'policies':
        return <PoliciesSection setCurrentView={setCurrentView} refreshTrigger={refreshPolicies} />;
      case 'buy-policies':
        return <BuyPoliciesSection onBack={() => {
          setCurrentView('policies');
          setRefreshPolicies(prev => prev + 1);
        }} />;
      case 'claims':
        return <ClaimsSection customerPolicies={policies} />;
      case 'notifications':
        return <NotificationsSection />;
      case 'profile':
        return <ProfileSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardOverviewSection customerName={customerName} setCurrentView={setCurrentView} />;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('healthinsura360_token');
    localStorage.removeItem('customerName');
    window.location.href = '/login';
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

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-0">
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
              {/* Notifications */}
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

              {/* Profile Dropdown with Picture Support */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-9 sm:w-10 h-9 sm:h-10 bg-burgundy-100 rounded-full overflow-hidden flex items-center justify-center text-burgundy-600 flex-shrink-0 hover:bg-burgundy-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-burgundy-500"
                >
                  {customerName.profile_picture ? (
                    <img 
                      src={`http://localhost:5000${customerName.profile_picture}`}
                      alt={customerName.first_name || 'Profile'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<svg class="h-5 sm:h-6 w-5 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
                      }}
                    />
                  ) : (
                    <User className="h-5 sm:h-6 w-5 sm:w-6" />
                  )}
                </button>
                
                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-burgundy-100 rounded-full overflow-hidden flex-shrink-0">
                          {customerName.profile_picture ? (
                            <img 
                              src={`http://localhost:5000${customerName.profile_picture}`}
                              alt={customerName.first_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-5 w-5 text-burgundy-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {customerName.first_name} {customerName.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {customerName.email || 'customer@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setCurrentView('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentView('settings');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 mt-1"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
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

// ==================== SETTINGS SECTION ====================
function SettingsSection() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Settings panel coming soon...</p>
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Notification Preferences</h3>
            <p className="text-sm text-gray-600">Email notifications, SMS alerts, etc.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Privacy Settings</h3>
            <p className="text-sm text-gray-600">Data sharing preferences, account privacy</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== EXPORT ====================
export default CustomerDashboard;