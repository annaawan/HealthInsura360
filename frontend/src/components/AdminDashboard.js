import React, { useState, useEffect, useCallback, useMemo} from 'react';
import axios from 'axios';
import Logo from "../assets/HealthInsura360.png";
import { auditLogger} from '../utils/auditLogger';
import { fetchAnalyticsData } from '../services/analyticsServices';
import DateRangePicker from './analytics/DateRangePicker.jsx';
import MetricsGrid from './charts/MetricsGrid.jsx';
// Icons from lucide-react
import { 
  Plus,
  Check, 
  Edit, 
  Building, 
  Mail,
  Phone,
  LayoutDashboard, 
  Users, 
  FileText, 
  Globe,
  Settings, 
  LogOut,
  Shield,
  Menu,
  Bell,
  DollarSign,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  Trash2,
  FileBarChart,
  Activity,
  CreditCard as CreditCardIcon,
  Percent,
  Hospital,
  Archive,
  RefreshCw,
  LineChart,
  Donut,
  BarChart3,
  Table,
  Printer,
  Database,
  Calendar,
  Clock,
  Users as UsersIcon,
  Briefcase,
  User,
  Save,
  XCircle,
  AlertCircle,
  Eye, 
  Tag,
  Sun,
  Info,
  HelpCircle,
} from 'lucide-react';

// Chart components from recharts
import {
  PieChart,
  BarChart,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Pie
} from 'recharts';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Helper function to get axios instance with auth token
const getAxiosConfig = () => {
  const token = localStorage.getItem('healthinsura360_token');
  return {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

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

// Dashboard Overview Component
function DashboardOverview() {
  const [stats] = useState([
    {
      label: 'Total Members',
      value: '45,892',
      change: '+12.5%',
      isPositive: true,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      label: 'Monthly Revenue',
      value: '$2.4M',
      change: '+8.2%',
      isPositive: true,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      label: 'Active Claims',
      value: '1,247',
      change: '-3.1%',
      isPositive: false,
      icon: FileText,
      color: 'bg-orange-500'
    },
    {
      label: 'Growth Rate',
      value: '18.3%',
      change: '+2.4%',
      isPositive: true,
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ]);

  const [monthlyData] = useState([
    { month: 'Jan', users: 40000, revenue: 2100000 },
    { month: 'Feb', users: 42000, revenue: 2150000 },
    { month: 'Mar', users: 43500, revenue: 2200000 },
    { month: 'Apr', users: 45000, revenue: 2250000 },
    { month: 'May', users: 46000, revenue: 2300000 },
    { month: 'Jun', users: 45892, revenue: 2400000 }
  ]);

  const [claimsData] = useState([
    { status: 'Approved', value: 856, color: '#10b981' },
    { status: 'Pending', value: 247, color: '#f59e0b' },
    { status: 'Rejected', value: 144, color: '#ef4444' }
  ]);

  const [recentActivities] = useState([
    { id: 1, action: 'New user registered', user: 'John Smith', time: '5 minutes ago' },
    { id: 2, action: 'Claim approved', user: 'Sarah Johnson', time: '12 minutes ago' },
    { id: 3, action: 'Agent commission paid', user: 'David Wilson', time: '28 minutes ago' },
    { id: 4, action: 'Hospital verified', user: 'City General', time: '1 hour ago' },
    { id: 5, action: 'New complaint received', user: 'Mike Chen', time: '2 hours ago' }
  ]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back, Admin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="text-gray-700">Notifications</span>
          <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">5</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.isPositive ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                  <span className="text-sm">{stat.change}</span>
                </div>
              </div>
              <div className="text-gray-600 text-sm mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claims Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={claimsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, value }) => `${status}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {claimsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">{activity.action}</p>
                  <p className="text-gray-600 text-sm">{activity.user}</p>
                  <p className="text-gray-500 text-xs">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Panel Component 
// function SettingsPanel() {
//   const [activeTab, setActiveTab] = useState("profile");
//   const [darkMode, setDarkMode] = useState(false);

//   const tabs = [
//     { id: "profile", label: "Account & Profile", icon: UsersIcon },
//     { id: "notifications", label: "Notifications", icon: Bell },
//     { id: "security", label: "Privacy & Security", icon: Shield },
//     { id: "appearance", label: "Appearance", icon: Sun },
//     { id: "general", label: "General Info", icon: Info },
//   ];

//   return (
//     <div className="p-8">
//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
//         <p className="text-gray-600">Manage your account settings and preferences</p>
//       </div>

//       <div className="grid lg:grid-cols-4 gap-6">
        
//         {/* Tabs Sidebar */}
//         <div className="lg:col-span-1">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
//             {tabs.map((tab) => {
//               const Icon = tab.icon;
//               return (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveTab(tab.id)}
//                   className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
//                     activeTab === tab.id
//                       ? "bg-blue-50 text-blue-600"
//                       : "text-gray-700 hover:bg-gray-50"
//                   }`}
//                 >
//                   <Icon className="h-5 w-5" />
//                   <span>{tab.label}</span>
//                 </button>
//               );
//             })}
//           </div>
//         </div>

//         {/* Content Area */}
//         <div className="lg:col-span-3">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            
//             {/* -------- Profile Tab -------- */}
//             {activeTab === "profile" && (
//               <div>
//                 <h2 className="text-lg font-semibold text-gray-900 mb-6">Account & Profile</h2>
                
//                 <div className="space-y-6">
//                   {/* Profile Info */}
//                   <div className="grid md:grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-gray-700 mb-2">First Name</label>
//                       <input type="text" defaultValue="Admin" className="w-full px-4 py-2 border rounded-lg"/>
//                     </div>
//                     <div>
//                       <label className="block text-gray-700 mb-2">Last Name</label>
//                       <input type="text" defaultValue="User" className="w-full px-4 py-2 border rounded-lg"/>
//                     </div>
//                   </div>

//                   <div>
//                     <label className="block text-gray-700 mb-2">Email Address</label>
//                     <input type="email" defaultValue="admin@healthinsura360.com" className="w-full px-4 py-2 border rounded-lg"/>
//                   </div>

//                   <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
//                     Save Profile
//                   </button>

//                   {/* Delete Account */}
//                   <div className="pt-6 mt-6 border-t border-gray-200">
//                     <h3 className="text-red-600 font-medium mb-2">Danger Zone</h3>
//                     <p className="text-gray-600 mb-3">Delete your account permanently.</p>
//                     <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
//                       Delete Account
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* -------- Notifications Tab -------- */}
//             {activeTab === "notifications" && (
//               <div>
//                 <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>

//                 <div className="space-y-4">
//                   {["New user registrations", "New claims submitted", "System alerts"].map((item) => (
//                     <label key={item} className="flex items-center gap-3">
//                       <input type="checkbox" defaultChecked className="w-4 h-4"/>
//                       <span>{item}</span>
//                     </label>
//                   ))}
//                 </div>

//                 <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
//                   Save Preferences
//                 </button>
//               </div>
//             )}

//             {/* -------- Security Tab -------- */}
//             {activeTab === "security" && (
//               <div>
//                 <h2 className="text-lg font-semibold text-gray-900 mb-6">Privacy & Security</h2>

//                 <div className="space-y-6">
                  
//                   {/* Change Password */}
//                   <div>
//                     <h3 className="font-medium mb-4">Change Password</h3>
//                     <div className="space-y-4">
//                       <input type="password" placeholder="Current Password" className="w-full px-4 py-2 border rounded-lg"/>
//                       <input type="password" placeholder="New Password" className="w-full px-4 py-2 border rounded-lg"/>
//                     </div>
//                   </div>

//                   <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
//                     Update Password
//                   </button>

//                   {/* Privacy Policy */}
//                   <div className="pt-6 border-t">
//                     <a className="text-blue-600 underline block mb-2" href="/privacy-policy">Privacy Policy</a>
//                     <a className="text-blue-600 underline" href="/terms-of-service">Terms of Service</a>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* -------- Appearance Tab -------- */}
//             {activeTab === "appearance" && (
//               <div>
//                 <h2 className="text-lg font-semibold text-gray-900 mb-6">Appearance & Display</h2>

//                 <div className="flex items-center justify-between">
//                   <span className="text-gray-700">Dark Mode</span>

//                   <button
//                     onClick={() => setDarkMode(!darkMode)}
//                     className={`px-4 py-2 rounded-lg border ${
//                       darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
//                     }`}
//                   >
//                     {darkMode ? "Disable Dark Mode" : "Enable Dark Mode"}
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* -------- General Info Tab -------- */}
//             {activeTab === "general" && (
//               <div>
//                 <h2 className="text-lg font-semibold text-gray-900 mb-6">General Information</h2>

//                 <p className="text-gray-700 mb-3">Version: 1.0.0</p>
//                 <p className="text-gray-700 mb-3">© 2025 HealthInsura360</p>
// <a
//   href="/support"
//   className="text-blue-600 underline flex items-center gap-2 mb-4"
// >
//   <HelpCircle className="w-4 h-4" />
//   Help & Support
// </a>

//               </div>
//             )}

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// Settings Panel Component with Admin Data Fetching, Profile Management, and Security Features
function SettingsPanel() {
  const [activeTab, setActiveTab] = useState("profile");
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Admin profile data state
  const [adminData, setAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    created_at: '',
    last_login: ''
  });
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Validation states
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  const tabs = [
    { id: "profile", label: "Account & Profile", icon: UsersIcon },
    { id: "security", label: "Privacy & Security", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Sun },
    { id: "general", label: "General Info", icon: Info },
  ];

  // ---------------------------
  // Fetch Admin Data from Backend
  // ---------------------------
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const response = await axios.get(`${API_BASE_URL}/accounts/admin/profile`, config);
      
      if (response.data.success) {
        const admin = response.data.data;
        setAdminData({
          first_name: admin.first_name || '',
          last_name: admin.last_name || '',
          email: admin.email || '',
          phone: admin.phone || '',
          position: admin.position || 'Administrator',
          department: admin.department || 'Management',
          created_at: admin.created_at || '',
          last_login: admin.last_login || ''
        });
        
        // Set profile form with current data
        setProfileForm({
          first_name: admin.first_name || '',
          last_name: admin.last_name || '',
          email: admin.email || '',
          phone: admin.phone || ''
        });
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setMessage({
        type: 'error',
        text: 'Failed to load admin profile data'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // ---------------------------
  // Profile Validation
  // ---------------------------
  const validateProfile = () => {
    const errors = {};
    
    if (!profileForm.first_name.trim()) {
      errors.first_name = 'First name is required';
    } else if (profileForm.first_name.length < 2) {
      errors.first_name = 'First name must be at least 2 characters';
    }
    
    if (!profileForm.last_name.trim()) {
      errors.last_name = 'Last name is required';
    } else if (profileForm.last_name.length < 2) {
      errors.last_name = 'Last name must be at least 2 characters';
    }
    
    if (!profileForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (profileForm.phone && !/^[+]?([1-9][\d]{0,15})$/.test(profileForm.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------
  // Password Validation
  // ---------------------------
  const validatePassword = () => {
    const errors = {};
    
    if (!passwordForm.current_password.trim()) {
      errors.current_password = 'Current password is required';
    }
    
    if (!passwordForm.new_password.trim()) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.new_password)) {
      errors.new_password = 'Password must contain uppercase, lowercase, and numbers';
    }
    
    if (!passwordForm.confirm_password.trim()) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------
  // Update Profile Function
  // ---------------------------
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      setMessage({
        type: 'error',
        text: 'Please fix the errors in the form'
      });
      return;
    }
    
    setSaving(true);
    try {
      const config = getAxiosConfig();
      const response = await axios.put(
        `${API_BASE_URL}/accounts/admin/profile`,
        profileForm,
        config
      );
      
      if (response.data.success) {
        // Update admin data with new values
        setAdminData(prev => ({
          ...prev,
          ...profileForm
        }));
        
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!'
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update profile'
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // Change Password Function
  // ---------------------------
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      setMessage({
        type: 'error',
        text: 'Please fix the password errors'
      });
      return;
    }
    
    setSaving(true);
    try {
      const config = getAxiosConfig();
      const response = await axios.put(
        `${API_BASE_URL}/accounts/admin/change-password`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        },
        config
      );
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Password changed successfully!'
        });
        
        // Clear password form
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        
        setPasswordErrors({});
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to change password. Please check your current password.'
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // Delete Account Function
  // ---------------------------
  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    const password = prompt('Please enter your password to confirm account deletion:');
    if (!password) return;
    
    try {
      const config = getAxiosConfig();
      const response = await axios.delete(
        `${API_BASE_URL}/accounts/admin`,
        {
          ...config,
          data: { password }
        }
      );
      
      if (response.data.success) {
        alert('Account deleted successfully. You will be logged out.');
        // Redirect to login or logout
        window.location.href = '/login';
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert(error.response?.data?.message || 'Failed to delete account');
    }
  };

  // ---------------------------
  // Format Date
  // ---------------------------
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ---------------------------
  // Form Field Handlers
  // ---------------------------
  const handleProfileChange = (field, value) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (profileErrors[field]) {
      setProfileErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // ---------------------------
  // Password Strength Indicator
  // ---------------------------
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: 'gray' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['red', 'orange', 'yellow', 'lightgreen', 'green', 'darkgreen'];
    
    return {
      strength: (strength / 6) * 100,
      label: labels[strength - 1] || '',
      color: colors[strength - 1] || 'gray'
    };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Tabs Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMessage({ type: '', text: '' });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            
            {/* -------- Profile Tab -------- */}
            {activeTab === "profile" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Account & Profile</h2>
                
                <form onSubmit={handleUpdateProfile}>
                  <div className="space-y-6">
                    {/* Profile Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={profileForm.first_name}
                          onChange={(e) => handleProfileChange('first_name', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                            profileErrors.first_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          required
                        />
                        {profileErrors.first_name && (
                          <p className="mt-1 text-sm text-red-600">{profileErrors.first_name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={profileForm.last_name}
                          onChange={(e) => handleProfileChange('last_name', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                            profileErrors.last_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          required
                        />
                        {profileErrors.last_name && (
                          <p className="mt-1 text-sm text-red-600">{profileErrors.last_name}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="email" 
                        value={profileForm.email}
                        onChange={(e) => handleProfileChange('email', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                          profileErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {profileErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Phone Number</label>
                      <input 
                        type="tel" 
                        value={profileForm.phone}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                          profileErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="(123) 456-7890"
                      />
                      {profileErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.phone}</p>
                      )}
                    </div>

                    {/* Admin Information (Read-only) */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3">Administrator Information</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Position:</span>
                          <p className="font-medium">{adminData.position}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Department:</span>
                          <p className="font-medium">{adminData.department}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Account Created:</span>
                          <p className="font-medium">{formatDate(adminData.created_at)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Login:</span>
                          <p className="font-medium">{formatDate(adminData.last_login)}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : 'Save Profile Changes'}
                    </button>

                    {/* Delete Account */}
                    <div className="pt-6 mt-6 border-t border-gray-200">
                      <h3 className="text-red-600 font-medium mb-2">Danger Zone</h3>
                      <p className="text-gray-600 mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button 
                        type="button"
                        onClick={handleDeleteAccount}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* -------- Security Tab -------- */}
            {activeTab === "security" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Privacy & Security</h2>

                <form onSubmit={handleChangePassword}>
                  <div className="space-y-6">
                    
                    {/* Change Password */}
                    <div>
                      <h3 className="font-medium mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 mb-2">
                            Current Password <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="password" 
                            value={passwordForm.current_password}
                            onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                            placeholder="Enter your current password"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                              passwordErrors.current_password ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {passwordErrors.current_password && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.current_password}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 mb-2">
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="password" 
                            value={passwordForm.new_password}
                            onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                            placeholder="Enter your new password"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                              passwordErrors.new_password ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {passwordForm.new_password && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full transition-all duration-300"
                                    style={{
                                      width: `${getPasswordStrength(passwordForm.new_password).strength}%`,
                                      backgroundColor: getPasswordStrength(passwordForm.new_password).color
                                    }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-600">
                                  {getPasswordStrength(passwordForm.new_password).label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Must be at least 8 characters with uppercase, lowercase, and numbers
                              </p>
                            </div>
                          )}
                          {passwordErrors.new_password && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.new_password}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 mb-2">
                            Confirm New Password <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="password" 
                            value={passwordForm.confirm_password}
                            onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                            placeholder="Confirm your new password"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                              passwordErrors.confirm_password ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {passwordErrors.confirm_password && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.confirm_password}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Updating Password...
                        </>
                      ) : 'Update Password'}
                    </button>

                    {/* Privacy & Security Links */}
                    <div className="pt-6 border-t">
                      <h3 className="font-medium mb-4">Privacy & Security Information</h3>
                      <div className="space-y-2">
                        <a 
                          href="/privacy-policy" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline flex items-center gap-2 hover:text-blue-800"
                        >
                          <FileText className="w-4 h-4" />
                          Privacy Policy
                        </a>
                        <a 
                          href="/terms-of-service" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline flex items-center gap-2 hover:text-blue-800"
                        >
                          <FileText className="w-4 h-4" />
                          Terms of Service
                        </a>
                        <a 
                          href="/security-policy" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline flex items-center gap-2 hover:text-blue-800"
                        >
                          <Shield className="w-4 h-4" />
                          Security Policy
                        </a>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* -------- Appearance Tab -------- */}
            {activeTab === "appearance" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Appearance & Display</h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Dark Mode</h3>
                      <p className="text-sm text-gray-600">
                        Switch between light and dark theme
                      </p>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        darkMode 
                          ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800" 
                          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Theme Preview</h3>
                    <div className={`p-4 rounded-lg transition-colors ${
                      darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 border'
                    }`}>
                      <p className="mb-2">This is how your interface will look:</p>
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`w-8 h-8 rounded ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}></div>
                        <div className={`w-8 h-8 rounded ${darkMode ? 'bg-green-600' : 'bg-green-500'}`}></div>
                        <div className={`w-8 h-8 rounded ${darkMode ? 'bg-yellow-600' : 'bg-yellow-500'}`}></div>
                      </div>
                      <p className="text-sm opacity-75">
                        {darkMode 
                          ? "Dark theme reduces eye strain in low-light conditions." 
                          : "Light theme provides better readability in well-lit environments."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------- General Info Tab -------- */}
            {activeTab === "general" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">General Information</h2>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3">System Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Application Version:</span>
                          <span className="font-medium">2.1.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Build Date:</span>
                          <span className="font-medium">December 2025</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Environment:</span>
                          <span className="font-medium">Production</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span>support@healthinsura360.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span>+1 (800) 123-4567</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <span>www.healthinsura360.com</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5" />
                      Help & Support
                    </h3>
                    <p className="text-gray-600 mb-3">
                      Need assistance? Our support team is available 24/7 to help you.
                    </p>
                    <div className="flex gap-3">
                      <a
                        href="/support"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Contact Support
                      </a>
                      <a
                        href="/documentation"
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        View Documentation
                      </a>
                    </div>
                  </div>

                  <div className="text-center text-gray-500 text-sm pt-4 border-t">
                    <p>© 2025 HealthInsura360. All rights reserved.</p>
                    <p className="mt-1">Built with ❤️ for better healthcare management</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

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

function Reports() {
  const [selectedReport, setSelectedReport] = useState('monthly');
  const [dateRange, setDateRange] = useState('last-30-days');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reports = [
    { id: 'monthly', name: 'Monthly Performance', icon: Activity, chartType: 'line' },
    { id: 'financial', name: 'Financial Summary', icon: DollarSign, chartType: 'bar' },
    { id: 'claims', name: 'Claims Analysis', icon: FileBarChart, chartType: 'pie' },
    { id: 'user', name: 'User Growth', icon: TrendingUp, chartType: 'line' },
    { id: 'agent', name: 'Agent Performance', icon: UsersIcon, chartType: 'bar' },
    { id: 'hospital', name: 'Hospital Network', icon: Building, chartType: 'doughnut' },
  ];

  // Fetch report data - useCallback to avoid dependency issues
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = getAxiosConfig();
      const res = await axios.get(
        `${API_BASE_URL}/reports/${selectedReport}`,
        {
          ...config,
          params: { range: dateRange }
        }
      );
      
      if (res.data.success) {
        setReportData(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch report data');
      }
    } catch (err) {
      console.error("Error loading report:", err);
      setError(err.response?.data?.message || err.message || 'Failed to load report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange]); // Add dependencies here

  // Export report
  const exportReport = async (format = 'pdf') => {
    try {
      const config = getAxiosConfig();
      const response = await axios.get(
        `${API_BASE_URL}/reports/export/${selectedReport}`,
        {
          ...config,
          params: { 
            range: dateRange,
            format: format 
          },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const currentReport = reports.find(r => r.id === selectedReport);
      const fileName = `${currentReport?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert(`Report exported successfully as ${fileName}`);
    } catch (err) {
      console.error("Error exporting report:", err);
      alert(err.response?.data?.message || 'Failed to export report');
    }
  };

  // Generate sample data for demonstration
  const getSampleChartData = () => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    
    switch (selectedReport) {
      case 'monthly':
      case 'user':
        return {
          labels,
          datasets: [
            {
              label: 'Performance',
              data: [65, 78, 66, 72, 80, 85, 92],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
            }
          ]
        };
      case 'financial':
      case 'agent':
        return {
          labels,
          datasets: [
            {
              label: 'Revenue ($)',
              data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
            }
          ]
        };
      case 'claims':
        return {
          labels: ['Approved', 'Pending', 'Rejected', 'Under Review'],
          datasets: [
            {
              label: 'Claims Status',
              data: [65, 15, 10, 10],
              backgroundColor: [
                'rgba(34, 197, 94, 0.8)',
                'rgba(234, 179, 8, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(59, 130, 246, 0.8)'
              ],
            }
          ]
        };
      case 'hospital':
        return {
          labels: ['Verified', 'Pending', 'Active', 'Inactive'],
          datasets: [
            {
              label: 'Hospital Status',
              data: [45, 20, 25, 10],
              backgroundColor: [
                'rgba(34, 197, 94, 0.8)',
                'rgba(234, 179, 8, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(107, 114, 128, 0.8)'
              ],
            }
          ]
        };
      default:
        return null;
    }
  };

  // Get chart options
  const getChartOptions = () => {
    const currentReport = reports.find(r => r.id === selectedReport); // Get currentReport here
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: currentReport?.name, // Use currentReport here
          font: {
            size: 16
          }
        },
      },
      scales: selectedReport === 'claims' || selectedReport === 'hospital' ? {} : {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          }
        },
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          }
        }
      }
    };
  };

  useEffect(() => {
    fetchReport();
  }, [fetchReport]); // Now fetchReport is a dependency, properly memoized with useCallback

  // Render appropriate chart component
  const renderChart = () => {
    if (!reportData) return null;
    
    const currentReport = reports.find(r => r.id === selectedReport);
    const chartData = reportData.chartData || getSampleChartData();
    const options = getChartOptions();

    if (!chartData) return null;

    switch (currentReport?.chartType) {
      case 'line':
        return <LineChart data={chartData} options={options} />;
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      case 'doughnut':
        return <Donut data={chartData} options={options} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  // Get the current report name for the header
  const getCurrentReportName = () => {
    const currentReport = reports.find(r => r.id === selectedReport);
    return currentReport?.name || 'Report';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and view comprehensive system reports</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="last-7-days">Last 7 Days</option>
            <option value="last-30-days">Last 30 Days</option>
            <option value="last-quarter">Last Quarter (90 Days)</option>
            <option value="last-year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>

          <button
            onClick={() => exportReport('pdf')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                selectedReport === report.id
                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    selectedReport === report.id 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">View detailed analytics</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </p>
        </div>
      )}

      {/* Report Preview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {getCurrentReportName()} Report
            {dateRange && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({dateRange.replace(/-/g, ' ')})
              </span>
            )}
          </h3>
          
          <div className="flex gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              loading 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {loading ? 'Loading...' : 'Live Data'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Generating report...</p>
            </div>
          </div>
        ) : reportData ? (
          <div className="h-80">
            {renderChart()}
          </div>
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No report data available</p>
              <p className="text-sm text-gray-500">Select a report type to generate data</p>
            </div>
          </div>
        )}

        {/* Report Summary */}
        {reportData && reportData.summary && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Report Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{value}</div>
                  <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <button
            onClick={() => exportReport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-5 w-5" />
            Download PDF
          </button>

          <button
            onClick={() => exportReport('csv')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Table className="h-5 w-5" />
            Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-5 w-5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Report Generated</p>
              <p className="text-2xl font-bold text-gray-900">
                {reportData?.generatedAt ? new Date(reportData.generatedAt).toLocaleDateString() : 'N/A'}
            </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Data Points</p>
              <p className="text-2xl font-bold text-gray-900">
                {reportData?.dataPoints || '0'}
              </p>
            </div>
            <Database className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Export Formats</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <Download className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// // 4. Analytics Dashboard Component
// function AnalyticsDashboard() {
//   const [timeRange, setTimeRange] = useState('monthly');
  
//   const analyticsData = {
//     monthly: [
//       { month: 'Jan', users: 4000, revenue: 2400, claims: 240 },
//       { month: 'Feb', users: 3000, revenue: 1398, claims: 221 },
//       { month: 'Mar', users: 2000, revenue: 9800, claims: 229 },
//       { month: 'Apr', users: 2780, revenue: 3908, claims: 200 },
//       { month: 'May', users: 1890, revenue: 4800, claims: 218 },
//       { month: 'Jun', users: 2390, revenue: 3800, claims: 250 },
//     ],
//     weekly: [
//       { week: 'Week 1', users: 1000, revenue: 800, claims: 60 },
//       { week: 'Week 2', users: 1200, revenue: 900, claims: 70 },
//       { week: 'Week 3', users: 800, revenue: 600, claims: 50 },
//       { week: 'Week 4', users: 1500, revenue: 1100, claims: 80 },
//     ]
//   };

//   const metrics = [
//     { label: 'Total Users', value: '45,892', change: '+12.5%', isPositive: true, icon: Users },
//     { label: 'Monthly Revenue', value: '$2.4M', change: '+8.2%', isPositive: true, icon: DollarSign },
//     { label: 'Active Claims', value: '1,247', change: '-3.1%', isPositive: false, icon: FileText },
//     { label: 'Avg. Claim Time', value: '2.4 days', change: '-0.5%', isPositive: true, icon: Clock },
//   ];

//   const distributionData = [
//     { name: 'Basic Plan', value: 400, color: '#3b82f6' },
//     { name: 'Standard Plan', value: 300, color: '#10b981' },
//     { name: 'Premium Plan', value: 200, color: '#8b5cf6' },
//     { name: 'Custom Plan', value: 100, color: '#f59e0b' },
//   ];

//   return (
//     <div className="p-8">
//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
//           <p className="text-gray-600">Real-time insights and performance metrics</p>
//         </div>
//         <select 
//           className="px-4 py-2 border border-gray-300 rounded-lg"
//           value={timeRange}
//           onChange={(e) => setTimeRange(e.target.value)}
//         >
//           <option value="weekly">Weekly</option>
//           <option value="monthly">Monthly</option>
//           <option value="quarterly">Quarterly</option>
//           <option value="yearly">Yearly</option>
//         </select>
//       </div>

//       {/* Metrics Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//         {metrics.map((metric, index) => {
//           const Icon = metric.icon;
//           return (
//             <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//               <div className="flex items-center justify-between mb-4">
//                 <div className={`w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center`}>
//                   <Icon className="h-6 w-6 text-blue-600" />
//                 </div>
//                 <div className={`flex items-center gap-1 ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
//                   {metric.isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
//                   <span className="text-sm">{metric.change}</span>
//                 </div>
//               </div>
//               <div className="text-gray-600 text-sm mb-1">{metric.label}</div>
//               <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Charts */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//         {/* User Growth Chart */}
//         <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Trend</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <AreaChart data={analyticsData[timeRange]}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//               <XAxis dataKey={timeRange === 'monthly' ? 'month' : 'week'} stroke="#6b7280" />
//               <YAxis stroke="#6b7280" />
//               <Tooltip />
//               <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
//             </AreaChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Revenue Chart */}
//         <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={analyticsData[timeRange]}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//               <XAxis dataKey={timeRange === 'monthly' ? 'month' : 'week'} stroke="#6b7280" />
//               <YAxis stroke="#6b7280" />
//               <Tooltip />
//               <Bar dataKey="revenue" fill="#10b981" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       {/* Distribution & Activity */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Plan Distribution */}
//         <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <PieChart>
//               <Pie
//                 data={distributionData}
//                 cx="50%"
//                 cy="50%"
//                 labelLine={false}
//                 label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
//                 outerRadius={80}
//                 fill="#8884d8"
//                 dataKey="value"
//               >
//                 {distributionData.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={entry.color} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Recent Activity */}
//         <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">System Activity</h3>
//           <div className="space-y-4">
//             {[
//               { action: 'New user registered', time: '5 min ago', user: 'John Smith' },
//               { action: 'Claim approved', time: '15 min ago', user: 'Sarah Johnson' },
//               { action: 'Payment processed', time: '30 min ago', user: 'Mike Chen' },
//               { action: 'Agent commission updated', time: '1 hour ago', user: 'David Wilson' },
//               { action: 'Hospital verified', time: '2 hours ago', user: 'City General' },
//             ].map((activity, index) => (
//               <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
//                 <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
//                 <div className="flex-1">
//                   <p className="text-gray-900 font-medium">{activity.action}</p>
//                   <p className="text-gray-600 text-sm">{activity.user}</p>
//                   <p className="text-gray-500 text-xs">{activity.time}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('monthly');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    endDate: new Date()
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize date params
  const dateParams = useMemo(() => ({
    timeRange,
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString()
  }), [timeRange, dateRange]);

  // Memoized loadAnalyticsData function
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📱 Calling fetchAnalyticsData with params:', dateParams);
      const response = await fetchAnalyticsData(dateParams);
      
      console.log('📡 API Response:', response);
      
      if (response.success) {
        console.log('✅ Setting real analytics data');
        setAnalyticsData(response.data);
      } else {
        console.log('⚠️ API returned error:', response.error);
        // Still use the data if available (fallback data from backend)
        if (response.data) {
          setAnalyticsData(response.data);
        }
        setError(response.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('💥 Error loading analytics:', err);
      setError(err.message);
      // Use demo data as fallback
      setAnalyticsData(getDemoData());
    } finally {
      setLoading(false);
    }
  }, [dateParams]);

  // Fetch analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Memoized handleDateRangeChange
  const handleDateRangeChange = useCallback((newRange) => {
    setTimeRange(newRange.timeRange);
    setDateRange({
      startDate: new Date(newRange.startDate),
      endDate: new Date(newRange.endDate)
    });
  }, []);

  // Memoized formatting functions
  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '$0';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount >= 1000000) return `$${(numAmount / 1000000).toFixed(1)}M`;
    if (numAmount >= 1000) return `$${(numAmount / 1000).toFixed(1)}K`;
    return `$${numAmount.toFixed(0)}`;
  }, []);

  const formatNumber = useCallback((num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  }, []);

  // Prepare metrics for display
  const getMetrics = useCallback(() => {
    if (!analyticsData?.metrics) return [];
    
    const { metrics } = analyticsData;
    
    // Calculate percentage changes (for demo, you can replace with real calculations)
    const calculateChange = (value) => {
      const base = 1000; // Demo base value
      const change = ((value - base) / base * 100).toFixed(1);
      return {
        value: `${change > 0 ? '+' : ''}${change}%`,
        isPositive: change >= 0
      };
    };
    
    const custChange = calculateChange(metrics.total_customers || 0);
    const revChange = calculateChange(metrics.total_revenue || 0);
    const claimChange = calculateChange(metrics.active_claims || 0);
    const timeChange = { value: '-0.5%', isPositive: true }; // Static for demo
    const policyChange = calculateChange(metrics.total_policies || 0);
    const commChange = calculateChange(metrics.total_commission || 0);
    
    return [
      { 
        label: 'Total Customers', 
        value: formatNumber(metrics.total_customers || 0),
        change: custChange.value, 
        isPositive: custChange.isPositive, 
        icon: Users,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        description: 'Registered customers'
      },
      { 
        label: 'Total Revenue', 
        value: formatCurrency(metrics.total_revenue || 0), 
        change: revChange.value, 
        isPositive: revChange.isPositive, 
        icon: DollarSign,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        description: 'Total payments received'
      },
      { 
        label: 'Active Claims', 
        value: formatNumber(metrics.active_claims || 0), 
        change: claimChange.value, 
        isPositive: claimChange.isPositive, 
        icon: FileText,
        bgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        description: 'Pending claims'
      },
      { 
        label: 'Avg Claim Time', 
        value: `${(metrics.avg_claim_time || 0).toFixed(1)} days`, 
        change: timeChange.value, 
        isPositive: timeChange.isPositive, 
        icon: Clock,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
        description: 'Average processing time'
      },
      { 
        label: 'Total Policies', 
        value: formatNumber(metrics.total_policies || 0), 
        change: policyChange.value, 
        isPositive: policyChange.isPositive, 
        icon: Shield,
        bgColor: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        description: 'Active policies'
      },
      { 
        label: 'Total Commission', 
        value: formatCurrency(metrics.total_commission || 0), 
        change: commChange.value, 
        isPositive: commChange.isPositive, 
        icon: Percent,
        bgColor: 'bg-pink-100',
        iconColor: 'text-pink-600',
        description: 'Paid to agents'
      },
    ];
  }, [analyticsData, formatNumber, formatCurrency]);

  // Memoized loading state JSX
  const loadingContent = useMemo(() => (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics dashboard...</p>
        <p className="text-gray-500 text-sm mt-2">Fetching data from database...</p>
      </div>
    </div>
  ), []);

  // Memoized error state JSX
  const errorContent = useMemo(() => (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <p className="text-red-700 font-medium">Error Loading Analytics</p>
        </div>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <button 
          onClick={loadAnalyticsData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Retry Loading
        </button>
        <p className="text-gray-500 text-xs mt-3">Using sample data for demonstration</p>
      </div>
    </div>
  ), [error, loadAnalyticsData]);

  // Add colors for pie chart
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

//   // Main content
//   const mainContent = useMemo(() => {
//     if (loading) return loadingContent;
    
//     return (
//       <div className="p-4 md:p-8">
//         {/* Header */}
//         <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
//           <div>
//             <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
//             <p className="text-gray-600">Insurance platform performance metrics</p>
//           </div>
//           {error && (
//             <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
//               <p className="text-yellow-700 text-sm">⚠️ Using sample data: {error}</p>
//             </div>
//           )}
//         </div>

//         {/* Date Range Picker */}
//         <div className="mb-6">
//           <DateRangePicker 
//             onDateChange={handleDateRangeChange}
//             defaultRange={timeRange}
//           />
//         </div>

//         {/* Metrics Grid */}
//         <div className="mb-8">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
//             <span className="text-sm text-gray-500">
//               {analyticsData ? 'Real-time data' : 'Sample data'}
//             </span>
//           </div>
//           <MetricsGrid metrics={getMetrics()} />
//         </div>

//         {/* Charts Section */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//           {/* User Growth Chart */}
//           <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Growth</h3>
//             {analyticsData?.trends?.userGrowth && analyticsData.trends.userGrowth.length > 0 ? (
//               <ResponsiveContainer width="100%" height={300}>
//                 <AreaChart data={analyticsData.trends.userGrowth}>
//                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//                   <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
//                   <YAxis stroke="#6b7280" fontSize={12} />
//                   <Tooltip 
//                     formatter={(value) => [value, 'Customers']}
//                     labelStyle={{ color: '#374151' }}
//                   />
//                   <Area 
//                     type="monotone" 
//                     dataKey="count" 
//                     stroke="#3b82f6" 
//                     fill="#3b82f6" 
//                     fillOpacity={0.2}
//                     name="Customers"
//                   />
//                 </AreaChart>
//               </ResponsiveContainer>
//             ) : (
//               <div className="h-[300px] flex items-center justify-center text-gray-500">
//                 No customer growth data available
//               </div>
//             )}
//           </div>

//           {/* Revenue Chart */}
//           <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
//             {analyticsData?.trends?.revenueData && analyticsData.trends.revenueData.length > 0 ? (
//               <ResponsiveContainer width="100%" height={300}>
//                 <BarChart data={analyticsData.trends.revenueData}>
//                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//                   <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
//                   <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
//                   <Tooltip 
//                     formatter={(value) => [formatCurrency(value), 'Revenue']}
//                     labelStyle={{ color: '#374151' }}
//                   />
//                   <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             ) : (
//               <div className="h-[300px] flex items-center justify-center text-gray-500">
//                 No revenue data available
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Bottom Section */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Plan Distribution */}
//           <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg font-semibold text-gray-900">Plan Distribution</h3>
//               <span className="text-sm text-gray-500">
//                 {analyticsData?.distribution?.length || 0} plans
//               </span>
//             </div>
//             {analyticsData?.distribution && analyticsData.distribution.length > 0 ? (
//               <ResponsiveContainer width="100%" height={250}>
//                 <PieChart>
//                   <Pie
//                     data={analyticsData.distribution}
//                     cx="50%"
//                     cy="50%"
//                     labelLine={false}
//                     label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
//                     outerRadius={80}
//                     fill="#8884d8"
//                     dataKey="value"
//                   >
//                     {analyticsData.distribution.map((entry, index) => (
//                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <Tooltip formatter={(value) => [value, 'Policies']} />
//                 </PieChart>
//               </ResponsiveContainer>
//             ) : (
//               <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
//                 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
//                   <Shield className="h-8 w-8 text-gray-400" />
//                 </div>
//                 <p>No policy distribution data</p>
//                 <p className="text-sm mt-1">Add policies to see distribution</p>
//               </div>
//             )}
//           </div>

//           {/* Recent Activity */}
//           <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
//               <span className="text-sm text-gray-500">
//                 Last {analyticsData?.activity?.length || 0} activities
//               </span>
//             </div>
//             <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
//               {analyticsData?.activity && analyticsData.activity.length > 0 ? (
//                 analyticsData.activity.map((activity, index) => (
//                   <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
//                     <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
//                       activity.entity_type === 'customer' ? 'bg-blue-500' :
//                       activity.entity_type === 'policy' ? 'bg-green-500' :
//                       activity.entity_type === 'claim' ? 'bg-yellow-500' :
//                       'bg-gray-500'
//                     }`}></div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-gray-900 font-medium truncate">{activity.description}</p>
//                       <div className="flex items-center gap-2 text-sm">
//                         <span className="text-gray-600 truncate">{activity.user_name}</span>
//                         <span className="text-gray-500">•</span>
//                         <span className="text-gray-500 capitalize">{activity.entity_type}</span>
//                       </div>
//                       <p className="text-gray-500 text-xs">
//                         {new Date(activity.created_at).toLocaleDateString()} •{' '}
//                         {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                       </p>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <div className="h-[200px] flex flex-col items-center justify-center text-gray-500">
//                   <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
//                     <FileText className="h-8 w-8 text-gray-400" />
//                   </div>
//                   <p>No recent activity</p>
//                   <p className="text-sm mt-1">Activities will appear here</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Data Last Updated & Status */}
//         <div className="mt-6 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm">
//           <div>
//             Data last updated: {new Date().toLocaleString()}
//           </div>
//           <div className="flex items-center gap-4 mt-2 md:mt-0">
//             <div className="flex items-center gap-2">
//               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//               <span>Real data: {analyticsData ? '✓' : '✗'}</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
//               <span>Time range: {timeRange}</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }, [
//     loading, error, loadingContent, errorContent, 
//     handleDateRangeChange, timeRange, getMetrics, 
//     analyticsData, formatCurrency, COLORS
//   ]);

//   return mainContent;
// }
  // Main content
  const mainContent = useMemo(() => {
    if (loading) return loadingContent;
    
    return (
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Insurance platform performance metrics</p>
          </div>
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
              <p className="text-yellow-700 text-sm">⚠️ Using sample data: {error}</p>
            </div>
          )}
        </div>

        {/* Date Range Picker */}
        <div className="mb-6">
          <DateRangePicker 
            onDateChange={handleDateRangeChange}
            defaultRange={timeRange}
          />
        </div>

        {/* Metrics Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
            <span className="text-sm text-gray-500">
              {analyticsData ? 'Real-time data' : 'Sample data'}
            </span>
          </div>
          <MetricsGrid metrics={getMetrics()} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Growth</h3>
            {analyticsData?.trends?.userGrowth && analyticsData.trends.userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.trends.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    formatter={(value) => [value, 'Customers']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.2}
                    name="Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No customer growth data available
              </div>
            )}
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
            {analyticsData?.trends?.revenueData && analyticsData.trends.revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.trends.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Plan Distribution</h3>
              <span className="text-sm text-gray-500">
                {analyticsData?.distribution?.length || 0} plans
              </span>
            </div>
            {analyticsData?.distribution && analyticsData.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analyticsData.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Policies']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <p>No policy distribution data</p>
                <p className="text-sm mt-1">Add policies to see distribution</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <span className="text-sm text-gray-500">
                Last {analyticsData?.activity?.length || 0} activities
              </span>
            </div>
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
              {analyticsData?.activity && analyticsData.activity.length > 0 ? (
                analyticsData.activity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.entity_type === 'customer' ? 'bg-blue-500' :
                      activity.entity_type === 'policy' ? 'bg-green-500' :
                      activity.entity_type === 'claim' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 truncate">{activity.user_name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 capitalize">{activity.entity_type}</span>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {new Date(activity.created_at).toLocaleDateString()} •{' '}
                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p>No recent activity</p>
                  <p className="text-sm mt-1">Activities will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Last Updated & Status */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm">
          <div>
            Data last updated: {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real data: {analyticsData ? '✓' : '✗'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Time range: {timeRange}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    loading, error, loadingContent, errorContent, 
    handleDateRangeChange, timeRange, getMetrics, 
    analyticsData, COLORS,formatCurrency
  ]);

  return mainContent;
}

// Demo data fallback function
const getDemoData = () => ({
  metrics: {
    total_customers: 45892,
    total_revenue: 2400000,
    active_claims: 1247,
    avg_claim_time: 2.4,
    total_policies: 32845,
    total_commission: 456200,
    total_agents: 150,
    total_admins: 10
  },
  trends: {
    userGrowth: [
      { period: 'Jan', count: 4000 },
      { period: 'Feb', count: 3000 },
      { period: 'Mar', count: 2000 },
      { period: 'Apr', count: 2780 },
      { period: 'May', count: 1890 },
      { period: 'Jun', count: 2390 },
    ],
    revenueData: [
      { period: 'Jan', revenue: 2400 },
      { period: 'Feb', revenue: 1398 },
      { period: 'Mar', revenue: 9800 },
      { period: 'Apr', revenue: 3908 },
      { period: 'May', revenue: 4800 },
      { period: 'Jun', revenue: 3800 },
    ]
  },
  distribution: [
    { name: 'Basic Health Guard', value: 400 },
    { name: 'Premium Family Shield', value: 300 },
    { name: 'Senior Care Plus', value: 200 },
    { name: 'Critical Illness Protect', value: 100 },
  ],
  activity: [
    { description: 'New customer registration', user_name: 'John Smith', entity_type: 'customer', created_at: new Date().toISOString() },
    { description: 'Policy purchased', user_name: 'Sarah Johnson', entity_type: 'policy', created_at: new Date(Date.now() - 900000).toISOString() },
    { description: 'Claim submitted', user_name: 'Mike Chen', entity_type: 'claim', created_at: new Date(Date.now() - 1800000).toISOString() },
    { description: 'Agent commission paid', user_name: 'David Wilson', entity_type: 'agent', created_at: new Date(Date.now() - 2700000).toISOString() },
    { description: 'Payment received', user_name: 'Emma Brown', entity_type: 'payment', created_at: new Date(Date.now() - 3600000).toISOString() },
  ]
});

// // Fallback demo data (optional)
// const getDemoData = () => ({
//   metrics: {
//     total_customers: 45892,
//     total_revenue: 2400000,
//     active_claims: 1247,
//     avg_claim_time: 2.4,
//     total_policies: 32845,
//     total_commission: 456200
//   },
//   trends: {
//     userGrowth: [
//       { period: 'Jan', count: 4000 },
//       { period: 'Feb', count: 3000 },
//       { period: 'Mar', count: 2000 },
//       { period: 'Apr', count: 2780 },
//       { period: 'May', count: 1890 },
//       { period: 'Jun', count: 2390 },
//     ],
//     revenueData: [
//       { period: 'Jan', revenue: 2400 },
//       { period: 'Feb', revenue: 1398 },
//       { period: 'Mar', revenue: 9800 },
//       { period: 'Apr', revenue: 3908 },
//       { period: 'May', revenue: 4800 },
//       { period: 'Jun', revenue: 3800 },
//     ]
//   },
//   distribution: [
//     { name: 'Basic Plan', value: 400 },
//     { name: 'Standard Plan', value: 300 },
//     { name: 'Premium Plan', value: 200 },
//     { name: 'Custom Plan', value: 100 },
//   ],
//   activity: [
//     { description: 'New customer registration', user_name: 'John Smith', entity_type: 'customer', created_at: new Date().toISOString() },
//     { description: 'Claim approved', user_name: 'Sarah Johnson', entity_type: 'claim', created_at: new Date(Date.now() - 900000).toISOString() },
//     { description: 'Payment processed', user_name: 'Mike Chen', entity_type: 'payment', created_at: new Date(Date.now() - 1800000).toISOString() },
//     { description: 'Agent commission updated', user_name: 'David Wilson', entity_type: 'agent', created_at: new Date(Date.now() - 3600000).toISOString() },
//     { description: 'Hospital verified', user_name: 'City General', entity_type: 'hospital', created_at: new Date(Date.now() - 7200000).toISOString() },
//   ]
// });

// 5. Audit Logs Component
function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUserType, setSelectedUserType] = useState('all');

  // ---------------------------
  // Fetch audit logs from backend
  // ---------------------------
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const res = await axios.get(`${API_BASE_URL}/audit-logs`, config);
      
      if (res.data.success) {
        setLogs(res.data.data);
      } else {
        console.error("Failed to fetch audit logs:", res.data.message);
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // ---------------------------
  // View Log Details
  // ---------------------------
  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  // ---------------------------
  // Get severity based on action
  // ---------------------------
  const getSeverity = (action) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('failed') || 
        actionLower.includes('error') || 
        actionLower.includes('delete') ||
        actionLower.includes('reject')) {
      return 'danger';
    } else if (actionLower.includes('warning') || 
               actionLower.includes('attempt') ||
               actionLower.includes('suspicious')) {
      return 'warning';
    } else if (actionLower.includes('login') || 
               actionLower.includes('create') ||
               actionLower.includes('update') ||
               actionLower.includes('view')) {
      return 'info';
    }
    return 'info';
  };

  // ---------------------------
  // Get severity color
  // ---------------------------
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'danger': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ---------------------------
  // Format timestamp
  // ---------------------------
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // ---------------------------
  // Filter logs
  // ---------------------------
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id?.toString().includes(searchTerm);
    
    const matchesAction = 
      selectedAction === 'all' || 
      log.action?.toLowerCase().includes(selectedAction.toLowerCase());
    
    const matchesUserType = 
      selectedUserType === 'all' || 
      log.user_type?.toLowerCase() === selectedUserType.toLowerCase();
    
    return matchesSearch && matchesAction && matchesUserType;
  });

  // ---------------------------
  // Get unique actions for filter
  // ---------------------------
  const uniqueActions = [...new Set(logs.map(log => log.action).filter(Boolean))];
  const uniqueUserTypes = [...new Set(logs.map(log => log.user_type).filter(Boolean))];

  // ---------------------------
  // Export logs to CSV
  // ---------------------------
  const exportToCSV = () => {
    const csvContent = [
      ['Audit ID', 'Timestamp', 'User Type', 'User ID', 'Action', 'Entity', 'Entity ID', 'Severity'],
      ...filteredLogs.map(log => [
        log.audit_id,
        formatTimestamp(log.timestamp),
        log.user_type || 'N/A',
        log.user_id || 'N/A',
        log.action,
        log.entity || 'N/A',
        log.entity_id || 'N/A',
        getSeverity(log.action)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Audit logs exported successfully!');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Audit Logs</h1>
          <p className="text-gray-600">Monitor system activities and security events</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchAuditLogs}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value)}
            >
              <option value="all">All User Types</option>
              {uniqueUserTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Total Logs</div>
          <div className="text-2xl font-bold text-gray-900">{filteredLogs.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Info</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredLogs.filter(log => getSeverity(log.action) === 'info').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Warnings</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredLogs.filter(log => getSeverity(log.action) === 'warning').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Danger</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredLogs.filter(log => getSeverity(log.action) === 'danger').length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedAction !== 'all' || selectedUserType !== 'all'
                ? 'Try adjusting your filters'
                : 'No audit logs available'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Timestamp</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">User Type</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">User ID</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Action</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Entity</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Severity</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => {
                const severity = getSeverity(log.action);
                return (
                  <tr key={log.audit_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <span className={`px-2 py-1 rounded text-xs ${log.user_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {log.user_type || 'System'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-mono">
                      {log.user_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{log.action}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {log.entity ? `${log.entity}${log.entity_id ? ` #${log.entity_id}` : ''}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(severity)}`}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewDetails(log)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* View Details Modal */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Header */}
                <div className={`p-4 rounded-lg ${getSeverityColor(getSeverity(selectedLog.action))}`}>
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6" />
                    <div>
                      <h3 className="text-lg font-semibold">{selectedLog.action}</h3>
                      <p className="text-sm opacity-90">Audit ID: #{selectedLog.audit_id}</p>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Audit ID</label>
                      <div className="font-mono text-gray-900">#{selectedLog.audit_id}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Timestamp</label>
                      <div className="text-gray-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatTimestamp(selectedLog.timestamp)}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Action</label>
                      <div className="text-gray-900 font-medium">{selectedLog.action}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Severity</label>
                      <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(getSeverity(selectedLog.action))}`}>
                        {getSeverity(selectedLog.action).charAt(0).toUpperCase() + getSeverity(selectedLog.action).slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* User & Entity Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">User & Entity Information</h4>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">User Type</label>
                      <div className="text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs ${selectedLog.user_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                          {selectedLog.user_type || 'System'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">User ID</label>
                      <div className="font-mono text-gray-900">{selectedLog.user_id || 'N/A'}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Entity</label>
                      <div className="text-gray-900">{selectedLog.entity || 'N/A'}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Entity ID</label>
                      <div className="font-mono text-gray-900">{selectedLog.entity_id || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Additional Information</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Full Action Description</label>
                    <div className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                      {selectedLog.user_type ? `${selectedLog.user_type.charAt(0).toUpperCase() + selectedLog.user_type.slice(1)}` : 'System'} 
                      {selectedLog.user_id ? ` (ID: ${selectedLog.user_id})` : ''} 
                      {selectedLog.action.toLowerCase()}
                      {selectedLog.entity ? ` on ${selectedLog.entity}` : ''}
                      {selectedLog.entity_id ? ` (ID: ${selectedLog.entity_id})` : ''}
                      {selectedLog.timestamp ? ` at ${formatTimestamp(selectedLog.timestamp)}` : ''}.
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
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

// // 6. Complaints Management Component
// function ComplaintsManagement() {
//   const [complaints, setComplaints] = useState([
//     { id: 1, user: 'John Smith', email: 'john@email.com', type: 'User', subject: 'Claim processing delay', message: 'My claim has been pending for over 2 weeks...', status: 'open', createdAt: '2024-01-15' },
//     { id: 2, user: 'City General Hospital', email: 'admin@citygeneral.com', type: 'Hospital', subject: 'Payment issue', message: 'Last month payment not received...', status: 'in-progress', createdAt: '2024-01-14' },
//     { id: 3, user: 'David Wilson', email: 'david@agent.com', type: 'Agent', subject: 'Commission calculation', message: 'Commission for December seems incorrect...', status: 'resolved', createdAt: '2024-01-13' },
//   ]);

//   const [selectedComplaint, setSelectedComplaint] = useState(null);
//   const [replyMessage, setReplyMessage] = useState('');

//   const handleReply = (complaintId) => {
//     // In real app, this would send email
//     alert(`Reply sent to ${complaints.find(c => c.id === complaintId)?.email}`);
//     setReplyMessage('');
//   };

//   const updateComplaintStatus = (complaintId, newStatus) => {
//     setComplaints(prev => prev.map(c => 
//       c.id === complaintId ? { ...c, status: newStatus } : c
//     ));
//   };

//   const getStatusColor = (status) => {
//     switch(status) {
//       case 'open': return 'bg-red-100 text-red-800';
//       case 'in-progress': return 'bg-yellow-100 text-yellow-800';
//       case 'resolved': return 'bg-green-100 text-green-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   return (
//     <div className="p-8">
//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900 mb-2">Complaints Inbox</h1>
//           <p className="text-gray-600">Manage and respond to user complaints</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <Bell className="h-5 w-5 text-gray-400" />
//           <span className="text-gray-700">Unread: </span>
//           <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm">
//             {complaints.filter(c => c.status === 'open').length}
//           </span>
//         </div>
//       </div>

//       <div className="grid lg:grid-cols-3 gap-6">
//         {/* Complaints List */}
//         <div className="lg:col-span-1">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//             <div className="p-4 border-b border-gray-200">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
//                 <input
//                   type="text"
//                   placeholder="Search complaints..."
//                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
//                 />
//               </div>
//             </div>
            
//             <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
//               {complaints.map((complaint) => (
//                 <button
//                   key={complaint.id}
//                   onClick={() => setSelectedComplaint(complaint)}
//                   className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
//                     selectedComplaint?.id === complaint.id ? 'bg-blue-50' : ''
//                   }`}
//                 >
//                   <div className="flex items-start gap-3">
//                     <div className="flex-1">
//                       <div className="flex items-center justify-between mb-1">
//                         <span className="font-medium text-gray-900">{complaint.user}</span>
//                         <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(complaint.status)}`}>
//                           {complaint.status}
//                         </span>
//                       </div>
//                       <p className="text-gray-900 font-medium text-sm mb-1">{complaint.subject}</p>
//                       <p className="text-gray-600 text-sm truncate">{complaint.message.substring(0, 60)}...</p>
//                       <div className="flex items-center justify-between mt-2">
//                         <span className="text-xs text-gray-500">{complaint.type}</span>
//                         <span className="text-xs text-gray-500">{complaint.createdAt}</span>
//                       </div>
//                     </div>
//                   </div>
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Complaint Details */}
//         <div className="lg:col-span-2">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             {selectedComplaint ? (
//               <>
//                 <div className="flex items-center justify-between mb-6">
//                   <div>
//                     <h2 className="text-xl font-bold text-gray-900">{selectedComplaint.subject}</h2>
//                     <div className="flex items-center gap-2 mt-2">
//                       <span className="text-gray-600">From: {selectedComplaint.user}</span>
//                       <span className="text-gray-400">•</span>
//                       <span className="text-gray-600">{selectedComplaint.email}</span>
//                       <span className="text-gray-400">•</span>
//                       <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedComplaint.status)}`}>
//                         {selectedComplaint.status}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="flex gap-2">
//                     <button 
//                       onClick={() => updateComplaintStatus(selectedComplaint.id, 'in-progress')}
//                       className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
//                     >
//                       Mark In Progress
//                     </button>
//                     <button 
//                       onClick={() => updateComplaintStatus(selectedComplaint.id, 'resolved')}
//                       className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//                     >
//                       Mark Resolved
//                     </button>
//                   </div>
//                 </div>

//                 <div className="mb-6">
//                   <div className="text-gray-600 text-sm mb-2">Message:</div>
//                   <div className="bg-gray-50 p-4 rounded-lg">
//                     <p className="text-gray-900">{selectedComplaint.message}</p>
//                   </div>
//                 </div>

//                 <div>
//                   <div className="text-gray-600 text-sm mb-2">Reply:</div>
//                   <textarea
//                     value={replyMessage}
//                     onChange={(e) => setReplyMessage(e.target.value)}
//                     placeholder="Type your reply here..."
//                     className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
//                   />
//                   <div className="flex justify-end mt-4">
//                     <button 
//                       onClick={() => handleReply(selectedComplaint.id)}
//                       disabled={!replyMessage.trim()}
//                       className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
//                     >
//                       <Mail className="h-5 w-5" />
//                       Send Reply
//                     </button>
//                   </div>
//                 </div>
//               </>
//             ) : (
//               <div className="text-center py-12">
//                 <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-gray-900 mb-2">Select a complaint</h3>
//                 <p className="text-gray-600">Choose a complaint from the list to view details and respond</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// 7. Payment Transactions Component
function PaymentTransactions() {
  const [transactions] = useState([
    { id: 'TXN001', user: 'John Smith', amount: 199, type: 'Premium Payment', status: 'Completed', date: '2024-01-15', method: 'Credit Card' },
    { id: 'TXN002', user: 'Sarah Johnson', amount: 99, type: 'Basic Payment', status: 'Completed', date: '2024-01-14', method: 'Bank Transfer' },
    { id: 'TXN003', user: 'Mike Chen', amount: 299, type: 'Premium Payment', status: 'Pending', date: '2024-01-14', method: 'Credit Card' },
    { id: 'TXN004', user: 'David Wilson', amount: 45000, type: 'Commission Payment', status: 'Completed', date: '2024-01-13', method: 'Bank Transfer' },
    { id: 'TXN005', user: 'City General', amount: 120000, type: 'Hospital Payment', status: 'Failed', date: '2024-01-12', method: 'Wire Transfer' },
  ]);

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = transactions
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Transactions</h1>
          <p className="text-gray-600">Manage and monitor payment activities</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-gray-600 text-sm">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-5 w-5" />
            Export Transactions
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Total Transactions</div>
          <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Successful</div>
          <div className="text-2xl font-bold text-green-600">
            {transactions.filter(t => t.status === 'Completed').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {transactions.filter(t => t.status === 'Pending').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {transactions.filter(t => t.status === 'Failed').length}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Transaction ID</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">User</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Type</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Amount</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Payment Method</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Date</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-gray-600">{transaction.id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{transaction.user}</td>
                <td className="px-6 py-4 text-gray-700">{transaction.type}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">${transaction.amount.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="h-4 w-4 text-gray-400" />
                    {transaction.method}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{transaction.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                    {transaction.status === 'Pending' && (
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 8. Agent Commission Component
function AgentCommissions() {
  const [commissions, setCommissions] = useState([
    { agent: 'David Wilson', totalSales: 45000, commissionRate: '15%', commissionAmount: 6750, pending: 1200, paid: 5550, lastPayment: '2024-01-10' },
    { agent: 'Lisa Brown', totalSales: 32000, commissionRate: '12%', commissionAmount: 3840, pending: 800, paid: 3040, lastPayment: '2024-01-05' },
    { agent: 'Tom Harris', totalSales: 18000, commissionRate: '10%', commissionAmount: 1800, pending: 1800, paid: 0, lastPayment: '-' },
  ]);

  const [editingCommission, setEditingCommission] = useState(null);
  const [newRate, setNewRate] = useState('');

  const handleUpdateCommission = (agentName) => {
    if (newRate && !isNaN(parseFloat(newRate))) {
      setCommissions(prev => prev.map(c => 
        c.agent === agentName 
          ? { 
              ...c, 
              commissionRate: `${parseFloat(newRate)}%`,
              commissionAmount: (c.totalSales * parseFloat(newRate)) / 100
            } 
          : c
      ));
      setEditingCommission(null);
      setNewRate('');
    }
  };

  const handlePayCommission = (agentName) => {
    setCommissions(prev => prev.map(c => 
      c.agent === agentName 
        ? { 
            ...c, 
            paid: c.paid + c.pending,
            pending: 0,
            lastPayment: new Date().toISOString().split('T')[0]
          } 
        : c
    ));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Commissions</h1>
          <p className="text-gray-600">Review and manage agent commission payments</p>
        </div>
        <div className="text-right">
          <div className="text-gray-600 text-sm">Total Commission Due</div>
          <div className="text-2xl font-bold text-blue-600">
            ${commissions.reduce((sum, c) => sum + c.pending, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Commission Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Agent</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Total Sales</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Commission Rate</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Commission Amount</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Pending</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Paid</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Last Payment</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {commissions.map((commission) => (
              <tr key={commission.agent} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{commission.agent}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">${commission.totalSales.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  {editingCommission === commission.agent ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      <span>%</span>
                      <button 
                        onClick={() => handleUpdateCommission(commission.agent)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => {
                          setEditingCommission(null);
                          setNewRate('');
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{commission.commissionRate}</span>
                      <button 
                        onClick={() => {
                          setEditingCommission(commission.agent);
                          setNewRate(parseFloat(commission.commissionRate));
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-bold text-blue-600">
                  ${commission.commissionAmount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-yellow-600">${commission.pending.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-green-600">${commission.paid.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{commission.lastPayment}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {commission.pending > 0 && (
                      <button 
                        onClick={() => handlePayCommission(commission.agent)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        <Check className="h-3 w-3" />
                        Pay Commission
                      </button>
                    )}
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Hospital Network Component with Validations
function HospitalNetwork() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', or 'view'
  const [selectedHospital, setSelectedHospital] = useState(null);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    registration_number: '',
    contact_person: '',
    specialization: '',
    status: 'pending'
  });

  // Validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // ---------------------------
  // Validation Rules
  // ---------------------------
  const validationRules = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-&.,()]+$/,
      message: 'Hospital name must be 2-100 characters with valid characters only'
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    },
    phone: {
      required: false,
      pattern: /^[+]?[1-9][\d]{0,15}$/,
      minLength: 10,
      maxLength: 15,
      message: 'Please enter a valid phone number (10-15 digits)'
    },
    address: {
      required: false,
      maxLength: 200,
      message: 'Address cannot exceed 200 characters'
    },
    city: {
      required: true,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-']+$/,
      message: 'City name must contain only letters and spaces'
    },
    state: {
      required: true,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-']+$/,
      message: 'State name must contain only letters and spaces'
    },
    zip_code: {
      required: false,
      pattern: /^\d{5}(-\d{4})?$/,
      message: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
    },
    registration_number: {
      required: false,
      pattern: /^[a-zA-Z0-9\-_]+$/,
      maxLength: 50,
      message: 'Registration number can only contain letters, numbers, hyphens, and underscores'
    },
    contact_person: {
      required: false,
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-'.]+$/,
      message: 'Contact person name must contain only letters and spaces'
    },
    specialization: {
      required: false,
      maxLength: 100,
      message: 'Specialization cannot exceed 100 characters'
    }
  };

  // ---------------------------
  // Validation Functions
  // ---------------------------
  const validateField = (fieldName, value) => {
    const rules = validationRules[fieldName];
    const newErrors = { ...errors };

    if (!rules) return true;

    // Clear error if field is not touched or has no value
    if (!value && !rules.required) {
      delete newErrors[fieldName];
      setErrors(newErrors);
      return true;
    }

    // Required validation
    if (rules.required && !value?.trim()) {
      newErrors[fieldName] = `${fieldName.replace('_', ' ')} is required`;
      setErrors(newErrors);
      return false;
    }

    // Pattern validation
    if (rules.pattern && value && !rules.pattern.test(value)) {
      newErrors[fieldName] = rules.message;
      setErrors(newErrors);
      return false;
    }

    // Length validations
    if (rules.minLength && value && value.length < rules.minLength) {
      newErrors[fieldName] = `${fieldName.replace('_', ' ')} must be at least ${rules.minLength} characters`;
      setErrors(newErrors);
      return false;
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      newErrors[fieldName] = `${fieldName.replace('_', ' ')} cannot exceed ${rules.maxLength} characters`;
      setErrors(newErrors);
      return false;
    }

    // If all validations pass, clear error
    delete newErrors[fieldName];
    setErrors(newErrors);
    return true;
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const value = formData[fieldName];
      const rules = validationRules[fieldName];

      if (rules.required && !value?.trim()) {
        newErrors[fieldName] = `${fieldName.replace('_', ' ')} is required`;
        isValid = false;
      } else if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[fieldName] = rules.message;
        isValid = false;
      } else if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[fieldName] = `${fieldName.replace('_', ' ')} must be at least ${rules.minLength} characters`;
        isValid = false;
      } else if (rules.maxLength && value && value.length > rules.maxLength) {
        newErrors[fieldName] = `${fieldName.replace('_', ' ')} cannot exceed ${rules.maxLength} characters`;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // ---------------------------
  // Form Field Handlers
  // ---------------------------
  const handleInputChange = (fieldName, value) => {
    // Update form data
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Validate field if it's been touched
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  const handleBlur = (fieldName) => {
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // Validate the field
    validateField(fieldName, formData[fieldName]);
  };

  // Helper function to render form field with validation
  const renderFormField = (fieldName, label, type = 'text', options = {}) => {
    const isRequired = validationRules[fieldName]?.required;
    const hasError = errors[fieldName] && touched[fieldName];
    
    return (
      <div>
        <label className="block text-gray-700 mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        {type === 'select' ? (
          <select
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
            value={formData[fieldName]}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            onBlur={() => handleBlur(fieldName)}
          >
            {options.selectOptions}
          </select>
        ) : (
          <input
            type={type}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
            value={formData[fieldName]}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            onBlur={() => handleBlur(fieldName)}
            placeholder={options.placeholder || ''}
            required={isRequired}
          />
        )}
        {hasError && (
          <p className="mt-1 text-sm text-red-600">{errors[fieldName]}</p>
        )}
      </div>
    );
  };

  // Reset validation states
  const resetValidation = () => {
    setErrors({});
    setTouched({});
  };

  // ---------------------------
  // Fetch hospitals from backend
  // ---------------------------
  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const res = await axios.get(`${API_BASE_URL}/accounts/hospitals`, config);
      
      if (res.data.success) {
        setHospitals(res.data.data);
      } else {
        console.error("Failed to fetch hospitals:", res.data.message);
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  // --------------------------------------------------------
  // Update hospital verification status in backend + frontend
  // --------------------------------------------------------
  const updateHospitalStatus = async (hospitalId, newStatus) => {
    try {
      const config = getAxiosConfig();
      
      const response = await axios.put(
        `${API_BASE_URL}/accounts/hospitals/${hospitalId}`,
        { status: newStatus },
        config
      );
      
      if (response.data.success) {
        setHospitals((prev) =>
          prev.map((h) =>
            h.id === hospitalId ? { ...h, status: newStatus } : h
          )
        );
        alert('Hospital status updated successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  // -------------------
  // Add Hospital Modal
  // -------------------
  const handleAddHospital = () => {
    setModalType('create');
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      registration_number: '',
      contact_person: '',
      specialization: '',
      status: 'pending'
    });
    resetValidation();
    setShowModal(true);
  };

  // -------------------
  // Edit Hospital
  // -------------------
  const handleEditHospital = (hospital) => {
    setModalType('edit');
    setSelectedHospital(hospital);
    setFormData({
      name: hospital.name || '',
      email: hospital.email || '',
      phone: hospital.phone || '',
      address: hospital.address || '',
      city: hospital.city || '',
      state: hospital.state || '',
      zip_code: hospital.zip_code || '',
      registration_number: hospital.registration_number || '',
      contact_person: hospital.contact_person || '',
      specialization: hospital.specialization || '',
      status: hospital.status || 'pending'
    });
    resetValidation();
    setShowModal(true);
  };

  // -------------------
  // View Hospital Details
  // -------------------
  const handleViewHospital = (hospital) => {
    setModalType('view');
    setSelectedHospital(hospital);
    resetValidation();
    setShowModal(true);
  };

  // -------------------
  // Handle Form Submit with Validation
  // -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validate entire form
    if (!validateForm()) {
      alert('Please fix the validation errors before submitting.');
      return;
    }

    try {
      const config = getAxiosConfig();
      
      if (modalType === 'create') {
        const response = await axios.post(`${API_BASE_URL}/accounts`, {
          type: 'hospitals',
          data: formData
        }, config);
        
        if (response.data.success) {
          setHospitals(prev => [...prev, response.data.data]);
          alert('Hospital created successfully!');
          setShowModal(false);
          fetchHospitals();
          resetValidation();
        } else {
          throw new Error(response.data.message);
        }
      } else {
        const response = await axios.put(
          `${API_BASE_URL}/accounts/hospitals/${selectedHospital.id}`,
          formData,
          config
        );
        
        if (response.data.success) {
          setHospitals(prev => prev.map(h => 
            h.id === selectedHospital.id ? { ...h, ...formData } : h
          ));
          alert('Hospital updated successfully!');
          setShowModal(false);
          fetchHospitals();
          resetValidation();
        } else {
          throw new Error(response.data.message);
        }
      }
    } catch (error) {
      console.error('Error saving hospital:', error);
      alert(error.response?.data?.message || error.message || 'Failed to save hospital');
    }
  };

  // -------------------
  // Delete Hospital
  // -------------------
  const handleDeleteHospital = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hospital?')) {
      return;
    }

    try {
      const config = getAxiosConfig();
      const response = await axios.delete(`${API_BASE_URL}/accounts/hospitals/${id}`, config);
      
      if (response.data.success) {
        setHospitals(prev => prev.filter(h => h.id !== id));
        alert('Hospital deleted successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error deleting hospital:', error);
      alert(error.response?.data?.message || error.message || 'Failed to delete hospital');
    }
  };

  // -------------------
  // Status color badges
  // -------------------
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // -------------------
  // Format date
  // -------------------
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    resetValidation();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading hospital data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hospital Network</h1>
          <p className="text-gray-600">Verify and manage network hospitals</p>
        </div>
        <button 
          onClick={handleAddHospital}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Hospital
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Total Hospitals</div>
          <div className="text-2xl font-bold text-gray-900">{hospitals.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Verified</div>
          <div className="text-2xl font-bold text-green-600">
            {hospitals.filter((h) => h.status === "verified").length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {hospitals.filter((h) => h.status === "pending").length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Active</div>
          <div className="text-2xl font-bold text-blue-600">
            {hospitals.filter((h) => h.status === "active").length}
          </div>
        </div>
      </div>

      {/* Hospitals Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {hospitals.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hospitals found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first hospital</p>
            <button 
              onClick={handleAddHospital}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Add Hospital
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Hospital Name</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Location</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Contact Person</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Email</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hospitals.map((hospital) => (
                <tr key={hospital.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{hospital.name}</div>
                    <div className="text-sm text-gray-500">{hospital.specialization}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {hospital.city}, {hospital.state}
                    {hospital.address && (
                      <div className="text-sm text-gray-500">{hospital.address}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{hospital.contact_person || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {hospital.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                        hospital.status
                      )}`}
                    >
                      {hospital.status?.charAt(0).toUpperCase() + hospital.status?.slice(1)}
                    </span>
                  </td>

                  {/* ACTION BUTTONS */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {hospital.status !== 'verified' && (
                        <button
                          onClick={() => updateHospitalStatus(hospital.id, "verified")}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Verify"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hospital.status !== 'pending' && (
                        <button
                          onClick={() => updateHospitalStatus(hospital.id, "pending")}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Mark as Pending"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleViewHospital(hospital)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleEditHospital(hospital)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteHospital(hospital.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit/View Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalType === 'create' ? 'Add New Hospital' : 
                   modalType === 'edit' ? 'Edit Hospital' : 'Hospital Details'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {modalType === 'view' ? (
                // VIEW DETAILS FORM (Read-only)
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Building className="h-6 w-6 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedHospital?.name}</h3>
                        <p className="text-gray-600">{selectedHospital?.specialization}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Hospital Name</label>
                        <div className="text-gray-900 font-medium">{selectedHospital?.name}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Email</label>
                        <div className="text-gray-900 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {selectedHospital?.email}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Phone</label>
                        <div className="text-gray-900">{selectedHospital?.phone || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Registration Number</label>
                        <div className="text-gray-900">{selectedHospital?.registration_number || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Specialization</label>
                        <div className="text-gray-900">{selectedHospital?.specialization || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Contact & Location */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 border-b pb-2">Contact & Location</h4>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Contact Person</label>
                        <div className="text-gray-900">{selectedHospital?.contact_person || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Address</label>
                        <div className="text-gray-900">{selectedHospital?.address || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">City</label>
                        <div className="text-gray-900">{selectedHospital?.city || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">State</label>
                        <div className="text-gray-900">{selectedHospital?.state || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">ZIP Code</label>
                        <div className="text-gray-900">{selectedHospital?.zip_code || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Additional Info */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 border-b pb-2">Status Information</h4>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Status</label>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedHospital?.status)}`}>
                          {selectedHospital?.status?.charAt(0).toUpperCase() + selectedHospital?.status?.slice(1)}
                        </span>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Verification Status</label>
                        <div className="text-gray-900">
                          {selectedHospital?.verified_status ? 'Verified' : 'Not Verified'}
                        </div>
                      </div>
                      
                      {selectedHospital?.verified_at && (
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Verified At</label>
                          <div className="text-gray-900">{formatDate(selectedHospital?.verified_at)}</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 border-b pb-2">System Information</h4>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Hospital ID</label>
                        <div className="font-mono text-gray-900">#{selectedHospital?.id}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Created At</label>
                        <div className="text-gray-900">{formatDate(selectedHospital?.created_at)}</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Last Updated</label>
                        <div className="text-gray-900">{formatDate(selectedHospital?.updated_at)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalType('edit');
                        setFormData({
                          name: selectedHospital.name || '',
                          email: selectedHospital.email || '',
                          phone: selectedHospital.phone || '',
                          address: selectedHospital.address || '',
                          city: selectedHospital.city || '',
                          state: selectedHospital.state || '',
                          zip_code: selectedHospital.zip_code || '',
                          registration_number: selectedHospital.registration_number || '',
                          contact_person: selectedHospital.contact_person || '',
                          specialization: selectedHospital.specialization || '',
                          status: selectedHospital.status || 'pending'
                        });
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Hospital
                    </button>
                  </div>
                </div>
              ) : (
                // CREATE/EDIT FORM with validations
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 mb-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderFormField('name', 'Hospital Name', 'text', {
                        placeholder: 'Enter hospital name'
                      })}
                      
                      {renderFormField('email', 'Email', 'email', {
                        placeholder: 'hospital@example.com'
                      })}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {renderFormField('phone', 'Phone', 'tel', {
                        placeholder: '123-456-7890'
                      })}
                      
                      {renderFormField('registration_number', 'Registration Number', 'text', {
                        placeholder: 'REG-12345'
                      })}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {renderFormField('contact_person', 'Contact Person', 'text', {
                        placeholder: 'John Doe'
                      })}
                      
                      {renderFormField('specialization', 'Specialization', 'text', {
                        placeholder: 'Cardiology, Pediatrics, etc.'
                      })}
                    </div>

                    {renderFormField('address', 'Address', 'text', {
                      placeholder: '123 Main Street'
                    })}

                    <div className="grid md:grid-cols-3 gap-4">
                      {renderFormField('city', 'City', 'text', {
                        placeholder: 'New York'
                      })}
                      
                      {renderFormField('state', 'State', 'text', {
                        placeholder: 'NY'
                      })}
                      
                      {renderFormField('zip_code', 'ZIP Code', 'text', {
                        placeholder: '10001'
                      })}
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Status</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="verified">Verified</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Display form-level errors if any */}
                  {Object.keys(errors).length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 font-medium mb-2">
                        Please fix the following errors:
                      </p>
                      <ul className="list-disc list-inside text-red-600 text-sm">
                        {Object.values(errors).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="h-5 w-5" />
                      {modalType === 'create' ? 'Add Hospital' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Dashboard Sidebar - Complaints tab removed
function DashboardSidebar({ 
  currentView, 
  onViewChange, 
  isOpen, 
  onToggle,
}) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'audit', label: 'Audit Logs', icon: Archive },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon },
    { id: 'commissions', label: 'Commissions', icon: Percent },
    { id: 'hospitals', label: 'Hospitals', icon: Hospital },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('healthinsura360_token');
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-blue-800 to-blue-900 text-white transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-700">
          <div className={`flex items-center gap-2 ${!isOpen && 'justify-center'}`}>
            {/* Logo */}
            <div className="w-8 h-8">
              <img 
                src={Logo} 
                alt="HealthInsura360 Logo" 
                className="w-full h-full object-contain rounded-lg bg-white p-1"
              />
            </div>
            {isOpen && (
              <div>
                <span className="font-bold text-lg">HealthInsura360</span>
                <div className="text-xs text-blue-200">Admin Panel</div>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <ul className="space-y-2 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-blue-100 hover:bg-blue-800'
                    } ${!isOpen && 'justify-center'}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 transition-colors ${
              !isOpen && 'justify-center'
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

//Admin Dashboard
export function AdminDashboard() {
  const [currentView, setCurrentView] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('healthinsura360_token');
    if (!token) {
      // Redirect to login if no token
      window.location.href = '/login';
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview />;
      case 'accounts':
        return <AccountsManagement />;
      case 'policies':
        return <PoliciesManagement />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'audit':
        return <AuditLogs />;
      case 'payments':
        return <PaymentTransactions />;
      case 'commissions':
        return <AgentCommissions />;
      case 'hospitals':
        return <HospitalNetwork />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {renderView()}
      </div>
    </div>
  );
}

export default AdminDashboard;