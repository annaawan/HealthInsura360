import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HospitalSidebar from '../../components/HospitalSidebar';
import { API_BASE_URL } from '../../config';
import { DollarSign, CreditCard, Banknote, History, Plus, Edit, Trash2 } from 'lucide-react';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0
  });
  const [claims, setClaims] = useState([]);
  
  // Customer and Policies states
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPolicies, setCustomerPolicies] = useState([]);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  
  // Claim submission states
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showClaimDetails, setShowClaimDetails] = useState(null);
  const [claimFormData, setClaimFormData] = useState({
    policyId: '',
    customerId: '',
    patientName: '',
    patientEmail: '',
    diagnosis: '',
    treatmentDescription: '',
    doctorName: '',
    treatmentDate: '',
    treatmentCost: '',
    documents: []
  });
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [claimValidation, setClaimValidation] = useState(null);
  
  const steps = ['Select Policy', 'Treatment Details', 'Upload Documents', 'Review & Submit'];

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const token = localStorage.getItem('healthinsura360_token');
    const user = localStorage.getItem('user');
    const accountType = localStorage.getItem('accountType');

    if (!token || !user || accountType !== 'hospital') {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(user);
      setHospital(userData);
      fetchHospitalData(userData.id);
      fetchClaims(userData.id);
      fetchCustomers();
    } catch (err) {
      console.error('Error parsing user data:', err);
      navigate('/login');
    }
  }, []);

  const fetchHospitalData = async (hospitalId) => {
    try {
      const token = localStorage.getItem('healthinsura360_token');
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/hospitals/${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setHospital(response.data.hospital);
      }
    } catch (err) {
      console.error('Error fetching hospital data:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('healthinsura360_token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  // Fetch all active customers
  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      const token = localStorage.getItem('healthinsura360_token');
      
      const response = await axios.get(`${API_BASE_URL}/hospitals/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setCustomersLoading(false);
    }
  };

  // Fetch customer's active policies
  const fetchCustomerPolicies = async (customer) => {
    setSelectedCustomer(customer);
    setCustomersLoading(true);
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.get(`${API_BASE_URL}/hospitals/customers/${customer.id}/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCustomerPolicies(response.data.policies);
        setShowPoliciesModal(true);
      }
    } catch (err) {
      console.error('Error fetching customer policies:', err);
      showNotification('Failed to load policies', 'error');
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchClaims = async (hospitalId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('healthinsura360_token');
      
      const response = await axios.get(`${API_BASE_URL}/claims/hospital/${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const claimsData = response.data.claims || [];
        setClaims(claimsData);
        setStats({
          totalClaims: claimsData.length,
          pendingClaims: claimsData.filter(c => c.status === 'pending').length,
          approvedClaims: claimsData.filter(c => c.status === 'approved').length,
          rejectedClaims: claimsData.filter(c => c.status === 'rejected').length
        });
      }
    } catch (err) {
      console.error('Error fetching claims:', err);
      showNotification('Failed to load claims', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Select policy for claim
  const selectPolicyForClaim = (policy) => {
    setSelectedPolicy(policy);
    setClaimFormData({
      ...claimFormData,
      policyId: policy.policy_id,
      customerId: selectedCustomer.id,
      patientName: selectedCustomer.full_name,
      patientEmail: selectedCustomer.email
    });
    
    setClaimValidation({
      remainingCoverage: parseFloat(policy.remaining_coverage) || 0,
      deductibleAmount: parseFloat(policy.deductible_amount) || 0,
      coPayPercentage: parseFloat(policy.co_pay_percentage) || 0,
      sumInsured: parseFloat(policy.sum_insured) || 0
    });
    
    setShowPoliciesModal(false);
    setShowClaimModal(true);
    setActiveStep(0);
  };

  const validateClaimAmount = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return { valid: false, message: 'Invalid amount' };
    if (numAmount <= 0) return { valid: false, message: 'Amount must be greater than 0' };
    if (numAmount > claimValidation.remainingCoverage) {
      return { 
        valid: false, 
        message: `Amount exceeds remaining coverage of $${claimValidation.remainingCoverage.toFixed(2)}` 
      };
    }
    return { valid: true, amount: numAmount };
  };

  const handleClaimInputChange = (field, value) => {
    setClaimFormData({ ...claimFormData, [field]: value });
    if (field === 'treatmentCost') {
      const validation = validateClaimAmount(value);
      if (!validation.valid && value) {
        showNotification(validation.message, 'warning');
      }
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Don't upload immediately - just store the File objects
    // They will be uploaded with the claim submission
    
    const fileObjects = files.map(file => ({
        file: file,  // Store the actual File object
        originalName: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type
    }));
    
    setClaimFormData({
        ...claimFormData,
        documents: [...claimFormData.documents, ...fileObjects]
    });
    
    showNotification(`${files.length} file(s) added. Will be uploaded with claim.`, 'success');
    
    // Clear the file input
    e.target.value = '';
};

  const removeDocument = (index) => {
    const docs = [...claimFormData.documents];
    docs.splice(index, 1);
    setClaimFormData({ ...claimFormData, documents: docs });
};

  const resetClaimForm = () => {
    setClaimFormData({
      policyId: '',
      customerId: '',
      patientName: '',
      patientEmail: '',
      diagnosis: '',
      treatmentDescription: '',
      doctorName: '',
      treatmentDate: '',
      treatmentCost: '',
      documents: []
    });
    setSelectedPolicy(null);
    setActiveStep(0);
    setClaimValidation(null);
  };

  const submitClaim = async () => {
  const amountValidation = validateClaimAmount(claimFormData.treatmentCost);
  if (!amountValidation.valid) {
    showNotification(amountValidation.message, 'warning');
    return;
  }

  setLoading(true);

  try {
    const token = localStorage.getItem('healthinsura360_token');
    const userStr = localStorage.getItem('user');
    const user = JSON.parse(userStr);
    const hospitalId = user.id || user.userId;

    // Create FormData to send files along with claim data
    const formData = new FormData();
    
    // Add all claim fields
    formData.append('policyId', claimFormData.policyId);
    formData.append('customerId', claimFormData.customerId);
    formData.append('diagnosis', claimFormData.diagnosis);
    formData.append('treatmentDescription', claimFormData.treatmentDescription);
    formData.append('doctorName', claimFormData.doctorName);
    formData.append('treatmentDate', claimFormData.treatmentDate);
    formData.append('treatmentCost', claimFormData.treatmentCost);
    
    // Add documents - get the actual File objects from your state
    // You need to store the actual File objects, not just the response
    if (claimFormData.documents && claimFormData.documents.length > 0) {
      claimFormData.documents.forEach((doc, index) => {
        // If doc has a 'file' property (actual File object)
        if (doc.file) {
          formData.append('documents', doc.file);
        }
        // If doc is the response from previous upload (has filename)
        else if (doc.filename) {
          // You would need to fetch the file or store the File object initially
          console.log('Document already uploaded:', doc.filename);
        }
      });
    }

    const response = await axios.post(`${API_BASE_URL}/hospitals/claims/submit`, formData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data.success) {
      showNotification('✅ Claim submitted successfully!', 'success');
      setShowClaimModal(false);
      resetClaimForm();
      fetchClaims(hospitalId);
    }
  } catch (err) {
    console.error('Error submitting claim:', err);
    showNotification(err.response?.data?.message || 'Failed to submit claim', 'error');
  } finally {
    setLoading(false);
  }
};

  const handleNext = () => {
    if (activeStep === 0 && !selectedPolicy) {
      showNotification('Please select a policy', 'warning');
      return;
    }
    if (activeStep === 1) {
      if (!claimFormData.diagnosis || !claimFormData.treatmentDescription || 
          !claimFormData.doctorName || !claimFormData.treatmentDate || !claimFormData.treatmentCost) {
        showNotification('Please fill all required fields', 'warning');
        return;
      }
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // const generateReport = async () => {
  //   try {
  //     setLoading(true);
  //     const token = localStorage.getItem('healthinsura360_token');
  //     const user = JSON.parse(localStorage.getItem('user'));
  //     const hospitalId = user.id || user.userId;
      
  //     const response = await axios.get(`${API_BASE_URL}/hospitals/${hospitalId}/claims/report`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //       responseType: 'blob'
  //     });
      
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', `claim_report_${Date.now()}.pdf`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     window.URL.revokeObjectURL(url);
      
  //     showNotification('Report downloaded successfully!', 'success');
  //   } catch (err) {
  //     console.error('Error generating report:', err);
  //     showNotification('Failed to generate report', 'error');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, open: false }));
    }, 5000);
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'pending') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Calculate claim preview
  const getClaimPreview = () => {
    if (!claimValidation || !claimFormData.treatmentCost) return null;
    const amount = parseFloat(claimFormData.treatmentCost);
    let insurancePayment = amount;
    let patientResponsibility = 0;
    let deductibleApplied = 0;
    let coPayAmount = 0;
    
    if (claimValidation.deductibleAmount > 0) {
      deductibleApplied = Math.min(claimValidation.deductibleAmount, amount);
      insurancePayment = amount - deductibleApplied;
      patientResponsibility = deductibleApplied;
    }
    if (claimValidation.coPayPercentage > 0 && insurancePayment > 0) {
      coPayAmount = (insurancePayment * claimValidation.coPayPercentage) / 100;
      insurancePayment = insurancePayment - coPayAmount;
      patientResponsibility += coPayAmount;
    }
    return { insurancePayment, patientResponsibility, deductibleApplied, coPayAmount };
  };

  const renderContent = () => {
    switch(currentView) {
      case 'dashboard':
        return (
          <div>
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-2xl font-bold mb-1">{hospital?.name || 'Hospital'}</h2>
              <p className="text-sm text-gray-600">Reg: {hospital?.registration_number || 'N/A'} | {hospital?.email}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-sm">Total Claims</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClaims}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingClaims}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-sm">Approved</p>
                <p className="text-3xl font-bold text-green-600">{stats.approvedClaims}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-sm">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejectedClaims}</p>
              </div>
            </div>

            {/* Active Customers Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Active Customers</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {customersLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 mt-2">Loading customers...</p>
                  </div>
                ) : customers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {customers.map((customer) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.full_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{customer.phone || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{customer.city}, {customer.state}</td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => fetchCustomerPolicies(customer)}
                                className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
                              >
                                View Policies
                              </button>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No active customers found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Claims */}
            <h3 className="text-lg font-semibold mb-4">Recent Claims</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Diagnosis</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {claims.slice(0, 5).map((claim) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{claim.patientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{claim.diagnosis?.substring(0, 50)}...</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">${claim.treatmentCost}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(claim.status)}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(claim.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {claims.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-600">No claims yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'claims':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">All Claims</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Diagnosis</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{claim.patientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{claim.diagnosis?.substring(0, 50)}...</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">${claim.treatmentCost}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(claim.status)}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(claim.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        case 'payment':
  return <PaymentPanel hospital={hospital} />;

case 'account':
  return <AccountPanel hospital={hospital} />;



      default:
        return null;
    }
  };

  // Policies Modal
  const renderPoliciesModal = () => (
    <>
      {showPoliciesModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Active Policies - {selectedCustomer.full_name}</h3>
              <button onClick={() => setShowPoliciesModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4">
              {customerPolicies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No active policies found for this customer</div>
              ) : (
                <div className="space-y-4">
                  {customerPolicies.map((policy) => (
                    <div key={policy.policy_id} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg">{policy.policy_type}</p>
                          <p className="text-sm text-gray-600">Policy ID: #{policy.policy_id}</p>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-gray-500">Sum Insured</p>
                              <p className="font-semibold">${policy.sum_insured?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Remaining Coverage</p>
                              <p className="font-semibold text-green-600">${policy.remaining_coverage?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Used Coverage</p>
                              <p className="font-semibold text-orange-600">${policy.used_coverage?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Premium Amount</p>
                              <p className="font-semibold">${policy.premium_amount?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Deductible</p>
                              <p className="font-semibold">${policy.deductible_amount || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Co-pay</p>
                              <p className="font-semibold">{policy.co_pay_percentage || 0}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Start Date</p>
                              <p className="font-semibold">{new Date(policy.start_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">End Date</p>
                              <p className="font-semibold">{new Date(policy.end_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {policy.benefits && (
                            <div className="mt-2 p-2 bg-green-50 rounded">
                              <p className="text-sm font-semibold text-green-700">✓ Benefits:</p>
                              <p className="text-sm text-gray-600">{policy.benefits}</p>
                            </div>
                          )}
                          {policy.exclusions && (
                            <div className="mt-2 p-2 bg-red-50 rounded">
                              <p className="text-sm font-semibold text-red-700">✗ Exclusions:</p>
                              <p className="text-sm text-gray-600">{policy.exclusions}</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => selectPolicyForClaim(policy)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          File Claim
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Claim Modal
  const renderClaimModal = () => {
    const preview = getClaimPreview();
    return (
      <>
        {showClaimModal && selectedPolicy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b sticky top-0 bg-white">
                <h3 className="text-lg font-bold">Submit Cashless Claim - {selectedPolicy.policy_type}</h3>
              </div>
              <div className="p-4">
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    {steps.map((s, idx) => (
                      <div key={s} className="flex-1 text-center">
                        <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${idx <= activeStep ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {idx + 1}
                        </div>
                        <p className="text-xs mt-1">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {activeStep === 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p><strong>Policy:</strong> {selectedPolicy.policy_type}</p>
                    <p><strong>Remaining Coverage:</strong> ${selectedPolicy.remaining_coverage?.toLocaleString()}</p>
                    <p><strong>Deductible:</strong> ${selectedPolicy.deductible_amount || 0}</p>
                    <p><strong>Co-pay:</strong> {selectedPolicy.co_pay_percentage || 0}%</p>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
                      <input type="text" className="w-full px-3 py-2 border rounded-lg" value={claimFormData.diagnosis}
                        onChange={(e) => handleClaimInputChange('diagnosis', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Description *</label>
                      <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" value={claimFormData.treatmentDescription}
                        onChange={(e) => handleClaimInputChange('treatmentDescription', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name *</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg" value={claimFormData.doctorName}
                          onChange={(e) => handleClaimInputChange('doctorName', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Date *</label>
                        <input type="date" className="w-full px-3 py-2 border rounded-lg" value={claimFormData.treatmentDate}
                          onChange={(e) => handleClaimInputChange('treatmentDate', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Cost ($) *</label>
                      <input type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg" value={claimFormData.treatmentCost}
                        onChange={(e) => handleClaimInputChange('treatmentCost', e.target.value)} />
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
  <div>
    <input
      type="file"
      multiple
      accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
      onChange={handleDocumentUpload}
      className="w-full"
    />
    {uploadingDocs && <p className="text-sm text-blue-600 mt-1">Uploading...</p>}
    {claimFormData.documents.length > 0 && (
      <ul className="mt-2 space-y-1">
        {claimFormData.documents.map((doc, idx) => (
          <li key={idx} className="flex justify-between items-center text-sm">
            <span>{doc.originalName || doc.originalname || doc.filename}</span>
            <button onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700">
              Remove
            </button>
          </li>
        ))}
      </ul>
    )}
    <p className="text-xs text-gray-500 mt-2">
      Files will be uploaded when you submit the claim.
    </p>
  </div>
)}

                {activeStep === 3 && preview && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p><strong>Patient:</strong> {claimFormData.patientName}</p>
                      <p><strong>Policy:</strong> {selectedPolicy.policy_type}</p>
                      <p><strong>Diagnosis:</strong> {claimFormData.diagnosis}</p>
                      <p><strong>Treatment Cost:</strong> ${claimFormData.treatmentCost}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Payment Breakdown</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between"><span>Total Claim:</span><span>${claimFormData.treatmentCost}</span></div>
                        {preview.deductibleApplied > 0 && <div className="flex justify-between text-orange-600"><span>Deductible:</span><span>- ${preview.deductibleApplied}</span></div>}
                        {preview.coPayAmount > 0 && <div className="flex justify-between text-orange-600"><span>Co-pay:</span><span>- ${preview.coPayAmount}</span></div>}
                        <div className="flex justify-between pt-2 border-t font-bold"><span>Insurance Pays:</span><span className="text-green-600">${preview.insurancePayment.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold"><span>Patient Pays:</span><span className="text-orange-600">${preview.patientResponsibility.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t flex justify-between">
                <button onClick={() => { setShowClaimModal(false); resetClaimForm(); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <div className="space-x-2">
                  {activeStep > 0 && <button onClick={handleBack} className="px-4 py-2 bg-gray-300 rounded">Back</button>}
                  {activeStep < steps.length - 1 ? (
                    <button onClick={handleNext} className="px-4 py-2 bg-orange-600 text-white rounded">Next</button>
                  ) : (
                    <button onClick={submitClaim} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
                      {loading ? 'Submitting...' : 'Submit Claim'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderClaimDetailsModal = () => (
    <>
      {showClaimDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Claim Details</h3>
            <div className="space-y-2">
              <p><strong>Patient:</strong> {showClaimDetails.patientName}</p>
              <p><strong>Status:</strong> {showClaimDetails.status}</p>
              <p><strong>Diagnosis:</strong> {showClaimDetails.diagnosis}</p>
              <p><strong>Doctor:</strong> {showClaimDetails.doctorName}</p>
              <p><strong>Cost:</strong> ${showClaimDetails.treatmentCost}</p>
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowClaimDetails(null)} className="px-4 py-2 bg-gray-200 rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <HospitalSidebar currentView={currentView} onViewChange={setCurrentView} isOpen={isSidebarOpen} onToggle={handleSidebarToggle} />
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8">
          {loading && currentView === 'dashboard' ? (
            <div className="text-center py-12"><div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-600 mt-4">Loading...</p></div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {notification.open && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 max-w-md ${notification.severity === 'success' ? 'bg-green-600' : notification.severity === 'error' ? 'bg-red-600' : notification.severity === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'}`}>
          {notification.message}
        </div>
      )}

      {renderPoliciesModal()}
      {renderClaimModal()}
      {renderClaimDetailsModal()}
    </div>
  );
};
// ============================================
// PAYMENT PANEL - Shows payment history from company
const PaymentPanel = ({ hospital }) => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchPaymentHistory();
    fetchPaymentSummary();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.get(`${API_BASE_URL}/hospitals/payment/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setPayments(response.data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      alert('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSummary = async () => {
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.get(`${API_BASE_URL}/hospitals/payment/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (err) {
      console.error('Error fetching payment summary:', err);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 mt-2">Loading payment history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
        <p className="text-gray-600 mt-1">View all payments received from insurance company</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Received</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.paid_amount)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{summary.completed_payouts || 0} payments received</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.pending_amount)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <History className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{summary.pending_payouts || 0} claims pending</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Claims</p>
                <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Banknote className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">All processed claims</p>
          </div>
        </div>
      )}

      {/* Payment History Table - NO Transaction ID column */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Payment Transactions</h3>
        </div>
        
        {payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p>No payment history found</p>
            <p className="text-sm mt-1">Payments will appear here once claims are approved</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Claim ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Patient</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.claim_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">#{payment.claim_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{payment.patient_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.payment_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
// ============================================
// ACCOUNT PANEL - Manage bank account details
// ============================================
const AccountPanel = ({ hospital }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    routing_number: ''
  });

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.get(`${API_BASE_URL}/hospitals/payment/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.account) {
        setAccount(response.data.account);
        setFormData({
          account_holder_name: response.data.account.account_holder_name || '',
          bank_name: response.data.account.bank_name || '',
          account_number: response.data.account.account_number || '',
          routing_number: response.data.account.routing_number || ''
        });
      }
    } catch (err) {
      console.error('Error fetching account:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.post(`${API_BASE_URL}/hospitals/payment/account`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAccount(response.data.account);
        setIsEditing(false);
        alert('Payment account saved successfully!');
      }
    } catch (err) {
      console.error('Error saving account:', err);
      alert(err.response?.data?.message || 'Failed to save payment account');
    } finally {
      setSaving(false);
    }
  };

  const maskAccountNumber = (number) => {
    if (!number) return '';
    if (number.length <= 4) return number;
    return '••••' + number.slice(-4);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 mt-2">Loading account details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Account</h2>
          <p className="text-gray-600 mt-1">Manage your bank account for receiving claim payments</p>
        </div>
        {account && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Account
          </button>
        )}
      </div>

      {/* Account Display / Form */}
      <div className="bg-white rounded-lg shadow">
        {!account ? (
          // No account - show form to add
          <div className="p-6">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                You haven't set up a payment account yet. Please add your bank account details to receive claim payments.
              </p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Bank of America"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="1234567890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.routing_number}
                  onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="021000021"
                />
              </div>
              
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Account'}
              </button>
            </form>
          </div>
        ) : isEditing ? (
          // Edit existing account
          <div className="p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.routing_number}
                  onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      account_holder_name: account.account_holder_name || '',
                      bank_name: account.bank_name || '',
                      account_number: account.account_number || '',
                      routing_number: account.routing_number || ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          // View existing account
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-500">Account Holder</span>
                <span className="font-medium text-gray-900">{account.account_holder_name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-500">Bank Name</span>
                <span className="font-medium text-gray-900">{account.bank_name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-500">Account Number</span>
                <span className="font-medium text-gray-900">{maskAccountNumber(account.account_number)}</span>
              </div>
              {account.routing_number && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Routing Number</span>
                  <span className="font-medium text-gray-900">{account.routing_number}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-green-600 mt-4 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Payment account is set up. Claim payments will be sent to this account.
            </p>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Payment Information</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Claim payments are processed automatically when claims are approved</li>
          <li>• Payments are typically processed within 2-3 business days</li>
          <li>• You will receive a notification when a payment is made</li>
          <li>• Contact support if you haven't received payment within 7 days of approval</li>
        </ul>
      </div>
    </div>
  );
};

export default HospitalDashboard;
