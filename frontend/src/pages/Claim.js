import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Chip,
} from '@mui/material';
import { ArrowBack, Upload, CheckCircle } from '@mui/icons-material';
import axios from 'axios';

const Claims = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [formData, setFormData] = useState({
    // Basic Info
    policyId: '',
    claimType: 'reimbursement',
    
    // Patient Information
    patientName: '',
    patientDob: '',
    patientContact: '',
    
    // Insured Information (if dependent)
    insuredName: '',
    insuredRelation: '',
    
    // Hospital & Treatment Details
    hospitalName: '',
    providerName: '',
    diagnosis: '',
    cptCodes: '',
    icdCodes: '',
    serviceDate: '',
    admissionDate: '',
    dischargeDate: '',
    
    // Claim Details
    claimAmount: '',
    claimDate: '',
    reasonForClaim: '',
    
    // Payment Details
    bankAccountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolderName: '',
  });

  const steps = [
    'Basic Information',
    'Patient Details',
    'Treatment Information',
    'Payment Details',
    'Documents & Submit'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('healthinsura360_token');
      const claimsFormData = new FormData();

      // Add all text fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          claimsFormData.append(key, formData[key]);
        }
      });

      // Add files
      uploadedFiles.forEach((file, index) => {
        claimsFormData.append('documents', file);
      });

      const response = await axios.post(
        'http://localhost:5000/api/claims/submit',
        claimsFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess('✅ Claim submitted successfully! Your claim is now under review.');
      
      // Reset form
      setTimeout(() => {
        setFormData({
          policyId: '',
          claimType: 'reimbursement',
          patientName: '',
          patientDob: '',
          patientContact: '',
          insuredName: '',
          insuredRelation: '',
          hospitalName: '',
          providerName: '',
          diagnosis: '',
          cptCodes: '',
          icdCodes: '',
          serviceDate: '',
          admissionDate: '',
          dischargeDate: '',
          claimAmount: '',
          claimDate: '',
          reasonForClaim: '',
          bankAccountNumber: '',
          ifscCode: '',
          bankName: '',
          accountHolderName: '',
        });
        setUploadedFiles([]);
        setActiveStep(0);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }, 2000);

    } catch (err) {
      setError(`❌ ${err.response?.data?.error || 'Failed to submit claim'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1">
          File Reimbursement Claim
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main Form */}
        <Grid item xs={12} lg={9}>
          <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
            {success && (
              <Alert 
                severity="success" 
                icon={<CheckCircle />}
                sx={{ mb: 3 }}
              >
                {success}
              </Alert>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Divider sx={{ mb: 3 }} />

            <form onSubmit={handleSubmit}>
              {/* Step 0: Basic Information */}
              {activeStep === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    📋 Basic Claim Information
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Policy ID"
                        name="policyId"
                        value={formData.policyId}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required disabled={loading}>
                        <InputLabel>Claim Type</InputLabel>
                        <Select
                          name="claimType"
                          value={formData.claimType}
                          onChange={handleChange}
                          label="Claim Type"
                        >
                          <MenuItem value="reimbursement">Reimbursement</MenuItem>
                          <MenuItem value="cashless">Cashless</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Claim Date"
                        name="claimDate"
                        type="date"
                        value={formData.claimDate}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Claim Amount (₹)"
                        name="claimAmount"
                        type="number"
                        value={formData.claimAmount}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Reason for Claim"
                        name="reasonForClaim"
                        multiline
                        rows={3}
                        value={formData.reasonForClaim}
                        onChange={handleChange}
                        placeholder="Describe the treatment/emergency that led to this claim"
                        disabled={loading}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Step 1: Patient Information */}
              {activeStep === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    👤 Patient Information
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Patient Full Name"
                        name="patientName"
                        value={formData.patientName}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Date of Birth"
                        name="patientDob"
                        type="date"
                        value={formData.patientDob}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Contact Number"
                        name="patientContact"
                        value={formData.patientContact}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </Grid>

                    <Divider sx={{ gridColumn: '1 / -1', my: 2 }} />

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        Insured Information (If different from patient - e.g., dependent)
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Insured Name (Optional)"
                        name="insuredName"
                        value={formData.insuredName}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Relation to Patient (Optional)"
                        name="insuredRelation"
                        value={formData.insuredRelation}
                        onChange={handleChange}
                        placeholder="e.g., Spouse, Child, Parent"
                        disabled={loading}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Step 2: Treatment Information */}
              {activeStep === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    🏥 Treatment Information
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Hospital/Clinic Name"
                        name="hospitalName"
                        value={formData.hospitalName}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Provider/Doctor Name"
                        name="providerName"
                        value={formData.providerName}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Diagnosis"
                        name="diagnosis"
                        multiline
                        rows={2}
                        value={formData.diagnosis}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Service Date"
                        name="serviceDate"
                        type="date"
                        value={formData.serviceDate}
                        onChange={handleChange}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="CPT Codes (Procedure Codes)"
                        name="cptCodes"
                        value={formData.cptCodes}
                        onChange={handleChange}
                        placeholder="e.g., 99213, 70450"
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="ICD Codes (Diagnosis Codes)"
                        name="icdCodes"
                        value={formData.icdCodes}
                        onChange={handleChange}
                        placeholder="e.g., I10, M79.3"
                        disabled={loading}
                      />
                    </Grid>

                    <Divider sx={{ gridColumn: '1 / -1', my: 2 }} />

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Admission Date (if hospitalized)"
                        name="admissionDate"
                        type="date"
                        value={formData.admissionDate}
                        onChange={handleChange}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Discharge Date (if hospitalized)"
                        name="dischargeDate"
                        type="date"
                        value={formData.dischargeDate}
                        onChange={handleChange}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Step 3: Payment Details */}
              {activeStep === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    💳 Payment Details (For Reimbursement)
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Provide your bank account details for reimbursement processing
                  </Alert>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bank Account Holder Name"
                        name="accountHolderName"
                        value={formData.accountHolderName}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bank Name"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bank Account Number"
                        name="bankAccountNumber"
                        value={formData.bankAccountNumber}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="IFSC Code"
                        name="ifscCode"
                        value={formData.ifscCode}
                        onChange={handleChange}
                        placeholder="e.g., SBIN0001234"
                        disabled={loading}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Step 4: Documents */}
              {activeStep === 4 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    📄 Required Documents
                  </Typography>

                  <Alert severity="warning" sx={{ mb: 3 }}>
                    ✅ Upload all supporting documents (Max 10 files, 25MB per file)
                  </Alert>

                  <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Documents Required:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <li>Itemized Bill/Invoice from hospital</li>
                      <li>Payment Receipt (proof of payment)</li>
                      <li>Medical Reports (discharge summary, test results)</li>
                      <li>Doctor's Prescriptions</li>
                      <li>Any other relevant documents</li>
                    </Box>
                  </Box>

                  <Box sx={{ p: 2, border: '2px dashed #1976d2', borderRadius: 2, textAlign: 'center' }}>
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                      <Button
                        variant="contained"
                        component="span"
                        startIcon={<Upload />}
                        disabled={loading}
                      >
                        Click to Upload Documents
                      </Button>
                    </label>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      or drag and drop files here
                    </Typography>
                  </Box>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        📎 Uploaded Files ({uploadedFiles.length}/10):
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {uploadedFiles.map((file, index) => (
                          <Chip
                            key={index}
                            label={file.name}
                            onDelete={() => removeFile(index)}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0 || loading}
                >
                  Back
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadedFiles.length === 0}
                    size="large"
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit Claim'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={loading}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </form>
          </Paper>
        </Grid>

        {/* Info Sidebar */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                📋 Claim Checklist
              </Typography>

              <Box sx={{ mt: 2 }}>
                {[
                  'Policy ID ready',
                  'Claim amount calculated',
                  'Patient information available',
                  'Treatment details documented',
                  'Payment details prepared',
                  'All documents scanned',
                ].map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                    <Box sx={{ color: 'primary.main', mt: 0.5 }}>▢</Box>
                    <Typography variant="body2">{item}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Processing Time
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Claims typically processed within 7-14 working days
              </Typography>

              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f7ff', borderRadius: 1 }}>
                <Typography variant="caption">
                  💡 <strong>Tip:</strong> Keep copies of all documents for your records
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Claims;