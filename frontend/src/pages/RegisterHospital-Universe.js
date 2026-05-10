import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Card,
  Stack,
  Chip,
} from "@mui/material";
import {
  Email,
  Business,
  Phone,
  LocationOn,
  CheckCircle,
  ArrowBack,
  MedicalServices,
  CloudUpload,
  Delete as DeleteIcon,
  Person,
} from "@mui/icons-material";
import { API_BASE_URL } from '../utils/config';

const steps = ['Hospital Details', 'Upload Documents', 'Confirmation'];

const RegisterHospital = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    contactPerson: "",
    registrationNumber: "", // Optional - if they already have one from government
    street: "",
    city: "",
    state: "",
    zipCode: "",
    documents: [] // Array to store uploaded file objects
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDocumentUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploadingDocuments(true);
    setError("");

    try {
      const formDataObj = new FormData();
      
      // Add all files to FormData
      for (let i = 0; i < files.length; i++) {
        formDataObj.append('documents', files[i]);
      }

      // Upload files to backend
      const response = await fetch(`${API_BASE_URL}/hospitals/upload-documents`, {
        method: 'POST',
        body: formDataObj
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Document upload failed');
      }

      // Add uploaded files to form data
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...data.files]
      }));

      setSuccess(`Successfully uploaded ${data.files.length} document(s)`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error('Document upload error:', err);
      setError(err.message || 'Failed to upload documents. Please try again.');
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    handleDocumentUpload(files);
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    setError("");

    if (activeStep === 0) {
      // Step 1: Hospital details validation
      const requiredFields = ['name', 'email', 'phone', 'contactPerson', 'street', 'city', 'state', 'zipCode'];
      const emptyFields = requiredFields.filter(field => !formData[field].trim());
      
      if (emptyFields.length > 0) {
        setError("Please fill all required fields");
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Please enter a valid email address");
        return;
      }
      
      // Phone validation
      if (!/^\d{10}$/.test(formData.phone)) {
        setError("Phone number must be 10 digits");
        return;
      }
      
      // Zip code validation
      if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
        setError("Please enter a valid zip code (5 digits or 5+4 format)");
        return;
      }
    } else if (activeStep === 1) {
      // Step 2: Document upload validation (optional but recommended)
      if (formData.documents.length === 0) {
        setError("Please upload at least one document (Certificate, License, or Tax Clearance)");
        return;
      }
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Prepare hospital data for backend - NO PASSWORD
      const hospitalData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        contactPerson: formData.contactPerson,
        registrationNumber: formData.registrationNumber || null, // Optional external reg number
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipCode,
        documents: formData.documents.map(doc => ({
          filename: doc.filename,
          originalName: doc.originalName,
          url: doc.url
        }))
      };

      console.log('Sending hospital data to backend:', hospitalData);

      // API call to backend
      const response = await fetch(`${API_BASE_URL}/hospitals/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hospitalData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Hospital registration failed');
      }

      // Success - data saved to database
      setLoading(false);
      setSuccess('✅ Hospital registration submitted successfully! Admin will review your application. You will receive an email with your registration number and password setup link once approved.');
      
      // Store email for reference
      localStorage.setItem('pendingHospitalEmail', formData.email);
      
      // Clear form
      setFormData({
        name: "",
        email: "",
        phone: "",
        contactPerson: "",
        registrationNumber: "",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        documents: []
      });
      
      // Redirect to login page after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);

    } catch (err) {
      console.error('Hospital registration error:', err);
      setError(err.message || 'Hospital registration failed. Please try again.');
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        // Step 1: Hospital Details (NO PASSWORD FIELDS)
        return (
          <Stack spacing={3} sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            {/* Hospital Name */}
            <TextField
              fullWidth
              label="Hospital Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business sx={{ color: "#94a3b8", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Contact Person */}
            <TextField
              fullWidth
              label="Contact Person Name"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              required
              variant="outlined"
              size="medium"
              helperText="Name of hospital representative"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: "#94a3b8", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Email and Phone side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                helperText="Login email will be used for account"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                helperText="10 digits"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Government Registration Number (Optional) */}
            <TextField
              fullWidth
              label="Government Registration Number"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              variant="outlined"
              size="medium"
              helperText="If you have one from government (optional)"
            />

            {/* Street Address */}
            <TextField
              fullWidth
              label="Street Address"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOn sx={{ color: "#94a3b8", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* City, State, Zip Code side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
              />
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                helperText="e.g., CA"
              />
              <TextField
                fullWidth
                label="Zip Code"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                helperText="5 or 9 digits"
              />
            </Box>

            {/* Info Box */}
            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, mt: 2 }}>
              <Typography variant="body2" color="#0a2540">
                <strong>Note:</strong> After admin approval, you will receive an email with your 
                <strong> HealthInsura360 Registration Number</strong> and a link to set your password.
              </Typography>
            </Box>
          </Stack>
        );

      case 1:
        // Step 2: Document Upload (same as before)
        return (
          <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#0a2540', fontWeight: 600 }}>
              📄 Upload Documents
            </Typography>
            <Typography variant="body2" color="#64748b" paragraph>
              Please upload hospital documents for verification:
            </Typography>

            {/* Document Upload Area */}
            <Box
              sx={{
                border: '2px dashed #0cc0df',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                mb: 3,
                bgcolor: '#f0faff',
                '&:hover': {
                  bgcolor: '#e0f7ff',
                  borderColor: '#0aa9c4'
                }
              }}
              component="label"
            >
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={uploadingDocuments}
              />
              {uploadingDocuments ? (
                <>
                  <CircularProgress size={40} sx={{ mb: 2, color: '#0cc0df' }} />
                  <Typography variant="body2" color="#0cc0df">
                    Uploading documents...
                  </Typography>
                </>
              ) : (
                <>
                  <CloudUpload sx={{ fontSize: 48, color: '#0cc0df', mb: 2 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#0a2540', mb: 1 }}>
                    Click to upload or drag and drop
                  </Typography>
                  <Typography variant="body2" color="#64748b">
                    PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX (Max 10MB per file)
                  </Typography>
                </>
              )}
            </Box>

            {/* Accepted Document Types */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#0a2540' }}>
                ✓ Accepted documents:
              </Typography>
              <Typography variant="body2" color="#64748b">
                • Hospital License & Certifications<br/>
                • Tax Clearance Certificate<br/>
                • Board Registration Proof<br/>
                • Any other relevant documents
              </Typography>
            </Box>

            {/* Uploaded Files Display */}
            {formData.documents.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#0a2540' }}>
                  Uploaded Files ({formData.documents.length}):
                </Typography>
                <Stack spacing={1}>
                  {formData.documents.map((doc, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: '#f0faff',
                        borderRadius: 1,
                        border: '1px solid #0cc0df'
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#0a2540', fontWeight: 500 }}>
                        {doc.originalName}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleRemoveDocument(index)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        );

      case 2:
        // Step 3: Confirmation
        return (
          <Box sx={{ textAlign: 'center', py: 2, maxWidth: 500, mx: 'auto' }}>
            <CheckCircle sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Review Hospital Information
            </Typography>
            <Typography variant="body1" color="#64748b" paragraph>
              Please review your hospital information. Admin will verify the documents and provide login credentials via email.
            </Typography>

            <Card sx={{ 
              p: 3, 
              textAlign: 'left', 
              bgcolor: '#f8fafc', 
              border: '1px solid #e2e8f0',
              maxWidth: '100%',
              mb: 2
            }}>
              <Typography variant="subtitle2" gutterBottom sx={{ color: '#0a2540', fontWeight: 700 }}>
                HOSPITAL DETAILS
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Name:</strong> {formData.name}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Contact Person:</strong> {formData.contactPerson}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Email:</strong> {formData.email}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Phone:</strong> {formData.phone}
              </Typography>
              {formData.registrationNumber && (
                <Typography variant="subtitle1" gutterBottom>
                  <strong style={{ color: '#0a2540' }}>Govt Reg #:</strong> {formData.registrationNumber}
                </Typography>
              )}
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Address:</strong> {formData.street}, {formData.city}, {formData.state} {formData.zipCode}
              </Typography>

              {/* Documents Submitted */}
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ color: '#0a2540', fontWeight: 700, mb: 1 }}>
                  DOCUMENTS ({formData.documents.length})
                </Typography>
                {formData.documents.length > 0 ? (
                  <Box>
                    {formData.documents.map((doc, index) => (
                      <Chip
                        key={index}
                        label={doc.originalName}
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="#ff9800" sx={{ fontStyle: 'italic' }}>
                    No documents uploaded
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: '#fff8e1', borderRadius: 1 }}>
                <Typography variant="body2" color="#ff9800">
                  <strong>Important:</strong> After admin approval, you will receive an email with your 
                  <strong> HealthInsura360 Registration Number</strong> and a link to set your password.
                  You will need both your email and registration number to log in.
                </Typography>
              </Box>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: "#f8fafc", 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      py: 4 
    }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "white",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* LOGO AREA */}
          <Box sx={{ textAlign: "center", mb: 4, width: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 3 
            }}>
              <img
                src="/HealthInsura360.png"
                alt="HealthInsura360 Logo"
                style={{ 
                  width: 180, 
                  height: 'auto',
                  objectFit: 'contain',
                  marginBottom: 16
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  document.getElementById('fallback-logo').style.display = 'flex';
                }}
              />
              
              <Box 
                id="fallback-logo"
                sx={{ 
                  display: 'none',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MedicalServices sx={{ 
                  fontSize: 64, 
                  color: "#0cc0df",
                  mb: 1
                }} />
                <Typography variant="h3" fontWeight={800} color="#0a2540">
                  HealthInsura360
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="h4" fontWeight={700} color="#0a2540" gutterBottom>
              Register as Hospital
            </Typography>
            <Typography variant="body1" color="#64748b">
              Submit your hospital details for verification
            </Typography>
          </Box>

          {/* STEPPER */}
          <Box sx={{ width: '100%', mb: 5, display: 'flex', justifyContent: 'center' }}>
            <Stepper activeStep={activeStep} sx={{ maxWidth: 600, width: '100%' }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* ERROR/SUCCESS ALERTS */}
          <Box sx={{ width: '100%', maxWidth: 500, mb: 3 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ borderRadius: 2, textAlign: 'left' }}>
                {success}
              </Alert>
            )}
          </Box>

          {/* FORM */}
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 500 }}>
              <form onSubmit={activeStep === steps.length - 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                {renderStepContent(activeStep)}

                {/* NAVIGATION BUTTONS */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
                  <Button
                    disabled={activeStep === 0 || loading}
                    onClick={handleBack}
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    sx={{
                      borderColor: '#e2e8f0',
                      color: '#425466',
                      borderRadius: 2,
                      px: 4,
                      py: 1.5
                    }}
                  >
                    Back
                  </Button>

                  {activeStep === steps.length - 1 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                      sx={{
                        px: 5,
                        py: 1.5,
                        borderRadius: 2,
                        bgcolor: "#4caf50",
                        fontWeight: 600,
                        fontSize: "1rem",
                        "&:hover": { bgcolor: "#388e3c" },
                        "&.Mui-disabled": {
                          bgcolor: "#e2e8f0",
                          color: "#94a3b8"
                        }
                      }}
                    >
                      {loading ? "Submitting..." : "Submit Hospital Application"}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{
                        px: 5,
                        py: 1.5,
                        borderRadius: 2,
                        bgcolor: "#4caf50",
                        fontWeight: 600,
                        fontSize: "1rem",
                        "&:hover": { bgcolor: "#388e3c" }
                      }}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </form>
            </Box>
          </Box>

          {/* ALTERNATIVE REGISTRATION OPTIONS */}
          <Box sx={{ width: '100%', maxWidth: 500, mt: 5, pt: 3, borderTop: "1px solid #e2e8f0", textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600} color="#0a2540" gutterBottom>
              Looking for a different account?
            </Typography>
            <Typography variant="body2" color="#64748b" sx={{ mb: 3 }}>
              Register as a different user type:
            </Typography>
            
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: "#0cc0df",
                  color: "#0cc0df",
                  borderRadius: 2,
                  fontWeight: 600,
                  py: 1.5,
                  "&:hover": {
                    borderColor: "#0aa9c4",
                    bgcolor: "#f0faff",
                  },
                }}
              >
                Register as Customer
              </Button>
              <Button
                component={Link}
                to="/register-agent"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: "#ff9800",
                  color: "#ff9800",
                  borderRadius: 2,
                  fontWeight: 600,
                  py: 1.5,
                  "&:hover": {
                    borderColor: "#f57c00",
                    bgcolor: "#fff3e0",
                  },
                }}
              >
                Register as Agent
              </Button>
            </Stack>
          </Box>

          {/* ALREADY HAVE ACCOUNT */}
          <Box sx={{ width: '100%', maxWidth: 500, mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="#64748b" sx={{ mb: 2 }}>
              Already have an account?
            </Typography>

            <Button
              component={Link}
              to="/login"
              variant="outlined"
              fullWidth
              sx={{
                borderColor: "#0cc0df",
                color: "#0cc0df",
                borderRadius: 2,
                fontWeight: 600,
                py: 1.5,
                "&:hover": {
                  borderColor: "#0aa9c4",
                  bgcolor: "#f0faff",
                },
              }}
            >
              Sign In to Existing Account
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterHospital;