// src/components/AdminDashboard/AccountsManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, User, Briefcase, Building, Mail, Edit, Trash2,
  AlertCircle, Search, Filter, RefreshCw, XCircle, Save
} from 'lucide-react';
import { auditLogger } from '../../utils/auditLogger';
import { API_BASE_URL, getAxiosConfig } from '../../config';

// 1. Accounts Management Component with Database Integration
function AccountsManagement() {
  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create' or 'edit'
  const [editingAccount, setEditingAccount] = useState(null);
  
  // Database state
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password_hash: '',
    status: 'active',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    gender: '',
    dob: '',
    commission_rate: '',
    license_number: '',
    specialization: '',
    contact_person: '',
    registration_number: '',
    total_sales: ''
  });

  const validateForm = () => {
  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;  // Fixed: removed unnecessary escape
  const zipRegex = /^\d{5}(-\d{4})?$/;
  
  // Common validations
  if (!formData.name.trim()) errors.name = 'Name is required';
  if (!formData.email.trim()) errors.email = 'Email is required';
  else if (!emailRegex.test(formData.email)) errors.email = 'Invalid email format';
  
  if (formData.phone && !phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
    errors.phone = 'Invalid phone number';
  }
  
  // Customer-specific validations
  if (activeTab === 'customers') {
    if (modalType === 'create' && !formData.password_hash) {
      errors.password_hash = 'Password is required';
    }
    if (formData.password_hash && formData.password_hash.length < 6) {
      errors.password_hash = 'Password must be at least 6 characters';
    }
    if (formData.dob && new Date(formData.dob) > new Date()) {
      errors.dob = 'Date of birth cannot be in the future';
    }
    if (formData.zip_code && !zipRegex.test(formData.zip_code)) {
      errors.zip_code = 'Invalid ZIP code format';
    }
  }
  
  // Agent-specific validations
  if (activeTab === 'agents') {
    if (modalType === 'create' && !formData.password_hash) {
      errors.password_hash = 'Password is required';
    }
    if (formData.password_hash && formData.password_hash.length < 6) {
      errors.password_hash = 'Password must be at least 6 characters';
    }
    if (formData.commission_rate) {
      const commission = parseFloat(formData.commission_rate);
      if (isNaN(commission) || commission < 0 || commission > 100) {
        errors.commission_rate = 'Commission must be between 0 and 100';
      }
    }
    if (formData.total_sales && parseFloat(formData.total_sales) < 0) {
      errors.total_sales = 'Total sales cannot be negative';
    }
    if (formData.gender && modalType === 'create') {
      errors.gender = 'Gender is required';
    }
  }
  
  // Hospital-specific validations
  if (activeTab === 'hospitals') {
    if (formData.zip_code && !zipRegex.test(formData.zip_code)) {
      errors.zip_code = 'Invalid ZIP code format';
    }
  }
  
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
const fetchData = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const config = getAxiosConfig();
    console.log('🔧 Fetching data with config:', config);

    // Test connection first
    try {
      const testRes = await axios.get(`${API_BASE_URL}/test`, config);
      console.log('✅ Backend test response:', testRes.data);
    } catch (testErr) {
      console.error('❌ Backend test failed:', testErr.message);
    }

    // Fetch all data in parallel
    const [customersRes, agentsRes, hospitalsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/accounts/customers`, config).catch(err => {
        console.error('Customers fetch error:', err.response?.data || err.message);
        throw err;
      }),
      axios.get(`${API_BASE_URL}/accounts/agents`, config).catch(err => {
        console.error('Agents fetch error:', err.response?.data || err.message);
        throw err;
      }),
      axios.get(`${API_BASE_URL}/accounts/hospitals`, config).catch(err => {
        console.error('Hospitals fetch error:', err.response?.data || err.message);
        throw err;
      })
    ]);

    console.log('📊 API Responses:', {
      customers: customersRes.data,
      agents: agentsRes.data,
      hospitals: hospitalsRes.data
    });

    // Extract data from response
    if (customersRes.data.success) {
      setCustomers(customersRes.data.data);
    } else {
      throw new Error(customersRes.data.message);
    }
    
    if (agentsRes.data.success) {
      setAgents(agentsRes.data.data);
    } else {
      throw new Error(agentsRes.data.message);
    }
    
    if (hospitalsRes.data.success) {
      setHospitals(hospitalsRes.data.data);
    } else {
      throw new Error(hospitalsRes.data.message);
    }
    
  } catch (err) {
    console.error('❌ Error fetching data:', err);
    console.error('Full error object:', err);
    console.error('Response data:', err.response?.data);
    console.error('Response status:', err.response?.status);
    
    const errorMessage = err.response?.data?.message || 
                        err.message || 
                        'Failed to load data from server';
    setError(`Error: ${errorMessage}. Please check browser console for details.`);
    
    // Use mock data as fallback
    console.log('🔄 Using mock data as fallback');
    setCustomers(getMockCustomers());
    setAgents(getMockAgents());
    setHospitals(getMockHospitals());
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
  fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); 

  // Mock data for development (fallback)
  const getMockCustomers = () => [
    { 
      id: 1, 
      name: 'John Smith', 
      email: 'john@email.com', 
      phone: '(555) 123-4567', 
      status: 'active', 
      address: '123 Main St', 
      city: 'New York', 
      state: 'NY', 
      zip_code: '10001',
      created_at: '2024-01-15'
    },
    { 
      id: 2, 
      name: 'Sarah Johnson', 
      email: 'sarah@email.com', 
      phone: '(555) 234-5678', 
      status: 'active', 
      address: '456 Oak Ave', 
      city: 'Chicago', 
      state: 'IL', 
      zip_code: '60601',
      created_at: '2024-02-20'
    },
    { 
      id: 3, 
      name: 'Mike Chen', 
      email: 'mike@email.com', 
      phone: '(555) 345-6789', 
      status: 'inactive', 
      address: '789 Pine Rd', 
      city: 'Los Angeles', 
      state: 'CA', 
      zip_code: '90001',
      created_at: '2024-03-10'
    },
  ];

  const getMockAgents = () => [
    { 
      id: 101, 
      name: 'David Wilson', 
      email: 'david@agent.com', 
      phone: '(555) 987-6543', 
      status: 'active', 
      commission_rate: '15%', 
      license_number: 'LIC-001', 
      total_sales: 45000,
      created_at: '2024-01-10'
    },
    { 
      id: 102, 
      name: 'Lisa Brown', 
      email: 'lisa@agent.com', 
      phone: '(555) 876-5432', 
      status: 'active', 
      commission_rate: '12%', 
      license_number: 'LIC-002', 
      total_sales: 32000,
      created_at: '2024-02-15'
    },
    { 
      id: 103, 
      name: 'Tom Harris', 
      email: 'tom@agent.com', 
      phone: '(555) 765-4321', 
      status: 'pending', 
      commission_rate: '10%', 
      license_number: 'LIC-003', 
      total_sales: 18000,
      created_at: '2024-03-01'
    },
  ];

  const getMockHospitals = () => [
    { 
      id: 201, 
      name: 'City General Hospital', 
      email: 'admin@citygeneral.com', 
      phone: '(555) 111-2222', 
      status: 'verified', 
      address: '100 Medical Blvd', 
      city: 'New York', 
      state: 'NY', 
      zip_code: '10002',
      contact_person: 'Dr. James Wilson',
      specialization: 'General, Cardiology',
      created_at: '2024-01-05'
    },
    { 
      id: 202, 
      name: 'Metro Medical Center', 
      email: 'contact@metromedical.com', 
      phone: '(555) 222-3333', 
      status: 'verified', 
      address: '200 Health St', 
      city: 'Chicago', 
      state: 'IL', 
      zip_code: '60602',
      contact_person: 'Dr. Sarah Miller',
      specialization: 'Pediatrics, Surgery',
      created_at: '2024-02-10'
    },
    { 
      id: 203, 
      name: 'Community Health Clinic', 
      email: 'info@communityclinic.com', 
      phone: '(555) 333-4444', 
      status: 'pending', 
      address: '300 Care Ave', 
      city: 'Los Angeles', 
      state: 'CA', 
      zip_code: '90002',
      contact_person: 'Dr. Michael Chen',
      specialization: 'Family Medicine',
      created_at: '2024-03-15'
    },
  ];

  const getCurrentData = () => {
    switch(activeTab) {
      case 'customers': return customers;
      case 'agents': return agents;
      case 'hospitals': return hospitals;
      default: return customers;
    }
  };

  const getCurrentDataSetter = () => {
    switch(activeTab) {
      case 'customers': return setCustomers;
      case 'agents': return setAgents;
      case 'hospitals': return setHospitals;
      default: return setCustomers;
    }
  };

  // Filter data based on search and status
  const filteredData = getCurrentData().filter(account => {
    const matchesSearch = 
      account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.phone?.includes(searchTerm);
    
    const matchesStatus = 
      selectedStatus === 'all' || 
      account.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

const handleCreateAccount = () => {
  setModalType('create');
  
  // Base form data WITHOUT password_hash
  const baseFormData = {
    name: '',
    email: '',
    phone: '',
    status: 'active',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  };
  
  // Add type-specific fields
  switch (activeTab) {
    case 'customers':
      setFormData({
        ...baseFormData,
        password_hash: '', // ADD password for customers
        gender: '',
        dob: '',
      });
      break;
      
    case 'agents':
      setFormData({
        ...baseFormData,
        password_hash: '', // ADD password for agents
        commission_rate: '',
        license_number: '',
        total_sales: ''
      });
      break;
      
    case 'hospitals':
      setFormData({
        ...baseFormData,
        // NO password_hash for hospitals
        registration_number: '',
        contact_person: '',
        specialization: ''
      });
      break;
      
    default:
      setFormData(baseFormData);
  }
  
  setShowModal(true);
};

const handleEditAccount = (account) => {
  setModalType('edit');
  setEditingAccount(account);
  
  // Base form data WITHOUT password_hash
  const baseFormData = {
    name: account.name || '',
    email: account.email || '',
    phone: account.phone || '',
    status: account.status || 'active',
    address: account.address || '',
    city: account.city || '',
    state: account.state || '',
    zip_code: account.zip_code || ''
  };
  
  // Add type-specific fields
  switch (activeTab) {
    case 'customers':
      setFormData({
        ...baseFormData,
        password_hash: '', // Optional password for edit
        gender: account.gender || '',
        dob: account.dob || ''
      });
      break;
      
    case 'agents':
      // Clean up commission rate (remove % if present)
      let commissionRate = account.commission_rate || '';
      if (commissionRate && typeof commissionRate === 'string') {
        commissionRate = commissionRate.replace('%', '');
      }
      
      setFormData({
        ...baseFormData,
        password_hash: '', // Optional password for edit
        commission_rate: commissionRate,
        license_number: account.license_number || '',
        total_sales: account.total_sales || ''
      });
      break;
      
    case 'hospitals':
      setFormData({
        ...baseFormData,
        // NO password_hash for hospitals
        registration_number: account.registration_number || '',
        contact_person: account.contact_person || '',
        specialization: account.specialization || ''
      });
      break;
      
    default:
      setFormData(baseFormData);
  }
  
  setShowModal(true);
};

const deleteAccount = async (id) => {
  if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
    return;
  }

  try {
    const config = getAxiosConfig();
    const response = await axios.delete(`${API_BASE_URL}/accounts/${activeTab}/${id}`, config);
    
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    
    // Update local state
    const setter = getCurrentDataSetter();
    
    // Get account details before deletion for audit log
    const deletedAccount = getCurrentData().find(item => item.id === id);
    
    setter(prev => prev.filter(item => item.id !== id));
    
    await auditLogger.deleteAccount(
        activeTab,
        id,
        {
          account_name: deletedAccount?.name || 'Unknown',
          account_email: deletedAccount?.email || 'Unknown',
          account_type: activeTab,
          deleted_at: new Date().toISOString()
        }
      );
    
    alert(response.data.message || 'Account deleted successfully!');
    fetchData(); // Reload page to reflect changes
  } catch (err) {
    console.error('Error deleting account:', err);
    alert(err.response?.data?.message || err.message || 'Failed to delete account');
  }
};
const handleSubmit = async (e) => {
  e.preventDefault();
  // Validate form before submission
  if (!validateForm()) {
    alert('Please fix form errors before submitting.');
    return;
  }
  try {
    const config = getAxiosConfig();
    console.log('🔄 Submitting form for:', activeTab);
    console.log('📋 Form data:', formData);
    
    // Prepare clean data for API
    const prepareApiData = () => {
      // Start with all form data
      const apiData = { ...formData };
      
      // Remove password_hash if it's empty (for edit mode)
      if (apiData.password_hash === '') {
        delete apiData.password_hash;
      }
      
      // For hospitals, NEVER send password_hash
      if (activeTab === 'hospitals' && apiData.password_hash !== undefined) {
        console.log('⚠️ Removing password_hash for hospital');
        delete apiData.password_hash;
      }
      
      console.log('📤 Cleaned API data:', apiData);
      return apiData;
    };
    
    const apiData = prepareApiData();
    
    // Use activeTab directly (plural)
    const backendType = activeTab; // 'customers', 'agents', 'hospitals'
    console.log('🎯 Backend type:', backendType);
    
    if (modalType === 'create') {
      // CREATE new account
      const postPayload = {
        type: backendType,
        data: apiData
      };
      
      console.log('🚀 Sending POST to:', `${API_BASE_URL}/accounts`);
      console.log('📦 POST payload:', postPayload);
      
      const response = await axios.post(
        `${API_BASE_URL}/accounts`,
        postPayload,
        config
      );
      
      console.log('✅ Response:', response.data);
      
      if (response.data.success) {
        // Update local state
        const setter = getCurrentDataSetter();
        setter(prev => [...prev, response.data.data]);
        // Log the creation
    await auditLogger.createAccount(
          activeTab,
          response.data.data.id,
          {
            account_name: formData.name,
            account_email: formData.email,
            account_type: activeTab,
            status: formData.status
          }
        );
        alert('Account created successfully!');
        setShowModal(false);
        fetchData(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Creation failed');
      }
      
    } else {
      // UPDATE existing account
      console.log(`🚀 Sending PUT to: ${API_BASE_URL}/accounts/${backendType}/${editingAccount.id}`);
      console.log('📦 PUT data:', apiData);
      
      const response = await axios.put(
        `${API_BASE_URL}/accounts/${backendType}/${editingAccount.id}`,
        apiData,
        config
      );
      
      console.log('✅ Response:', response.data);
      
      if (response.data.success) {
        // Update local state
        const setter = getCurrentDataSetter();
        setter(prev => prev.map(item => 
          item.id === editingAccount.id ? { ...item, ...apiData } : item
        ));
        await auditLogger.updateAccount(
          activeTab,
          editingAccount.id,
          {
            account_name: formData.name,
            account_email: formData.email,
            account_type: activeTab,
            status: formData.status,
            changed_fields: Object.keys(formData).filter(key => formData[key] !== editingAccount[key])
          }
        );
        alert('Account updated successfully!');
        setShowModal(false);
        fetchData(); // Refresh data
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
    }
    
  } catch (err) {
    console.error('❌ FULL ERROR DETAILS:');
    console.error('❌ Error object:', err);
    console.error('❌ Error message:', err.message);
    console.error('❌ Error response:', err.response?.data);
    console.error('❌ Error status:', err.response?.status);
    console.error('❌ Error headers:', err.response?.headers);
    console.error('❌ Request config:', err.config);

    await auditLogger.logAuditAction(
      `FAILED_${modalType.toUpperCase()}_${activeTab.toUpperCase()}`,
      activeTab.slice(0, -1),
      modalType === 'edit' ? editingAccount.id : null,
      {
        error: err.response?.data?.message || err.message,
        account_name: formData.name,
        account_type: activeTab
      }
    );
    let errorMessage = 'Failed to save account. ';
    
    if (err.response?.data?.message) {
      errorMessage += `Error: ${err.response.data.message}`;
      
      // Show specific backend error if available
      if (err.response.data.error) {
        errorMessage += `\nDetails: ${err.response.data.error}`;
      }
    } else if (err.response?.data?.error) {
      errorMessage += `Error: ${err.response.data.error}`;
    } else if (err.message) {
      errorMessage += `Error: ${err.message}`;
    }
    
    // Add troubleshooting tips based on common issues
    if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
      errorMessage += '\n\n⚠️ Network issue. Check if backend server is running.';
    }
    
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage += '\n\n⚠️ Authentication issue. Please login again.';
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      errorMessage += '\n\n⚠️ Server error. Check backend console logs.';
    }
    
    alert(errorMessage);
  }
};
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIcon = () => {
    switch(activeTab) {
      case 'customers': return User;
      case 'agents': return Briefcase;
      case 'hospitals': return Building;
      default: return User;
    }
  };

const renderFormFields = () => {
  // Common fields shared by all account types
  const commonFields = (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Name *</label>
          <input
            type="text"
            required
            className={`w-full px-4 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
            value={formData.name}
            onChange={(e) => {
              setFormData({...formData, name: e.target.value});
              if (formErrors.name) setFormErrors({...formErrors, name: ''});
            }}
          />
          {formErrors.name && (
            <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
          )}
        </div>
        <div>
          <label className="block text-gray-700 mb-2">Email *</label>
          <input
            type="email"
            required
            className={`w-full px-4 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
            value={formData.email}
            onChange={(e) => {
              setFormData({...formData, email: e.target.value});
              if (formErrors.email) setFormErrors({...formErrors, email: ''});
            }}
          />
          {formErrors.email && (
            <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Phone</label>
        <input
          type="tel"
          className={`w-full px-4 py-2 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
          value={formData.phone}
          onChange={(e) => {
            setFormData({...formData, phone: e.target.value});
            if (formErrors.phone) setFormErrors({...formErrors, phone: ''});
          }}
        />
        {formErrors.phone && (
          <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
        )}
      </div>
    </>
  );

  // CUSTOMER-SPECIFIC FORM
  if (activeTab === 'customers') {
    return (
      <>
        {commonFields}
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">
              Password {modalType === 'create' ? '*' : ''}
            </label>
            <input
              type="password"
              required={modalType === 'create'}
              className={`w-full px-4 py-2 border ${formErrors.password_hash ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
              value={formData.password_hash}
              onChange={(e) => {
                setFormData({...formData, password_hash: e.target.value});
                if (formErrors.password_hash) setFormErrors({...formErrors, password_hash: ''});
              }}
            />
            {formErrors.password_hash && (
              <p className="text-red-500 text-sm mt-1">{formErrors.password_hash}</p>
            )}
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
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Gender</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Date of Birth</label>
            <input
              type="date"
              className={`w-full px-4 py-2 border ${formErrors.dob ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
              value={formData.dob}
              onChange={(e) => {
                setFormData({...formData, dob: e.target.value});
                if (formErrors.dob) setFormErrors({...formErrors, dob: ''});
              }}
            />
            {formErrors.dob && (
              <p className="text-red-500 text-sm mt-1">{formErrors.dob}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Address</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">City</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">State</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">ZIP Code</label>
          <input
            type="text"
            className={`w-full px-4 py-2 border ${formErrors.zip_code ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
            value={formData.zip_code}
            onChange={(e) => {
              setFormData({...formData, zip_code: e.target.value});
              if (formErrors.zip_code) setFormErrors({...formErrors, zip_code: ''});
            }}
          />
          {formErrors.zip_code && (
            <p className="text-red-500 text-sm mt-1">{formErrors.zip_code}</p>
          )}
        </div>
      </>
    );
  }

  // AGENT-SPECIFIC FORM
  if (activeTab === 'agents') {
    return (
      <>
        {commonFields}
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">
              Password {modalType === 'create' ? '*' : ''}
            </label>
            <input
              type="password"
              required={modalType === 'create'}
              className={`w-full px-4 py-2 border ${formErrors.password_hash ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
              value={formData.password_hash}
              onChange={(e) => {
                setFormData({...formData, password_hash: e.target.value});
                if (formErrors.password_hash) setFormErrors({...formErrors, password_hash: ''});
              }}
            />
            {formErrors.password_hash && (
              <p className="text-red-500 text-sm mt-1">{formErrors.password_hash}</p>
            )}
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
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Gender *</label>
            <select
              required={modalType === 'create'}
              className={`w-full px-4 py-2 border ${formErrors.gender ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
              value={formData.gender}
              onChange={(e) => {
                setFormData({...formData, gender: e.target.value});
                if (formErrors.gender) setFormErrors({...formErrors, gender: ''});
              }}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {formErrors.gender && (
              <p className="text-red-500 text-sm mt-1">{formErrors.gender}</p>
            )}
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Date of Birth</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.dob}
              onChange={(e) => setFormData({...formData, dob: e.target.value})}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Address</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">City</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">State</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">ZIP Code</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.zip_code}
              onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Commission Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              className={`w-full px-4 py-2 border ${formErrors.commission_rate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
              value={formData.commission_rate}
              onChange={(e) => {
                setFormData({...formData, commission_rate: e.target.value});
                if (formErrors.commission_rate) setFormErrors({...formErrors, commission_rate: ''});
              }}
            />
            {formErrors.commission_rate && (
              <p className="text-red-500 text-sm mt-1">{formErrors.commission_rate}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">License Number</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.license_number}
              onChange={(e) => setFormData({...formData, license_number: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Total Sales ($)</label>
            <input
              type="number"
              min="0"
              className={`w-full px-4 py-2 border ${formErrors.total_sales ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
              value={formData.total_sales}
              onChange={(e) => {
                setFormData({...formData, total_sales: e.target.value});
                if (formErrors.total_sales) setFormErrors({...formErrors, total_sales: ''});
              }}
            />
            {formErrors.total_sales && (
              <p className="text-red-500 text-sm mt-1">{formErrors.total_sales}</p>
            )}
          </div>
        </div>
      </>
    );
  }

  // HOSPITAL-SPECIFIC FORM (NO PASSWORD FIELD)
  if (activeTab === 'hospitals') {
    return (
      <>
        {commonFields}
        
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
            <option value="verified">Verified</option>
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Address</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">City</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">State</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">ZIP Code</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border ${formErrors.zip_code ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600`}
              value={formData.zip_code}
              onChange={(e) => {
                setFormData({...formData, zip_code: e.target.value});
                if (formErrors.zip_code) setFormErrors({...formErrors, zip_code: ''});
              }}
            />
            {formErrors.zip_code && (
              <p className="text-red-500 text-sm mt-1">{formErrors.zip_code}</p>
            )}
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Registration Number</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.registration_number}
              onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Contact Person</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.contact_person}
              onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Specialization</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.specialization}
              onChange={(e) => setFormData({...formData, specialization: e.target.value})}
            />
          </div>
        </div>
      </>
    );
  }

  return null;
};

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading account data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accounts Management</h1>
          <p className="text-gray-600">Manage Customers, Agents, and Hospitals</p>
        </div>
        <button 
          onClick={handleCreateAccount}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchData}
            className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
    
      <div className="flex gap-2 mb-6">
  {[
    { key: 'customers', icon: User, count: customers.length },
    { key: 'agents', icon: Briefcase, count: agents.length },
    { key: 'hospitals', icon: Building, count: hospitals.length },
  ].map(({ key, icon: Icon, count }) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
        activeTab === key
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon className="h-5 w-5" />
      {key.charAt(0).toUpperCase() + key.slice(1)}
      <span className="ml-2 text-sm opacity-80">({count})</span>
    </button>
  ))}
</div>


      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              {activeTab === 'hospitals' && <option value="verified">Verified</option>}
            </select>
          </div>

          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
            Refresh
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedStatus !== 'all' 
                ? 'Try adjusting your search filters' 
                : `No ${activeTab} found in the database`}
            </p>
            {!searchTerm && selectedStatus === 'all' && (
              <button 
                onClick={handleCreateAccount}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
                Create your first {activeTab.slice(0, -1)}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">ID</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Name</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Email</th>
                {activeTab === 'agents' && (
                  <>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Commission</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">License</th>
                  </>
                )}
                {activeTab === 'hospitals' && (
                  <>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Location</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-medium">Contact Person</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Created</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((account) => {
                const Icon = getIcon();
                return (
                  <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-600">#{account.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-gray-900 font-medium">{account.name}</div>
                          <div className="text-gray-500 text-sm">
                            {activeTab === 'customers' ? 'Customer' : 
                             activeTab === 'agents' ? 'Agent' : 'Hospital'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {account.email}
                      </div>
                    </td>
                    {activeTab === 'agents' && (
                      <>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{account.commission_rate}%</div>
                          {account.total_sales && (
                            <div className="text-gray-500 text-sm">
                              ${account.total_sales?.toLocaleString()} sales
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {account.license_number || 'N/A'}
                        </td>
                      </>
                    )}
                    {activeTab === 'hospitals' && (
                      <>
                        <td className="px-6 py-4 text-gray-700">
                          {account.city}, {account.state}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {account.contact_person || 'N/A'}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(account.status)}`}>
                        {account.status?.charAt(0).toUpperCase() + account.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {account.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditAccount(account)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deleteAccount(account.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalType === 'create' ? 'Create New ' : 'Edit '}
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-6">
                  {renderFormFields()}
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
                    {modalType === 'create' ? 'Create Account' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AccountsManagement;
