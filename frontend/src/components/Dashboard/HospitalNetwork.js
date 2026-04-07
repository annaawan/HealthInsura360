import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Building, Mail, Check, Clock, Eye, Edit, Trash2, 
  XCircle, Save, RefreshCw, AlertCircle, CheckCircle, X 
} from 'lucide-react';
import { API_BASE_URL, getAxiosConfig } from '../../config';

// Hospital Network Component with Validations
function HospitalNetwork() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', or 'view'
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    active: 0
  });
  
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
    // Get token with correct key
    const token = localStorage.getItem('healthinsura360_token');
    
    console.log('🔍 Fetching hospitals with token:', token ? '✅ Present' : '❌ Missing');
    
    const config = {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    };
    
    console.log('📡 Making API call to:', `${API_BASE_URL}/hospitals`);
    
    const res = await axios.get(`${API_BASE_URL}/hospitals`, config);
    
    console.log('✅ Hospital API response:', res.data);
    console.log('Response type:', typeof res.data);
    console.log('Is array?', Array.isArray(res.data));
    
    // Handle different response structures
    let hospitalsData = [];
    let statsData = {
      total: 0,
      verified: 0,
      pending: 0,
      active: 0
    };
    
    if (res.data.success === true) {
      // Case 1: { success: true, hospitals: [...], total: X, verified: Y, ... }
      console.log('Case 1: Success response with hospitals array');
      hospitalsData = res.data.hospitals || [];
      statsData = {
        total: res.data.total || hospitalsData.length,
        verified: res.data.verified || hospitalsData.filter(h => h.status === 'verified').length,
        pending: res.data.pending || hospitalsData.filter(h => h.status === 'pending').length,
        active: res.data.active || hospitalsData.filter(h => h.status === 'active').length
      };
    } else if (Array.isArray(res.data)) {
      // Case 2: Direct array of hospitals
      console.log('Case 2: Direct array response');
      hospitalsData = res.data;
      statsData = {
        total: hospitalsData.length,
        verified: hospitalsData.filter(h => h.status === 'verified').length,
        pending: hospitalsData.filter(h => h.status === 'pending').length,
        active: hospitalsData.filter(h => h.status === 'active').length
      };
    } else if (res.data.data && Array.isArray(res.data.data)) {
      // Case 3: { data: [...] }
      console.log('Case 3: Data wrapper response');
      hospitalsData = res.data.data;
      statsData = {
        total: hospitalsData.length,
        verified: hospitalsData.filter(h => h.status === 'verified').length,
        pending: hospitalsData.filter(h => h.status === 'pending').length,
        active: hospitalsData.filter(h => h.status === 'active').length
      };
    } else {
      console.log('❓ Unknown response structure:', res.data);
    }
    
    console.log('📊 Setting hospitals:', hospitalsData.length, 'records');
    console.log('📊 Setting stats:', statsData);
    
    setHospitals(hospitalsData);
    setStats(statsData);
    
  } catch (error) {
    console.error("❌ Error fetching hospitals:", error);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      
      if (error.response.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('healthinsura360_token');
        window.location.href = '/login';
      }
    }
    setHospitals([]);
    setStats({
      total: 0,
      verified: 0,
      pending: 0,
      active: 0
    });
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchHospitals();
  }, []);

  // --------------------------------------------------------
  // Update hospital verification status - FIXED to use correct endpoint
  // --------------------------------------------------------
  const updateHospitalStatus = async (hospitalId, newStatus) => {
    try {
      const config = getAxiosConfig();
      
      // FIXED: Changed from /accounts/hospitals/${hospitalId} to /hospitals/${hospitalId}/status
      const response = await axios.put(
        `${API_BASE_URL}/hospitals/${hospitalId}/status`,
        { status: newStatus },
        config
      );
      
      if (response.data.success) {
        setHospitals((prev) =>
          prev.map((h) =>
            h.id === hospitalId ? { ...h, status: newStatus } : h
          )
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          [newStatus]: (prev[newStatus] || 0) + 1,
          [hospitals.find(h => h.id === hospitalId)?.status || '']: 
            (prev[hospitals.find(h => h.id === hospitalId)?.status || ''] || 1) - 1
        }));
        
        alert(`Hospital status updated to ${newStatus}!`);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  // NEW: Approve hospital with registration number generation
 const handleApproveHospital = async (hospitalId, hospitalName) => {
  if (!window.confirm(`Approve ${hospitalName}? A registration number will be generated.`)) {
    return;
  }

  try {
    // ✅ FIXED: Use the correct key name
    const token = localStorage.getItem('healthinsura360_token');
    
    console.log('🔍 Token from localStorage:', token ? '✅ Present' : '❌ MISSING');
    
    if (!token) {
      alert('You are not logged in. Please login again.');
      window.location.href = '/login';
      return;
    }

    // Make sure config has the token
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log('Sending approve request with token:', token.substring(0, 20) + '...');
    
    const response = await axios.put(
      `${API_BASE_URL}/hospitals/approve/${hospitalId}`,
      {},
      config
    );
    
    if (response.data.success) {
      alert(`✅ Hospital approved! Registration Number: ${response.data.hospital.registrationNumber}`);
      fetchHospitals(); // Refresh the list
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error("Failed to approve hospital:", error);
    
    // Handle 401 specifically
    if (error.response?.status === 401) {
      alert('Session expired. Please login again.');
      // ✅ FIXED: Use the correct key name here too
      localStorage.removeItem('healthinsura360_token');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('accountType');
      window.location.href = '/login';
    } else {
      alert(error.response?.data?.message || 'Failed to approve hospital');
    }
  }
};
  // NEW: Reject hospital
  const handleRejectHospital = async (hospitalId, hospitalName) => {
    const reason = window.prompt(`Enter reason for rejecting ${hospitalName}:`);
    
    try {
      const config = getAxiosConfig();
      
      const response = await axios.put(
        `${API_BASE_URL}/hospitals/reject/${hospitalId}`,
        { reason },
        config
      );
      
      if (response.data.success) {
        alert(`❌ Hospital rejected`);
        fetchHospitals(); // Refresh the list
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Failed to reject hospital:", error);
      alert(error.response?.data?.message || 'Failed to reject hospital');
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
        // FIXED: Changed to use correct endpoint
        const response = await axios.post(`${API_BASE_URL}/hospitals`, formData, config);
        
        if (response.data.success) {
          setHospitals(prev => [...prev, response.data.hospital]);
          alert('Hospital created successfully!');
          setShowModal(false);
          fetchHospitals();
          resetValidation();
        } else {
          throw new Error(response.data.message);
        }
      } else {
        // FIXED: Changed from /accounts/hospitals/${selectedHospital.id} to /hospitals/${selectedHospital.id}
        const response = await axios.put(
          `${API_BASE_URL}/hospitals/${selectedHospital.id}`,
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
      // FIXED: Changed from /accounts/hospitals/${id} to /hospitals/${id}
      const response = await axios.delete(`${API_BASE_URL}/hospitals/${id}`, config);
      
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
      case "rejected":
        return "bg-red-100 text-red-800";
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


  // Add this function to HospitalNetwork.js
const testAuthentication = async () => {
  try {
    const token = localStorage.getItem('token');
    console.log('Testing auth with token:', token ? 'Present' : 'Missing');
    
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const response = await axios.get(`${API_BASE_URL}/hospitals/test-auth`, config);
    console.log('Auth test response:', response.data);
    return true;
  } catch (error) {
    console.error('Auth test failed:', error.response?.data || error.message);
    return false;
  }
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
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hospital Network</h1>
          <p className="text-gray-600">Verify and manage network hospitals</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchHospitals}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
          <button 
            onClick={handleAddHospital}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Hospital
          </button>
        </div>
      </div>

      {/* Stats - Now showing real data */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Total Hospitals</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Verified</div>
          <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Active</div>
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
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
                <tr key={hospital.id || hospital.hospital_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{hospital.name}</div>
                    <div className="text-sm text-gray-500">{hospital.specialization}</div>
                    {hospital.registration_number && (
                      <div className="text-xs text-gray-400 mt-1">
                        Reg: {hospital.registration_number}
                      </div>
                    )}
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
                      <span className="text-sm">{hospital.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        hospital.status
                      )}`}
                    >
                      {hospital.status?.charAt(0).toUpperCase() + hospital.status?.slice(1)}
                    </span>
                  </td>

                  {/* ACTION BUTTONS - Updated for approval flow */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Show approve button only for pending hospitals */}
                      {hospital.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveHospital(hospital.id || hospital.hospital_id, hospital.name)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve Hospital"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRejectHospital(hospital.id || hospital.hospital_id, hospital.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject Hospital"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {/* Status toggle buttons (keep existing) */}
                      {hospital.status !== 'verified' && hospital.status !== 'pending' && (
                        <button
                          onClick={() => updateHospitalStatus(hospital.id || hospital.hospital_id, "verified")}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Mark as Verified"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hospital.status !== 'pending' && hospital.status !== 'rejected' && (
                        <button
                          onClick={() => updateHospitalStatus(hospital.id || hospital.hospital_id, "pending")}
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
                        onClick={() => handleDeleteHospital(hospital.id || hospital.hospital_id)}
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

      {/* Create/Edit/View Modal (unchanged) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          {/* ... modal content (same as before) ... */}
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
                    {selectedHospital?.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseModal();
                            handleApproveHospital(selectedHospital.id || selectedHospital.hospital_id, selectedHospital.name);
                          }}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseModal();
                            handleRejectHospital(selectedHospital.id || selectedHospital.hospital_id, selectedHospital.name);
                          }}
                          className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
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

export default HospitalNetwork;