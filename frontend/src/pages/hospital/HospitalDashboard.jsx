import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HospitalSidebar from '../../components/HospitalSidebar';
import { API_BASE_URL } from '../../config';

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
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // claim submission workflow
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showClaimDetails, setShowClaimDetails] = useState(null);
  const [claimFormData, setClaimFormData] = useState({
    policyId: '',
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
  const steps = ['Patient Verification', 'Treatment Details', 'Upload Documents', 'Review & Submit'];

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
    } catch (err) {
      console.error('Error parsing user data:', err);
      navigate('/login');
    }
  }, []);

  const fetchHospitalData = async (hospitalId) => {
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.get(`${API_BASE_URL}/hospitals/${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setHospital(response.data.hospital);
      }
    } catch (err) {
      console.error('Error fetching hospital data:', err);
    }
  };

const fetchClaims = async (hospitalId) => {
  try {
    setLoading(true);
    const token = localStorage.getItem('healthinsura360_token');
    
    if (!token) {
      console.log('No token found');
      return;
    }

    // ✅ Use the correct endpoint
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

  const searchPolicy = async () => {
    if (!searchQuery.trim()) {
      showNotification('Please enter search term', 'warning');
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.get(`${API_BASE_URL}/policies/search`, {
        params: { query: searchQuery },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSearchResults(response.data.policies || []);
        if (response.data.policies.length === 0) {
          showNotification('No policies found', 'info');
        }
      }
    } catch (err) {
      console.error('Error searching policies:', err);
      showNotification('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

const selectPatientForClaim = (policy) => {
  setSelectedPatient(policy);
  setClaimFormData({
    ...claimFormData,
    policyId: policy.policy_id, // Use policy_id from policies table
    patientName: policy.customer?.name || 'Unknown',
    patientEmail: policy.customer?.email || ''
  });
  setShowClaimModal(true);
  setActiveStep(0);
};
  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingDocs(true);
    const form = new FormData();
    files.forEach(f => form.append('documents', f));

    try {
      const token = localStorage.getItem('healthinsura360_token');
      const res = await axios.post(`${API_BASE_URL}/hospitals/upload-documents`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        setClaimFormData({
          ...claimFormData,
          documents: [...claimFormData.documents, ...res.data.files]
        });
        showNotification('Documents uploaded', 'success');
      }
    } catch (err) {
      console.error('Error uploading docs', err);
      showNotification('Failed to upload documents', 'error');
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeDocument = (index) => {
    const docs = [...claimFormData.documents];
    docs.splice(index, 1);
    setClaimFormData({ ...claimFormData, documents: docs });
  };

  const resetClaimForm = () => {
    setClaimFormData({
      policyId: '',
      patientName: '',
      patientEmail: '',
      diagnosis: '',
      treatmentDescription: '',
      doctorName: '',
      treatmentDate: '',
      treatmentCost: '',
      documents: []
    });
    setSelectedPatient(null);
    setActiveStep(0);
  };

const submitClaim = async () => {
  try {
    setLoading(true);
    
    // ✅ FIX 1: Get token and verify it exists
    const token = localStorage.getItem('healthinsura360_token');
    
    console.log('🔍 Submitting claim - Token exists:', token ? 'YES' : 'NO');
    
    if (!token) {
      showNotification('You are not logged in. Please login again.', 'error');
      setTimeout(() => navigate('/login'), 2000);
      setLoading(false);
      return;
    }

    // ✅ FIX 2: Get user data and hospital ID correctly
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      showNotification('User data not found. Please login again.', 'error');
      setTimeout(() => navigate('/login'), 2000);
      setLoading(false);
      return;
    }
    
    const user = JSON.parse(userStr);
    const hospitalId = user.id || user.userId;
    
    console.log('🏥 Hospital ID:', hospitalId);
    console.log('📋 Claim Data:', {
      policyId: claimFormData.policyId,
      diagnosis: claimFormData.diagnosis,
      treatmentCost: claimFormData.treatmentCost,
      documents: claimFormData.documents.length
    });

    // ✅ FIX 3: Validate required fields
    if (!claimFormData.policyId) {
      showNotification('Policy ID is missing', 'error');
      setLoading(false);
      return;
    }
    
    if (!claimFormData.diagnosis) {
      showNotification('Please enter diagnosis', 'warning');
      setLoading(false);
      return;
    }
    
    if (!claimFormData.treatmentDescription) {
      showNotification('Please enter treatment description', 'warning');
      setLoading(false);
      return;
    }
    
    if (!claimFormData.doctorName) {
      showNotification('Please enter doctor name', 'warning');
      setLoading(false);
      return;
    }
    
    if (!claimFormData.treatmentDate) {
      showNotification('Please enter treatment date', 'warning');
      setLoading(false);
      return;
    }
    
    if (!claimFormData.treatmentCost || parseFloat(claimFormData.treatmentCost) <= 0) {
      showNotification('Please enter a valid treatment cost', 'warning');
      setLoading(false);
      return;
    }

    // ✅ FIX 4: Prepare data with correct hospital ID
    const data = {
      policyId: claimFormData.policyId,
      diagnosis: claimFormData.diagnosis,
      treatmentDescription: claimFormData.treatmentDescription,
      doctorName: claimFormData.doctorName,
      treatmentDate: claimFormData.treatmentDate,
      treatmentCost: parseFloat(claimFormData.treatmentCost),
      documents: claimFormData.documents.map(d => d.url || d.filename),
      hospitalId: hospitalId
    };

    console.log('📤 Sending claim to backend:', data);

    // ✅ FIX 5: Add proper headers
    const res = await axios.post(`${API_BASE_URL}/claims/cashless`, data, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.data.success) {
      // ✅ Show enhanced success message
      showNotification('✅ Claim submitted successfully! Your claim is now pending review.', 'success');
      
      // Close the modal
      setShowClaimModal(false);
      
      // Reset the claim form
      resetClaimForm();
      
      // Refresh claims list
      fetchClaims(hospitalId);
      
      // Show additional success info after 2 seconds
      setTimeout(() => {
        if (res.data.claimId) {
          showNotification(`📋 Claim #${res.data.claimId} has been submitted to the insurance company for review.`, 'info');
        } else {
          showNotification(`📋 Claim has been submitted to the insurance company for review. You can track it in Claims History.`, 'info');
        }
      }, 2000);
      
    } else {
      showNotification(res.data.message || 'Failed to submit claim', 'error');
    }
    
  } catch (err) {
    console.error('❌ Error submitting claim:', err);
    
    // ✅ FIX 6: Better error handling
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
      
      if (err.response.status === 401) {
        showNotification('Session expired. Please login again.', 'error');
        localStorage.removeItem('healthinsura360_token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response.status === 500) {
        showNotification('Server error. Please try again later.', 'error');
        console.error('Server error details:', err.response.data);
      } else {
        showNotification(err.response.data?.message || 'Failed to submit claim', 'error');
      }
    } else if (err.request) {
      console.error('No response received:', err.request);
      showNotification('Cannot connect to server. Please check your connection.', 'error');
    } else {
      console.error('Error message:', err.message);
      showNotification(err.message || 'Failed to submit claim', 'error');
    }
    
  } finally {
    setLoading(false);
  }
};
  const viewClaimDetails = (claim) => {
    setShowClaimDetails(claim);
  };

  const resubmitClaim = () => {
    if (!showClaimDetails) return;
    // prepare form with previous details
    const claim = showClaimDetails;
    setClaimFormData({
      patientName: claim.patientName,
      policyId: claim.policyId,
      diagnosis: claim.diagnosis || '',
      treatmentDescription: claim.treatmentDescription || '',
      doctorName: claim.doctorName || '',
      treatmentDate: claim.treatmentDate || '',
      treatmentCost: claim.treatmentCost || '',
      documents: []
    });
    setSelectedPatient({
      policy_number: claim.policyId,
      customer: { first_name: claim.patientName.split(' ')[0] || '', last_name: claim.patientName.split(' ')[1] || '' },
      policy_id: claim.policyId
    });
    setShowClaimDetails(null);
    setActiveStep(1); // go directly to details step
    setShowClaimModal(true);
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedPatient) {
      showNotification('Please select a patient first', 'warning');
      return;
    }
    if (activeStep === 1) {
      if (!claimFormData.diagnosis || !claimFormData.treatmentDescription || !claimFormData.doctorName || !claimFormData.treatmentDate || !claimFormData.treatmentCost) {
        showNotification('Please fill all required fields', 'warning');
        return;
      }
    }
    setActiveStep(prev=>prev+1);
  };

  const handleBack = () => {
    setActiveStep(prev=>prev-1);
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Approved</span>;
      case 'pending': return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Pending</span>;
      default: return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">{status}</span>;
    }
  };

 const generateReport = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('healthinsura360_token');
    const user = JSON.parse(localStorage.getItem('user'));
    const hospitalId = user.id || user.userId;
    
    // Use responseType: 'blob' to handle PDF
    const response = await axios.get(`${API_BASE_URL}/hospitals/${hospitalId}/claims/report`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'  // Important for PDF download
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `claim_report_${Date.now()}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=(.+)/);
      if (match) filename = match[1];
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    showNotification('Report downloaded successfully!', 'success');
    
  } catch (err) {
    console.error('Error generating report:', err);
    showNotification('Failed to generate report', 'error');
  } finally {
    setLoading(false);
  }
};

  const showNotification = (message, severity = 'success') => {
  setNotification({ open: true, message, severity });
  // Auto-hide after 5 seconds
  setTimeout(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, 5000);
};

  const getStatusBadgeClass = (status) => {
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'pending') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const handleLogout = () => {
    localStorage.removeItem('healthinsura360_token');
    localStorage.removeItem('user');
    localStorage.removeItem('accountType');
    navigate('/login');
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
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

            <h3 className="text-lg font-semibold mb-4">Recent Claims</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Diagnosis</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {claims.slice(0, 5).map((claim) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{claim.patientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{claim.diagnosis}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(claim.treatmentDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">PKR {claim.treatmentCost}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(claim.status)}`}>
                            {claim.status}
                          </span>
                        </td>
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

      case 'verify':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Verify Patient Policy</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter patient name or policy number"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={searchPolicy}
                  disabled={searching}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((policy) => (
                    <div key={policy.policy_id} className="p-4 border border-orange-200 bg-orange-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{policy.policy_number}</p>
                        <p className="text-sm text-gray-600">{policy.customer?.first_name} {policy.customer?.last_name}</p>
                      </div>
                      <button
                        onClick={() => selectPatientForClaim(policy)}
                        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Submit Claim
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{claim.patientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{claim.diagnosis}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(claim.treatmentDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">PKR {claim.treatmentCost}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(claim.status)}`}>
                            {claim.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'report':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Generate Report</h2>
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-600 mb-6">Download a comprehensive PDF report of all claims</p>
              <button
                onClick={generateReport}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
              >
                Download Claim Report
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // claim submission modal
  const renderClaimModal = () => (
    <>{showClaimModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-xl">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold">Submit Cashless Claim</h3>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <div className="flex items-center">
                {steps.map((s, idx) => (
                  <div key={s} className="flex-1 text-center">
                    <span className={`px-2 py-1 rounded-full ${idx === activeStep ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{idx+1}</span>
                    <p className="text-xs mt-1">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {activeStep === 0 && (
              <div>
                <p className="mb-2">Patient: {claimFormData.patientName}</p>
                <p className="mb-2">Policy: {claimFormData.policyId}</p>
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Diagnosis"
                  className="w-full border px-3 py-2 rounded"
                  value={claimFormData.diagnosis}
                  onChange={e => setClaimFormData({...claimFormData, diagnosis: e.target.value})}
                />
                <textarea
                  placeholder="Treatment description"
                  className="w-full border px-3 py-2 rounded"
                  value={claimFormData.treatmentDescription}
                  onChange={e => setClaimFormData({...claimFormData, treatmentDescription: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Doctor name"
                  className="w-full border px-3 py-2 rounded"
                  value={claimFormData.doctorName}
                  onChange={e => setClaimFormData({...claimFormData, doctorName: e.target.value})}
                />
                <input
                  type="date"
                  className="w-full border px-3 py-2 rounded"
                  value={claimFormData.treatmentDate}
                  onChange={e => setClaimFormData({...claimFormData, treatmentDate: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Treatment cost"
                  className="w-full border px-3 py-2 rounded"
                  value={claimFormData.treatmentCost}
                  onChange={e => setClaimFormData({...claimFormData, treatmentCost: e.target.value})}
                />
              </div>
            )}

            {activeStep === 2 && (
              <div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                />
                <ul className="mt-2 space-y-1">
                  {claimFormData.documents.map((doc, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      <span>{doc.originalName || doc.filename}</span>
                      <button onClick={() => removeDocument(idx)} className="text-red-500">Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-2">
                <p><strong>Diagnosis:</strong> {claimFormData.diagnosis}</p>
                <p><strong>Description:</strong> {claimFormData.treatmentDescription}</p>
                <p><strong>Doctor:</strong> {claimFormData.doctorName}</p>
                <p><strong>Date:</strong> {claimFormData.treatmentDate}</p>
                <p><strong>Cost:</strong> PKR {claimFormData.treatmentCost}</p>
                <p><strong>Files:</strong> {claimFormData.documents.length}</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t flex justify-between">
            <button onClick={() => { setShowClaimModal(false); resetClaimForm(); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <div className="space-x-2">
              {activeStep > 0 && <button onClick={handleBack} className="px-4 py-2 bg-gray-300 rounded">Back</button>}
              {activeStep < steps.length-1 ? (
                <button onClick={handleNext} className="px-4 py-2 bg-orange-600 text-white rounded">Next</button>
              ) : (
                <button onClick={submitClaim} className="px-4 py-2 bg-green-600 text-white rounded">Submit</button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );

  const renderClaimDetailsModal = () => (
    <>{showClaimDetails && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <h3 className="text-lg font-bold mb-4">Claim Details</h3>
          <div className="space-y-2">
            <p><strong>Patient:</strong> {showClaimDetails.patientName}</p>
            <p><strong>Status:</strong> {showClaimDetails.status}</p>
            <p><strong>Diagnosis:</strong> {showClaimDetails.diagnosis}</p>
            <p><strong>Doctor:</strong> {showClaimDetails.doctorName}</p>
            <p><strong>Date:</strong> {new Date(showClaimDetails.treatmentDate).toLocaleDateString()}</p>
            <p><strong>Cost:</strong> PKR {showClaimDetails.treatmentCost}</p>
            <div>
              <strong>Documents:</strong>
              {showClaimDetails.documents?.map((doc, idx) => (
                <a key={idx} href={doc} target="_blank" rel="noopener noreferrer" className="block text-blue-600 underline">File {idx+1}</a>
              ))}
            </div>
          </div>
          <div className="mt-4 text-right space-x-2">
            {showClaimDetails.status === 'rejected' && (
              <button onClick={resubmitClaim} className="px-4 py-2 bg-orange-600 text-white rounded">Resubmit</button>
            )}
            <button onClick={() => setShowClaimDetails(null)} className="px-4 py-2 bg-gray-200 rounded">Close</button>
          </div>
        </div>
      </div>
    )}
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <HospitalSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onToggle={handleSidebarToggle}
      />
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-4">Loading...</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {notification.open && (
  <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 ${
    notification.severity === 'success' ? 'bg-green-600' :
    notification.severity === 'error' ? 'bg-red-600' :
    notification.severity === 'warning' ? 'bg-yellow-600' :
    notification.severity === 'info' ? 'bg-blue-600' :
    'bg-green-600'
  }`}>
    {notification.message}
  </div>
)}

      {renderClaimModal()}
      {renderClaimDetailsModal()}
    </div>
  );
};

export default HospitalDashboard;