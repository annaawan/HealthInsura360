import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Logo from "../assets/HealthInsura360.png";
import { auditLogger } from '../utils/auditLogger';

// Icons from lucide-react
import { 
  Plus,
  Check, 
  Edit, 
  Building, 
  Mail,
  LayoutDashboard, 
  Users, 
  FileText, 
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
  PieChart as PieChartIcon,
  Activity,
  MessageSquare,
  CreditCard as CreditCardIcon,
  Percent,
  Hospital,
  Archive,
  RefreshCw,
  Upload,
  Download as DownloadIcon,
  Calendar,
  Clock,
  Users as UsersIcon,
  Briefcase,
  User,
  Save,
  XCircle,
  AlertCircle,
  Eye, 
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

//  const deleteAccount = async (id) => {
//   if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
//     return;
//   }

//   try {
//     const config = getAxiosConfig();
//     const response = await axios.delete(`${API_BASE_URL}/accounts/${activeTab}/${id}`, config);
    
//     if (!response.data.success) {
//       throw new Error(response.data.message);
//     }
    
//     // Update local state
//     const setter = getCurrentDataSetter();
//     setter(prev => prev.filter(item => item.id !== id));
    
//     alert(response.data.message || 'Account deleted successfully!');
//     fetchData(); // Reload page to reflect changes
//   } catch (err) {
//     console.error('Error deleting account:', err);
//     alert(err.response?.data?.message || err.message || 'Failed to delete account');
//   }
// };

// const handleSubmit = async (e) => {
//   e.preventDefault();
  
//   try {
//     const config = getAxiosConfig();
//     console.log('🔄 Submitting form for:', activeTab);
//     console.log('📋 Form data:', formData);
    
//     // Prepare clean data for API
//     const prepareApiData = () => {
//       // Start with all form data
//       const apiData = { ...formData };
      
//       // Remove password_hash if it's empty (for edit mode)
//       if (apiData.password_hash === '') {
//         delete apiData.password_hash;
//       }
      
//       // For hospitals, NEVER send password_hash
//       if (activeTab === 'hospitals' && apiData.password_hash !== undefined) {
//         console.log('⚠️ Removing password_hash for hospital');
//         delete apiData.password_hash;
//       }
      
//       console.log('📤 Cleaned API data:', apiData);
//       return apiData;
//     };
    
//     const apiData = prepareApiData();
    
//     // Map frontend tab to backend type
//     const backendTypeMap = {
//       'customers': 'customers',
//       'agents': 'agents',
//       'hospitals': 'hospitals'
//     };
    
//     const backendType = backendTypeMap[activeTab] || activeTab;
//     console.log('🎯 Backend type:', backendType);
    
//     if (modalType === 'create') {
//       // CREATE new account
//       const postPayload = {
//         type: backendType,
//         data: apiData
//       };
      
//       console.log('🚀 Sending POST:', postPayload);
      
//       const response = await axios.post(
//         `${API_BASE_URL}/accounts`,
//         postPayload,
//         config
//       );
      
//       console.log('✅ Response:', response.data);
      
//       if (response.data.success) {
//         // Update local state
//         const setter = getCurrentDataSetter();
//         setter(prev => [...prev, response.data.data]);
        
//         alert('Account created successfully!');
//         setShowModal(false);
//         fetchData(); // Refresh data
//       } else {
//         throw new Error(response.data.message || 'Creation failed');
//       }
      
//     } else {
//       // UPDATE existing account
//       console.log(`🚀 Sending PUT to: ${API_BASE_URL}/accounts/${backendType}/${editingAccount.id}`);
      
//       const response = await axios.put(
//         `${API_BASE_URL}/accounts/${backendType}/${editingAccount.id}`,
//         apiData,
//         config
//       );
      
//       console.log('✅ Response:', response.data);
      
//       if (response.data.success) {
//         // Update local state
//         const setter = getCurrentDataSetter();
//         setter(prev => prev.map(item => 
//           item.id === editingAccount.id ? { ...item, ...apiData } : item
//         ));
        
//         alert('Account updated successfully!');
//         setShowModal(false);
//         fetchData(); // Refresh data
//       } else {
//         throw new Error(response.data.message || 'Update failed');
//       }
//     }
    
//   } catch (err) {
//     console.error('❌ Error:', err);
//     console.error('❌ Response data:', err.response?.data);
//     console.error('❌ Request config:', err.config);
    
//     let errorMessage = 'Failed to save account. ';
    
//     if (err.response?.data?.message) {
//       errorMessage += `Error: ${err.response.data.message}`;
      
//       // Give specific help based on error
//       if (err.response.data.message.includes('invalid account type')) {
//         errorMessage += '\n\nTry changing the account type in the backendTypeMap object.';
//         console.log('💡 Try these type values:', ['user', 'client', 'member', 'provider', 'clinic']);
//       }
      
//       if (err.response.data.message.includes('column') && err.response.data.message.includes('does not exist')) {
//         errorMessage += '\n\nDatabase column mismatch. Check if all form fields exist in the database table.';
//       }
//     }
    
//     alert(errorMessage);
//   }
// };

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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-2">Email *</label>
          <input
            type="email"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-700 mb-2">Phone</label>
        <input
          type="tel"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.password_hash}
              onChange={(e) => setFormData({...formData, password_hash: e.target.value})}
            />
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

        <div>
          <label className="block text-gray-700 mb-2">ZIP Code</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={formData.zip_code}
            onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
          />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.password_hash}
              onChange={(e) => setFormData({...formData, password_hash: e.target.value})}
            />
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
  {/* Keep the existing status field here */}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.commission_rate}
              onChange={(e) => setFormData({...formData, commission_rate: e.target.value})}
            />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.total_sales}
              onChange={(e) => setFormData({...formData, total_sales: e.target.value})}
            />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.zip_code}
              onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
            />
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
function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UsersIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
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
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        defaultValue="Admin"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        defaultValue="User"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      defaultValue="admin@healthinsura360.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-gray-700">New user registrations</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-gray-700">New claims submitted</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-gray-700">System alerts</span>
                    </label>
                  </div>

                  <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-gray-900 font-medium mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Current Password</label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Update Security
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// 2. Policies Management Component
function PoliciesManagement() {
  const [policies] = useState([
    { id: 1, name: 'Basic Health Plan', type: 'Basic', premium: 99, coverage: '$100,000', status: 'Active', subscribers: 1250, createdAt: '2024-01-01' },
    { id: 2, name: 'Standard Family Plan', type: 'Standard', premium: 199, coverage: '$250,000', status: 'Active', subscribers: 850, createdAt: '2024-01-15' },
    { id: 3, name: 'Premium Gold Plan', type: 'Premium', premium: 299, coverage: '$500,000', status: 'Active', subscribers: 420, createdAt: '2024-02-01' },
    { id: 4, name: 'Student Health Plan', type: 'Special', premium: 49, coverage: '$50,000', status: 'Inactive', subscribers: 180, createdAt: '2024-02-15' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Policies Management</h1>
          <p className="text-gray-600">Manage insurance policies and plans</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          Create Policy
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search policies..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>All Types</option>
            <option>Basic</option>
            <option>Standard</option>
            <option>Premium</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{policy.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    policy.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {policy.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-600 text-sm">Premium</div>
                    <div className="text-lg font-bold text-gray-900">${policy.premium}/month</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-sm">Coverage</div>
                    <div className="text-lg font-bold text-green-600">{policy.coverage}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{policy.subscribers} subscribers</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Reports Component
function Reports() {
  const [selectedReport, setSelectedReport] = useState('monthly');
  const [dateRange, setDateRange] = useState('last-30-days');

  const reports = [
    { id: 'monthly', name: 'Monthly Performance', icon: Activity },
    { id: 'financial', name: 'Financial Summary', icon: DollarSign },
    { id: 'claims', name: 'Claims Analysis', icon: FileBarChart },
    { id: 'user', name: 'User Growth', icon: TrendingUp },
    { id: 'agent', name: 'Agent Performance', icon: UsersIcon },
    { id: 'hospital', name: 'Hospital Network', icon: Building },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
          <p className="text-gray-600">Generate and view system reports</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="last-7-days">Last 7 Days</option>
            <option value="last-30-days">Last 30 Days</option>
            <option value="last-quarter">Last Quarter</option>
            <option value="last-year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-6 rounded-xl border transition-all ${
                selectedReport === report.id
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedReport === report.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    selectedReport === report.id ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Generate detailed report</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {reports.find(r => r.id === selectedReport)?.name} Preview
        </h3>
        
        <div className="space-y-6">
          {/* Chart Placeholder */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Report visualization will appear here</p>
              <p className="text-sm text-gray-500 mt-1">Generate report to view data</p>
            </div>
          </div>

          {/* Report Actions */}
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <RefreshCw className="h-5 w-5" />
              Generate Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <DownloadIcon className="h-5 w-5" />
              Download PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="h-5 w-5" />
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. Analytics Dashboard Component
function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('monthly');
  
  const analyticsData = {
    monthly: [
      { month: 'Jan', users: 4000, revenue: 2400, claims: 240 },
      { month: 'Feb', users: 3000, revenue: 1398, claims: 221 },
      { month: 'Mar', users: 2000, revenue: 9800, claims: 229 },
      { month: 'Apr', users: 2780, revenue: 3908, claims: 200 },
      { month: 'May', users: 1890, revenue: 4800, claims: 218 },
      { month: 'Jun', users: 2390, revenue: 3800, claims: 250 },
    ],
    weekly: [
      { week: 'Week 1', users: 1000, revenue: 800, claims: 60 },
      { week: 'Week 2', users: 1200, revenue: 900, claims: 70 },
      { week: 'Week 3', users: 800, revenue: 600, claims: 50 },
      { week: 'Week 4', users: 1500, revenue: 1100, claims: 80 },
    ]
  };

  const metrics = [
    { label: 'Total Users', value: '45,892', change: '+12.5%', isPositive: true, icon: Users },
    { label: 'Monthly Revenue', value: '$2.4M', change: '+8.2%', isPositive: true, icon: DollarSign },
    { label: 'Active Claims', value: '1,247', change: '-3.1%', isPositive: false, icon: FileText },
    { label: 'Avg. Claim Time', value: '2.4 days', change: '-0.5%', isPositive: true, icon: Clock },
  ];

  const distributionData = [
    { name: 'Basic Plan', value: 400, color: '#3b82f6' },
    { name: 'Standard Plan', value: 300, color: '#10b981' },
    { name: 'Premium Plan', value: 200, color: '#8b5cf6' },
    { name: 'Custom Plan', value: 100, color: '#f59e0b' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights and performance metrics</p>
        </div>
        <select 
          className="px-4 py-2 border border-gray-300 rounded-lg"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className={`flex items-center gap-1 ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  <span className="text-sm">{metric.change}</span>
                </div>
              </div>
              <div className="text-gray-600 text-sm mb-1">{metric.label}</div>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData[timeRange]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={timeRange === 'monthly' ? 'month' : 'week'} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData[timeRange]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={timeRange === 'monthly' ? 'month' : 'week'} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'New user registered', time: '5 min ago', user: 'John Smith' },
              { action: 'Claim approved', time: '15 min ago', user: 'Sarah Johnson' },
              { action: 'Payment processed', time: '30 min ago', user: 'Mike Chen' },
              { action: 'Agent commission updated', time: '1 hour ago', user: 'David Wilson' },
              { action: 'Hospital verified', time: '2 hours ago', user: 'City General' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
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

// 6. Complaints Management Component
function ComplaintsManagement() {
  const [complaints, setComplaints] = useState([
    { id: 1, user: 'John Smith', email: 'john@email.com', type: 'User', subject: 'Claim processing delay', message: 'My claim has been pending for over 2 weeks...', status: 'open', createdAt: '2024-01-15' },
    { id: 2, user: 'City General Hospital', email: 'admin@citygeneral.com', type: 'Hospital', subject: 'Payment issue', message: 'Last month payment not received...', status: 'in-progress', createdAt: '2024-01-14' },
    { id: 3, user: 'David Wilson', email: 'david@agent.com', type: 'Agent', subject: 'Commission calculation', message: 'Commission for December seems incorrect...', status: 'resolved', createdAt: '2024-01-13' },
  ]);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  const handleReply = (complaintId) => {
    // In real app, this would send email
    alert(`Reply sent to ${complaints.find(c => c.id === complaintId)?.email}`);
    setReplyMessage('');
  };

  const updateComplaintStatus = (complaintId, newStatus) => {
    setComplaints(prev => prev.map(c => 
      c.id === complaintId ? { ...c, status: newStatus } : c
    ));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complaints Inbox</h1>
          <p className="text-gray-600">Manage and respond to user complaints</p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="text-gray-700">Unread: </span>
          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm">
            {complaints.filter(c => c.status === 'open').length}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Complaints List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
              {complaints.map((complaint) => (
                <button
                  key={complaint.id}
                  onClick={() => setSelectedComplaint(complaint)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedComplaint?.id === complaint.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{complaint.user}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(complaint.status)}`}>
                          {complaint.status}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium text-sm mb-1">{complaint.subject}</p>
                      <p className="text-gray-600 text-sm truncate">{complaint.message.substring(0, 60)}...</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{complaint.type}</span>
                        <span className="text-xs text-gray-500">{complaint.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Complaint Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {selectedComplaint ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedComplaint.subject}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gray-600">From: {selectedComplaint.user}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">{selectedComplaint.email}</span>
                      <span className="text-gray-400">•</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedComplaint.status)}`}>
                        {selectedComplaint.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateComplaintStatus(selectedComplaint.id, 'in-progress')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Mark In Progress
                    </button>
                    <button 
                      onClick={() => updateComplaintStatus(selectedComplaint.id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-gray-600 text-sm mb-2">Message:</div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900">{selectedComplaint.message}</p>
                  </div>
                </div>

                <div>
                  <div className="text-gray-600 text-sm mb-2">Reply:</div>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex justify-end mt-4">
                    <button 
                      onClick={() => handleReply(selectedComplaint.id)}
                      disabled={!replyMessage.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Mail className="h-5 w-5" />
                      Send Reply
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a complaint</h3>
                <p className="text-gray-600">Choose a complaint from the list to view details and respond</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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

// Hospital Network Component
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
    setShowModal(true);
  };

  // -------------------
  // View Hospital Details
  // -------------------
  const handleViewHospital = (hospital) => {
    setModalType('view');
    setSelectedHospital(hospital);
    setShowModal(true);
  };

  // -------------------
  // Handle Form Submit
  // -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
                  onClick={() => setShowModal(false)}
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
                      onClick={() => setShowModal(false)}
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
                // CREATE/EDIT FORM
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 mb-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Hospital Name *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
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

                    <div>
                      <label className="block text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
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
                      <div>
                        <label className="block text-gray-700 mb-2">ZIP Code</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={formData.zip_code}
                          onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Status</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="verified">Verified</option>
                        <option value="inactive">Inactive</option>
                      </select>
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
//Dashboard Sidebar
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
    { id: 'complaints', label: 'Complaints', icon: MessageSquare },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon },
    { id: 'commissions', label: 'Commissions', icon: Percent },
    { id: 'hospitals', label: 'Hospitals', icon: Hospital },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
  localStorage.removeItem('healthinsura360_token');
  // Redirect to login page
  window.location.href = '/login'; // or wherever your login page is
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
//Admin DDashboard
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
        return <AccountsManagement />; // This is the updated component
      case 'policies':
        return <PoliciesManagement />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'audit':
        return <AuditLogs />;
      case 'complaints':
        return <ComplaintsManagement />;
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