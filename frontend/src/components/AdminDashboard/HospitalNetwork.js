import React, { useState, useEffect} from 'react';
import { API_BASE_URL, getAxiosConfig } from '../../config';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { 
  Plus, 
  Check, 
  Edit, 
  Building, 
  Mail,
  Trash2,
  Clock,
  Eye,
  XCircle,
  Save,
  Send
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);

function HospitalNetwork() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  
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

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation rules
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

  const validateField = (fieldName, value) => {
    const rules = validationRules[fieldName];
    const newErrors = { ...errors };

    if (!rules) return true;

    if (!value && !rules.required) {
      delete newErrors[fieldName];
      setErrors(newErrors);
      return true;
    }

    if (rules.required && !value?.trim()) {
      newErrors[fieldName] = `${fieldName.replace('_', ' ')} is required`;
      setErrors(newErrors);
      return false;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      newErrors[fieldName] = rules.message;
      setErrors(newErrors);
      return false;
    }

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

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, formData[fieldName]);
  };

  const renderFormField = (fieldName, label, type = 'text', options = {}) => {
    const isRequired = validationRules[fieldName]?.required;
    const hasError = errors[fieldName] && touched[fieldName];
    
    return (
      <div>
        <label className="block text-gray-700 mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
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
        {hasError && <p className="mt-1 text-sm text-red-600">{errors[fieldName]}</p>}
      </div>
    );
  };

  const resetValidation = () => {
    setErrors({});
    setTouched({});
  };

  // // Fetch hospitals from backend
  // const fetchHospitals = async () => {
  //   setLoading(true);
  //   try {
  //     const config = getAxiosConfig();
  //     let response;
  //     try {
  //       response = await axios.get(`${API_BASE_URL}/hospitals`, config);
  //       if (response.data.success && response.data.hospitals) {
  //         setHospitals(response.data.hospitals);
  //         setLoading(false);
  //         return;
  //       }
  //     } catch (err) {
  //       console.log('Trying accounts endpoint...');
  //     }
      
  //     response = await axios.get(`${API_BASE_URL}/accounts/hospitals`, config);
  //     if (response.data.success) {
  //       setHospitals(response.data.data || []);
  //     } else {
  //       console.error("Failed to fetch hospitals:", response.data.message);
  //       setHospitals([]);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching hospitals:", error);
  //     setHospitals([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
// Add this helper function before fetchHospitals
const parseHospitalDocuments = (hospital) => {
    let documents = [];
    
    // Check if documents exist in various possible formats
    if (hospital.documents) {
        if (typeof hospital.documents === 'string') {
            try {
                documents = JSON.parse(hospital.documents);
            } catch (e) {
                documents = [{ file_name: hospital.documents, file_path: hospital.documents }];
            }
        } else if (Array.isArray(hospital.documents)) {
            documents = hospital.documents;
        } else if (typeof hospital.documents === 'object') {
            documents = [hospital.documents];
        }
    }
    
    // Also check if there's a separate documents_data field
    if (hospital.documents_data) {
        try {
            const parsed = typeof hospital.documents_data === 'string' 
                ? JSON.parse(hospital.documents_data) 
                : hospital.documents_data;
            if (Array.isArray(parsed)) {
                documents = [...documents, ...parsed];
            }
        } catch (e) {}
    }
    
    return documents;
};

// Update fetchHospitals function
const fetchHospitals = async () => {
    setLoading(true);
    try {
        const config = getAxiosConfig();
        let response;
        try {
            response = await axios.get(`${API_BASE_URL}/hospitals`, config);
            if (response.data.success && response.data.hospitals) {
                // Parse documents for each hospital
                const hospitalsWithDocs = response.data.hospitals.map(h => ({
                    ...h,
                    documents: parseHospitalDocuments(h)
                }));
                setHospitals(hospitalsWithDocs);
                setLoading(false);
                return;
            }
        } catch (err) {
            console.log('Trying accounts endpoint...');
        }
        
        response = await axios.get(`${API_BASE_URL}/accounts/hospitals`, config);
        if (response.data.success) {
            const hospitalsWithDocs = (response.data.data || []).map(h => ({
                ...h,
                documents: parseHospitalDocuments(h)
            }));
            setHospitals(hospitalsWithDocs);
            // After fetching hospitals
console.log('📋 Raw hospital data (first hospital):', hospitals[0]);
console.log('📋 Documents field:', hospitals[0]?.documents);
console.log('📋 Documents type:', typeof hospitals[0]?.documents);
        } else {
            console.error("Failed to fetch hospitals:", response.data.message);
            setHospitals([]);
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

  // Approve Hospital with Email Sending
  const approveHospital = async (hospitalId, hospitalEmail, hospitalName) => {
    if (!window.confirm(`Verify and approve ${hospitalName}? This will send an email with registration number.`)) {
      return;
    }

    setSendingEmail(true);
    try {
      const config = getAxiosConfig();
      
      const response = await axios.put(
        `${API_BASE_URL}/hospitals/approve/${hospitalId}`,
        {},
        config
      );
      
      if (response.data.success) {
        setHospitals((prev) =>
          prev.map((h) =>
            h.hospital_id === hospitalId || h.id === hospitalId
              ? { 
                  ...h, 
                  status: 'verified', 
                  verified_status: true,
                  registration_number: response.data.hospital?.registration_number 
                }
              : h
          )
        );
        
        alert(`✅ Hospital approved successfully!\n\nAn email with registration number has been sent to ${hospitalEmail}`);
        fetchHospitals();
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (error) {
      console.error("Failed to approve hospital:", error);
      alert(error.response?.data?.message || error.message || 'Failed to approve hospital. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Reject Hospital with Email
  const rejectHospital = async (hospitalId, hospitalEmail, hospitalName) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    if (!window.confirm(`Reject ${hospitalName}?`)) {
      return;
    }

    try {
      const config = getAxiosConfig();
      
      const response = await axios.put(
        `${API_BASE_URL}/hospitals/reject/${hospitalId}`,
        { reason: reason || 'Not specified' },
        config
      );
      
      if (response.data.success) {
        setHospitals((prev) =>
          prev.map((h) =>
            h.hospital_id === hospitalId || h.id === hospitalId
              ? { ...h, status: 'not-verified', verified_status: false }
              : h
          )
        );
        
        alert(`❌ Hospital rejected.\n\nA rejection email has been sent to ${hospitalEmail}`);
        fetchHospitals();
      } else {
        throw new Error(response.data.message || 'Rejection failed');
      }
    } catch (error) {
      console.error("Failed to reject hospital:", error);
      alert(error.response?.data?.message || error.message || 'Failed to reject hospital');
    }
  };

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

  const handleViewHospital = (hospital) => {
    setModalType('view');
    setSelectedHospital(hospital);
    resetValidation();
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      alert('Please fix the validation errors before submitting.');
      return;
    }

    try {
      const config = getAxiosConfig();
      
      if (modalType === 'create') {
        const response = await axios.post(`${API_BASE_URL}/hospitals/register`, formData, config);
        
        if (response.data.success) {
          alert('Hospital created successfully!');
          setShowModal(false);
          fetchHospitals();
          resetValidation();
        } else {
          throw new Error(response.data.message);
        }
      } else {
        const response = await axios.put(
          `${API_BASE_URL}/hospitals/${selectedHospital.hospital_id || selectedHospital.id}`,
          formData,
          config
        );
        
        if (response.data.success) {
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

  const handleDeleteHospital = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hospital?')) {
      return;
    }

    try {
      const config = getAxiosConfig();
      const response = await axios.delete(`${API_BASE_URL}/hospitals/${id}`, config);
      
      if (response.data.success) {
        setHospitals(prev => prev.filter(h => (h.hospital_id || h.id) !== id));
        alert('Hospital deleted successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error deleting hospital:', error);
      alert(error.response?.data?.message || error.message || 'Failed to delete hospital');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "not-verified":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

      {/* Stats - Removed Active stat since 'active' is not a valid enum value */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Total Hospitals</div>
          <div className="text-2xl font-bold text-gray-900">{hospitals.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Verified / Active</div>
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
                <tr key={hospital.hospital_id || hospital.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{hospital.name}</div>
                    <div className="text-sm text-gray-500">{hospital.specialization}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {hospital.city}, {hospital.state}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{hospital.contact_person || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {hospital.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(hospital.status)}`}>
                      {hospital.status?.charAt(0).toUpperCase() + hospital.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* VERIFY BUTTON - Only for pending hospitals */}
                      {hospital.status === 'pending' && (
                        <button
                          onClick={() => approveHospital(
                            hospital.hospital_id || hospital.id, 
                            hospital.email, 
                            hospital.name
                          )}
                          disabled={sendingEmail}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                          title="Verify & Send Registration Email"
                        >
                          {sendingEmail ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      
                      {/* REJECT BUTTON - Only for pending hospitals */}
                      {hospital.status === 'pending' && (
                        <button
                          onClick={() => rejectHospital(
                            hospital.hospital_id || hospital.id, 
                            hospital.email, 
                            hospital.name
                          )}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Reject Hospital"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}

                      {/* VIEW BUTTON - All hospitals */}
                      <button
                        onClick={() => handleViewHospital(hospital)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* EDIT BUTTON - All hospitals */}
                      <button
                        onClick={() => handleEditHospital(hospital)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {/* DELETE BUTTON - All hospitals */}
                      <button
                        onClick={() => handleDeleteHospital(hospital.hospital_id || hospital.id)}
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

      {/* Create/Edit/View Modal - Keep your existing modal code */}
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
    // VIEW DETAILS FORM (Read-only) WITH DOCUMENTS
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
                    <div className="font-mono text-gray-900">#{selectedHospital?.hospital_id || selectedHospital?.id}</div>
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

        {/* ✅ DOCUMENTS SECTION - FIXED FOR CORRECT URL */}
<div className="space-y-4">
    <h4 className="font-medium text-gray-900 border-b pb-2">Uploaded Documents</h4>
    
    {selectedHospital?.documents && selectedHospital.documents.length > 0 ? (
        <div className="grid gap-3">
            {selectedHospital.documents.map((doc, index) => {
                // Handle different document formats
                let fileName = '';
                let filePath = '';
                let fileType = '';
                let fileId = null;
                
                if (typeof doc === 'string') {
                    filePath = doc;
                    fileName = doc.split('/').pop();
                } else if (typeof doc === 'object') {
                    fileName = doc.file_name || doc.originalName || doc.name || doc.filename || `Document ${index + 1}`;
                    filePath = doc.file_url || doc.url || doc.path || doc.file_path || doc.filename;
                    fileType = doc.file_type || doc.type;
                    fileId = doc.document_id || doc.id;
                }
                
                // ✅ IMPORTANT: Construct correct URL for hospital documents
let fullUrl = null;

if (filePath) {
    // Check if it's already a full URL
    if (filePath.startsWith('http')) {
        fullUrl = filePath;
    } 
    // Check if it already has the correct path
    else if (filePath.includes('/uploads/')) {
        fullUrl = `${API_BASE_URL}${filePath.startsWith('/') ? filePath : '/' + filePath}`;
    }
    // If it's just a filename, construct the correct path
    else {
        // The files are saved as hospital_{originalName}_{timestamp}_{random}.ext
        // Construct using the base URL without /api prefix
        const baseUrl = API_BASE_URL.replace('/api', '');
        
        if (fileName && fileName.startsWith('hospital_')) {
            // ✅ FIXED: Assign to outer fullUrl variable
            fullUrl = `${baseUrl}/uploads/hospital-documents/${fileName}`;
        } else if (filePath && filePath.startsWith('hospital_')) {
            fullUrl = `${baseUrl}/uploads/hospital-documents/${filePath}`;
        } else {
            fullUrl = `${baseUrl}/uploads/hospital-documents/${fileName}`;
        }
    }
}
                
                // Debug log to see what URL is being generated
                console.log('📄 Document:', { fileName, filePath, fullUrl });
                
                const getFileIcon = (filename) => {
                    const ext = filename?.split('.').pop()?.toLowerCase();
                    if (ext === 'pdf') return '📄';
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
                    if (['doc', 'docx'].includes(ext)) return '📝';
                    if (['xls', 'xlsx'].includes(ext)) return '📊';
                    return '📎';
                };
                
                return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                            <span className="text-2xl">{getFileIcon(fileName)}</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{fileName}</p>
                                {fileType && <p className="text-xs text-gray-500">{fileType}</p>}
                            </div>
                        </div>
                        {fullUrl && (
                            <div className="flex items-center gap-2">
                                <a
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                </a>
                                <a
                                    href={fullUrl}
                                    download={fileName}
                                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Download
                                </a>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500">No documents uploaded</p>
            <p className="text-gray-400 text-sm mt-1">Documents will appear here once uploaded</p>
        </div>
    )}
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
    </div>) : (
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
                        <option value="verified">Verified</option>
                        <option value="not-verified">Not Verified</option>
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