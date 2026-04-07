import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FileText, Image, File, Download, ExternalLink } from 'lucide-react'; // Added icons

const MyClaims = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
  try {
    const token = localStorage.getItem('healthinsura360_token');
    console.log('🔑 Token being used:', token ? 'Present' : 'MISSING');
    
    const response = await axios.get('http://localhost:5000/api/claims/my-claims', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📥 FULL API RESPONSE:', response.data);
    
    if (response.data.success && response.data.claims) {
      console.log('✅ Claims array length:', response.data.claims.length);
      
      if (response.data.claims.length > 0) {
        const firstClaim = response.data.claims[0];
        console.log('✅ FIRST CLAIM OBJECT:', firstClaim);
        console.log('✅ amount field:', firstClaim.amount);
        console.log('✅ amount type:', typeof firstClaim.amount);
        console.log('✅ claim_amount field:', firstClaim.claim_amount);
        console.log('✅ All fields:', Object.keys(firstClaim));
        
        // Test formatCurrency directly
        console.log('✅ formatCurrency(10000):', new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(10000));
        
        console.log('✅ formatCurrency(firstClaim.amount):', new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(firstClaim.amount || 0));
      }
      
      setClaims(response.data.claims);
    } else if (Array.isArray(response.data)) {
      console.log('✅ Array response:', response.data);
      setClaims(response.data);
    } else if (response.data.claims) {
      console.log('✅ Claims from response.claims:', response.data.claims);
      setClaims(response.data.claims);
    }
  } catch (error) {
    console.error('❌ Error fetching claims:', error);
    console.error('❌ Error response:', error.response?.data);
  } finally {
    setLoading(false);
  }
};

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      under_review: 'bg-blue-100 text-blue-800',
      paid: 'bg-purple-100 text-purple-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Helper function to get document icon based on file type
  const getDocumentIcon = (filename) => {
    if (!filename) return <File className="h-4 w-4 text-gray-500" />;
    
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (ext === 'pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText className="h-4 w-4 text-blue-700" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  // Helper function to get document URL
  const getDocumentUrl = (doc) => {
    const baseUrl = 'http://localhost:5000';
    
    if (typeof doc === 'string') {
      // If it's just a filename string
      return `${baseUrl}/uploads/claims/${doc}`;
    } else if (doc.filename) {
      // If it has filename property
      return `${baseUrl}/uploads/claims/${doc.filename}`;
    } else if (doc.path) {
      // If it has path property
      return `${baseUrl}${doc.path}`;
    } else if (doc.url) {
      // If it already has url property
      return doc.url.startsWith('http') ? doc.url : `${baseUrl}${doc.url}`;
    }
    return '#';
  };

  // Helper function to get display name
  const getDocumentName = (doc) => {
    if (typeof doc === 'string') {
      return doc.length > 30 ? doc.substring(0, 30) + '...' : doc;
    } else if (doc.originalName) {
      return doc.originalName.length > 30 ? doc.originalName.substring(0, 30) + '...' : doc.originalName;
    } else if (doc.filename) {
      return doc.filename.length > 30 ? doc.filename.substring(0, 30) + '...' : doc.filename;
    }
    return 'Document';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Claims</h2>
        <button
          onClick={() => navigate('/submit-claim')}
          className="px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Submit New Claim
        </button>
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No claims found</h3>
          <p className="mt-2 text-gray-500">You haven't submitted any claims yet.</p>
          <button
            onClick={() => navigate('/submit-claim')}
            className="mt-4 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors"
          >
            Submit Your First Claim
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map(claim => (
            <div key={claim.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">Claim #{claim.claim_number || claim.id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(claim.status)}`}>
                      {(claim.status || 'pending').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(claim.created_at || claim.submission_date)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {claim.hospital_name || claim.provider_name || 'Hospital'}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {claim.diagnosis || claim.description || 'No description'}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Claim Amount</p>
                      <p className="text-sm font-medium text-gray-800">{formatCurrency(claim.amount || claim.claim_amount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Patient</p>
                      <p className="text-sm text-gray-600">{claim.patient_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Service Date</p>
                      <p className="text-sm text-gray-600">{formatDate(claim.service_date || claim.claim_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Claim Type</p>
                      <p className="text-sm text-gray-600 capitalize">{claim.claim_type || 'reimbursement'}</p>
                    </div>
                  </div>

                  {/* IMPROVED Documents Section */}
                  {claim.documents && claim.documents.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        Attached Documents ({claim.documents.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(claim.documents) ? claim.documents.map((doc, index) => {
                          const docUrl = getDocumentUrl(doc);
                          const docName = getDocumentName(doc);
                          const docIcon = getDocumentIcon(typeof doc === 'string' ? doc : doc.filename || doc.originalName || '');
                          
                          return (
                            <a
                              key={index}
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex items-center px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-all duration-200 border border-gray-200 hover:border-burgundy-300"
                              title={`Click to open ${docName}`}
                            >
                              <span className="mr-2">{docIcon}</span>
                              <span className="max-w-[150px] truncate">{docName}</span>
                              <ExternalLink className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-burgundy-600" />
                            </a>
                          );
                        }) : (
                          <span className="text-xs text-gray-500">Documents attached</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => navigate(`/claim-details/${claim.id}`)}
                  className="ml-4 p-2 text-burgundy-600 hover:text-burgundy-800 hover:bg-burgundy-50 rounded-lg transition-colors"
                  title="View claim details"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClaims;