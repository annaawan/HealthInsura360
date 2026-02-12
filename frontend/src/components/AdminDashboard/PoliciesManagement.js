// src/components/AdminDashboard/PoliciesManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, FileText, Edit, Trash2, AlertCircle, Search,
 RefreshCw, XCircle, Save, Tag, Activity, Clock
} from 'lucide-react';
import { API_BASE_URL, getAxiosConfig } from '../../config';



function PoliciesManagement() {
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Form state for create/edit policy plan
  const [formData, setFormData] = useState({
    plan_name: '',
    description: '',
    policy_type: 'health', // Only health insurance
    category: 'basic',
    premium_amount: '',
    coverage_amount: '',
    coverage_details: '',
    deductible: '',
    max_claim_limit: '',
    waiting_period_days: '30',
    renewal_period_months: '12',
    eligibility_criteria: '',
    exclusions: '',
    benefits: '',
    status: 'active'
  });

  // Fetch policy plans from backend
  const fetchPolicyPlans = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const config = getAxiosConfig();
      const response = await axios.get(`${API_BASE_URL}/policy-plans`, config);
      
      if (response.data.success) {
        setPlans(response.data.data);
        console.log(`✅ Found ${response.data.data.length} policy plans`);
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('❌ Error fetching policy plans:', err);
      setError(`Error: ${err.response?.data?.message || err.message}`);
      
      // Use mock data as fallback
      setPlans(getMockPolicyPlans());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicyPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mock data
  const getMockPolicyPlans = () => [
    { 
      plan_id: 1, 
      plan_name: 'Basic Health Plan', 
      description: 'Basic health coverage for individuals',
      policy_type: 'health', 
      category: 'basic',
      premium_amount: 99, 
      coverage_amount: 100000,
      coverage_details: 'Hospitalization, Consultation, Basic Tests',
      deductible: 1000,
      max_claim_limit: 100000,
      waiting_period_days: 30,
      renewal_period_months: 12,
      eligibility_criteria: 'Age 18-60, No pre-existing conditions',
      exclusions: 'Cosmetic surgery, Dental, Vision',
      benefits: 'Annual health checkup, Cashless hospitalization',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    { 
      plan_id: 2, 
      plan_name: 'Family Health Plan', 
      description: 'Comprehensive coverage for entire family',
      policy_type: 'health', 
      category: 'standard',
      premium_amount: 299, 
      coverage_amount: 500000,
      coverage_details: 'Hospitalization, Surgery, Maternity, Dental, Vision',
      deductible: 500,
      max_claim_limit: 500000,
      waiting_period_days: 15,
      renewal_period_months: 12,
      eligibility_criteria: 'Family of 2-6 members, Age 0-65',
      exclusions: 'Experimental treatments',
      benefits: 'Maternity cover, Dental checkup, Vision care',
      status: 'active',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ];

  // Filter plans
  const filteredPlans = plans.filter(plan => {
    const matchesSearch = 
      plan.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      plan.category === selectedCategory;
    
    const matchesStatus = 
      selectedStatus === 'all' || 
      plan.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique values for filters
  const categories = [...new Set(plans.map(p => p.category).filter(Boolean))];

  const handleCreatePlan = () => {
    setModalType('create');
    setFormData({
      plan_name: '',
      description: '',
      policy_type: 'health', // Only health
      category: 'basic',
      premium_amount: '',
      coverage_amount: '',
      coverage_details: '',
      deductible: '',
      max_claim_limit: '',
      waiting_period_days: '30',
      renewal_period_months: '12',
      eligibility_criteria: '',
      exclusions: '',
      benefits: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleEditPlan = (plan) => {
    setModalType('edit');
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name || '',
      description: plan.description || '',
      policy_type: plan.policy_type || 'health', // Only health
      category: plan.category || 'basic',
      premium_amount: plan.premium_amount || '',
      coverage_amount: plan.coverage_amount || '',
      coverage_details: plan.coverage_details || '',
      deductible: plan.deductible || '',
      max_claim_limit: plan.max_claim_limit || '',
      waiting_period_days: plan.waiting_period_days || '30',
      renewal_period_months: plan.renewal_period_months || '12',
      eligibility_criteria: plan.eligibility_criteria || '',
      exclusions: plan.exclusions || '',
      benefits: plan.benefits || '',
      status: plan.status || 'active'
    });
    setShowModal(true);
  };

  const handleViewDetails = (plan) => {
    setViewingPlan(plan);
    setShowViewModal(true);
  };

  const deletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this policy plan? This action cannot be undone.')) {
      return;
    }

    try {
      const config = getAxiosConfig();
      const response = await axios.delete(`${API_BASE_URL}/policy-plans/${id}`, config);
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      
      // Update local state immediately
      setPlans(prev => prev.filter(plan => plan.plan_id !== id));
      
      alert(response.data.message || 'Policy plan deleted successfully!');
      
      // Refresh data to ensure consistency
      fetchPolicyPlans();
    } catch (err) {
      console.error('Error deleting policy plan:', err);
      
      // Specific error handling
      if (err.response?.status === 400) {
        alert(err.response.data.message || 'Cannot delete plan that is in use by existing policies');
      } else if (err.response?.status === 404) {
        alert('Policy plan not found');
      } else {
        alert(err.response?.data?.message || err.message || 'Failed to delete policy plan');
      }
      
      // Refresh to get current state
      fetchPolicyPlans();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const config = getAxiosConfig();
      
      const apiData = {
        plan_name: formData.plan_name,
        description: formData.description,
        policy_type: 'health', // Always health
        category: formData.category,
        premium_amount: parseFloat(formData.premium_amount),
        coverage_amount: parseFloat(formData.coverage_amount),
        coverage_details: formData.coverage_details,
        deductible: parseFloat(formData.deductible) || 0,
        max_claim_limit: parseFloat(formData.max_claim_limit),
        waiting_period_days: parseInt(formData.waiting_period_days),
        renewal_period_months: parseInt(formData.renewal_period_months),
        eligibility_criteria: formData.eligibility_criteria,
        exclusions: formData.exclusions,
        benefits: formData.benefits,
        status: formData.status
      };
      
      if (modalType === 'create') {
        const response = await axios.post(`${API_BASE_URL}/policy-plans`, apiData, config);
        
        if (response.data.success) {
          alert('Policy plan created successfully!');
          setShowModal(false);
          fetchPolicyPlans(); // Refresh data
        } else {
          throw new Error(response.data.message || 'Creation failed');
        }
      } else {
        const response = await axios.put(
          `${API_BASE_URL}/policy-plans/${editingPlan.plan_id}`,
          apiData,
          config
        );
        
        if (response.data.success) {
          alert('Policy plan updated successfully!');
          setShowModal(false);
          fetchPolicyPlans(); // Refresh data
        } else {
          throw new Error(response.data.message || 'Update failed');
        }
      }
    } catch (err) {
      console.error('❌ Error:', err);
      alert(`Failed to save policy plan: ${err.response?.data?.message || err.message}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-green-100 text-green-800';
      case 'premium': return 'bg-yellow-100 text-yellow-800';
      case 'special': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading policy plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Policy Plans Management</h1>
          <p className="text-gray-600">Create and manage health insurance policy plans</p>
        </div>
        <button 
          onClick={handleCreatePlan}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Plan
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchPolicyPlans}
            className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search policy plans..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <button 
            onClick={fetchPolicyPlans}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
            Refresh
          </button>
        </div>
      </div>

      {/* Policy Plans Grid */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No policy plans found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your search filters' 
              : 'No policy plans found in the database'}
          </p>
          {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && (
            <button 
              onClick={handleCreatePlan}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Create your first policy plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div key={plan.plan_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.plan_name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(plan.category)}`}>
                        {plan.category?.charAt(0).toUpperCase() + plan.category?.slice(1)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(plan.status)}`}>
                        {plan.status?.charAt(0).toUpperCase() + plan.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditPlan(plan)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deletePlan(plan.plan_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{plan.description}</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-600 text-sm">Premium</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(plan.premium_amount)}/month
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Coverage</div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(plan.coverage_amount)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-600 text-sm">Deductible</div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(plan.deductible)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-sm">Max Claim</div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(plan.max_claim_limit)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4" />
                      <span>Waiting: {plan.waiting_period_days} days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Renewal: {plan.renewal_period_months} months</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 text-sm">
                        Created: {new Date(plan.created_at).toLocaleDateString()}
                      </div>
                      <button 
                        onClick={() => handleViewDetails(plan)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalType === 'create' ? 'Create New Health Insurance Plan' : 'Edit Health Insurance Plan'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-6 mb-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Plan Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={formData.plan_name}
                        onChange={(e) => setFormData({...formData, plan_name: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Description</label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Category *</label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                          <option value="basic">Basic</option>
                          <option value="standard">Standard</option>
                          <option value="premium">Premium</option>
                          <option value="special">Special</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Status *</label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 border-b pb-2">Financial Details</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Premium Amount ($) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.premium_amount}
                          onChange={(e) => setFormData({...formData, premium_amount: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Coverage Amount ($) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.coverage_amount}
                          onChange={(e) => setFormData({...formData, coverage_amount: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Deductible ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.deductible}
                          onChange={(e) => setFormData({...formData, deductible: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Max Claim Limit ($) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.max_claim_limit}
                          onChange={(e) => setFormData({...formData, max_claim_limit: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Waiting Period (days)</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.waiting_period_days}
                          onChange={(e) => setFormData({...formData, waiting_period_days: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Renewal Period (months)</label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.renewal_period_months}
                          onChange={(e) => setFormData({...formData, renewal_period_months: e.target.value})}
                        >
                          <option value="1">1 Month</option>
                          <option value="3">3 Months</option>
                          <option value="6">6 Months</option>
                          <option value="12">12 Months</option>
                          <option value="24">24 Months</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Coverage & Terms */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 border-b pb-2">Coverage & Terms</h3>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Coverage Details</label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows="3"
                        placeholder="List all covered services and treatments..."
                        value={formData.coverage_details}
                        onChange={(e) => setFormData({...formData, coverage_details: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Eligibility Criteria</label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows="2"
                        placeholder="Age limits, health conditions, etc..."
                        value={formData.eligibility_criteria}
                        onChange={(e) => setFormData({...formData, eligibility_criteria: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Exclusions</label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows="2"
                        placeholder="What is not covered..."
                        value={formData.exclusions}
                        onChange={(e) => setFormData({...formData, exclusions: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Benefits</label>
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows="2"
                        placeholder="Additional benefits and features..."
                        value={formData.benefits}
                        onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="h-5 w-5" />
                    {modalType === 'create' ? 'Create Plan' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && viewingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Policy Plan Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Header */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{viewingPlan.plan_name}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(viewingPlan.category)}`}>
                          {viewingPlan.category?.charAt(0).toUpperCase() + viewingPlan.category?.slice(1)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(viewingPlan.status)}`}>
                          {viewingPlan.status?.charAt(0).toUpperCase() + viewingPlan.status?.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{viewingPlan.description}</p>
                </div>

                {/* Financial Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Financial Details</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="text-gray-600 text-sm">Premium Amount</div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(viewingPlan.premium_amount)} per month
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-sm">Coverage Amount</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(viewingPlan.coverage_amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-sm">Deductible</div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(viewingPlan.deductible)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-sm">Max Claim Limit</div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(viewingPlan.max_claim_limit)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Policy Terms</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="text-gray-600 text-sm">Waiting Period</div>
                        <div className="font-medium text-gray-900">
                          {viewingPlan.waiting_period_days} days
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-sm">Renewal Period</div>
                        <div className="font-medium text-gray-900">
                          {viewingPlan.renewal_period_months} months
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-sm">Created Date</div>
                        <div className="font-medium text-gray-900">
                          {new Date(viewingPlan.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-sm">Last Updated</div>
                        <div className="font-medium text-gray-900">
                          {new Date(viewingPlan.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coverage Details */}
                {viewingPlan.coverage_details && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Coverage Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line">{viewingPlan.coverage_details}</p>
                    </div>
                  </div>
                )}

                {/* Eligibility Criteria */}
                {viewingPlan.eligibility_criteria && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Eligibility Criteria</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line">{viewingPlan.eligibility_criteria}</p>
                    </div>
                  </div>
                )}

                {/* Exclusions */}
                {viewingPlan.exclusions && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Exclusions</h4>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-700 whitespace-pre-line">{viewingPlan.exclusions}</p>
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {viewingPlan.benefits && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Benefits</h4>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-700 whitespace-pre-line">{viewingPlan.benefits}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowViewModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewModal(false);
                      handleEditPlan(viewingPlan);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PoliciesManagement;