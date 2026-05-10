import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Image, File, AlertCircle } from 'lucide-react'; // Added icons
import { API_BASE_URL } from '../../utils/config';

const SubmitClaim = () => {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showBankDetails, setShowBankDetails] = useState(true);
  
  const [formData, setFormData] = useState({
    // Basic claim info
    policy_id: '',
    claim_type: 'reimbursement',
    
    // Patient information
    patient_name: '',
    patient_dob: '',
    patient_contact: '',
    
    // Insured information
    insured_name: '',
    insured_relation: '',
    
    // Medical provider info
    hospital_name: '',
    provider_name: '',
    
    // Medical details
    diagnosis: '',
    service_date: '',
    admission_date: '',
    discharge_date: '',
    
    // Claim financials
    claim_amount: '',
    claim_date: new Date().toISOString().split('T')[0],
    description: '',
    reason_for_claim: '',
    
    // Medical codes
    cpt_codes: '',
    icd_codes: '',
    
    // Bank details
    bank_account_number: '',
    ifsc_code: '',
    bank_name: '',
    account_holder_name: '',
    
    // Documents
    documents: []
  });
  
  const [errors, setErrors] = useState({});
  const [filePreviews, setFilePreviews] = useState([]); // New state for file previews

  // Fetch user's active policies
  useEffect(() => {
    fetchUserPolicies();
  }, []);

  const fetchUserPolicies = async () => {
    try {
      const token = localStorage.getItem('healthinsura360_token');
      const response = await axios.get(`${API_BASE_URL}/policies/my-policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setPolicies(response.data);
      } else if (response.data && response.data.policies) {
        setPolicies(response.data.policies);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'claim_type') {
      setShowBankDetails(value === 'reimbursement');
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (file.type?.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (file.type?.includes('word') || file.name?.endsWith('.doc') || file.name?.endsWith('.docx')) 
      return <FileText className="h-5 w-5 text-blue-700" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    const allowedTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/jpg',
      'image/png', 
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    // Validate file types
    const validFiles = files.filter(file => allowedTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
      setErrors(prev => ({ 
        ...prev, 
        documents: 'Only PDF, JPEG, PNG, GIF, DOC, DOCX files are allowed' 
      }));
      return;
    }

    // Validate file size (max 10MB each)
    const maxSize = 10 * 1024 * 1024;
    const validSizeFiles = validFiles.filter(file => file.size <= maxSize);
    
    if (validSizeFiles.length !== validFiles.length) {
      setErrors(prev => ({ 
        ...prev, 
        documents: 'Each file must be less than 10MB' 
      }));
      return;
    }

    // Create preview objects
    const newPreviews = validSizeFiles.map(file => ({
      file: file,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...validSizeFiles]
    }));
    
    setFilePreviews(prev => [...prev, ...newPreviews]);
    setErrors(prev => ({ ...prev, documents: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.policy_id) newErrors.policy_id = 'Please select a policy';
    if (!formData.patient_name) newErrors.patient_name = 'Patient name is required';
    if (!formData.hospital_name) newErrors.hospital_name = 'Hospital name is required';
    
    if (!formData.claim_amount) {
      newErrors.claim_amount = 'Claim amount is required';
    } else if (isNaN(formData.claim_amount) || parseFloat(formData.claim_amount) <= 0) {
      newErrors.claim_amount = 'Please enter a valid amount';
    }
    
    if (!formData.service_date) {
      newErrors.service_date = 'Service date is required';
    }
    
    if (formData.claim_type === 'reimbursement') {
      if (!formData.bank_account_number) {
        newErrors.bank_account_number = 'Bank account number is required for reimbursement';
      }
      if (!formData.ifsc_code) {
        newErrors.ifsc_code = 'IFSC code is required';
      }
      if (!formData.bank_name) {
        newErrors.bank_name = 'Bank name is required';
      }
      if (!formData.account_holder_name) {
        newErrors.account_holder_name = 'Account holder name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('healthinsura360_token');
      
      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key !== 'documents' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      
      formData.documents.forEach(file => {
        submitData.append('documents', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/claims/submit`,
        submitData,
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
        // Clean up object URLs
        filePreviews.forEach(preview => {
          if (preview.preview) {
            URL.revokeObjectURL(preview.preview);
          }
        });
        
        alert('Claim submitted successfully!');
        navigate('/my-claims');
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      alert(error.response?.data?.error || 'Failed to submit claim');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const removeDocument = (index) => {
    // Clean up object URL
    if (filePreviews[index]?.preview) {
      URL.revokeObjectURL(filePreviews[index].preview);
    }
    
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
    
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Submit Reimbursement Claim</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Claim Type */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="claim_type"
                value="reimbursement"
                checked={formData.claim_type === 'reimbursement'}
                onChange={handleInputChange}
                className="form-radio h-4 w-4 text-burgundy-600"
              />
              <span className="ml-2">Reimbursement</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="claim_type"
                value="cashless"
                checked={formData.claim_type === 'cashless'}
                onChange={handleInputChange}
                className="form-radio h-4 w-4 text-burgundy-600"
              />
              <span className="ml-2">Cashless</span>
            </label>
          </div>
        </div>

        {/* Policy Selection */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Policy <span className="text-red-500">*</span>
          </label>
          <select
            name="policy_id"
            value={formData.policy_id}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
              errors.policy_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose a policy</option>
            {policies.map(policy => (
              <option key={policy.id} value={policy.id}>
                {policy.plan_name || policy.policy_name} - ₹{policy.premium_amount || policy.premium}
              </option>
            ))}
          </select>
          {errors.policy_id && (
            <p className="mt-1 text-sm text-red-500">{errors.policy_id}</p>
          )}
        </div>

        {/* Patient Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Patient Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="patient_name"
                value={formData.patient_name}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                  errors.patient_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Full name"
              />
              {errors.patient_name && (
                <p className="mt-1 text-sm text-red-500">{errors.patient_name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="patient_dob"
                value={formData.patient_dob}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                type="tel"
                name="patient_contact"
                value={formData.patient_contact}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                placeholder="Phone number"
              />
            </div>
          </div>
        </div>

        {/* Hospital Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Hospital Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital/Clinic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="hospital_name"
                value={formData.hospital_name}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                  errors.hospital_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Hospital name"
              />
              {errors.hospital_name && (
                <p className="mt-1 text-sm text-red-500">{errors.hospital_name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attending Physician
              </label>
              <input
                type="text"
                name="provider_name"
                value={formData.provider_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                placeholder="Doctor's name"
              />
            </div>
          </div>
        </div>

        {/* Medical Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Medical Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnosis
              </label>
              <input
                type="text"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                placeholder="Primary diagnosis"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="service_date"
                  value={formData.service_date}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                    errors.service_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.service_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.service_date}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Date
                </label>
                <input
                  type="date"
                  name="admission_date"
                  value={formData.admission_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discharge Date
                </label>
                <input
                  type="date"
                  name="discharge_date"
                  value={formData.discharge_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Claim Amount */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Claim Amount</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="claim_amount"
                value={formData.claim_amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                  errors.claim_amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter amount"
              />
              {errors.claim_amount && (
                <p className="mt-1 text-sm text-red-500">{errors.claim_amount}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim Date
              </label>
              <input
                type="date"
                name="claim_date"
                value={formData.claim_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            placeholder="Describe the treatment, procedure, medications, etc."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
          />
        </div>

        {/* Bank Details */}
        {showBankDetails && (
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-burgundy-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Bank Account Details for Reimbursement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                    errors.account_holder_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Name on bank account"
                />
                {errors.account_holder_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.account_holder_name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                    errors.bank_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Bank name"
                />
                {errors.bank_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.bank_name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                    errors.bank_account_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Account number"
                />
                {errors.bank_account_number && (
                  <p className="mt-1 text-sm text-red-500">{errors.bank_account_number}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent ${
                    errors.ifsc_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="IFSC code"
                />
                {errors.ifsc_code && (
                  <p className="mt-1 text-sm text-red-500">{errors.ifsc_code}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Upload */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supporting Documents
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-burgundy-500 transition-colors">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
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
                  htmlFor="documents"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-burgundy-600 hover:text-burgundy-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-burgundy-500"
                >
                  <span>Upload files</span>
                  <input
                    id="documents"
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
          {errors.documents && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.documents}
            </p>
          )}

          {/* Improved File List with Icons */}
          {filePreviews.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Selected Files ({filePreviews.length})
              </h4>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {filePreviews.map((file, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(file.file)}
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size}</p>
                      </div>

                      {/* Image Preview (if available) */}
                      {file.preview && (
                        <div className="flex-shrink-0">
                          <img 
                            src={file.preview} 
                            alt={file.name}
                            className="h-10 w-10 object-cover rounded border border-gray-300"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="ml-2 flex-shrink-0 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-burgundy-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 text-right">{uploadProgress}% uploaded</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-6 py-3 bg-burgundy-600 text-white font-medium rounded-lg hover:bg-burgundy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-burgundy-500 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/customer-dashboard')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitClaim;