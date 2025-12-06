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
  Stack, // ADDED
} from "@mui/material";
import {
  Email,
  Business,
  Phone,
  LocationOn,
  CheckCircle,
  ArrowBack,
  MedicalServices,
} from "@mui/icons-material";

const steps = ['Hospital Details', 'Confirmation'];

const RegisterHospital = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    // Hospital details only
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    // Note: registrationNumber will be generated on backend
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    // Validate current step before moving forward
    if (activeStep === 0) {
      // Step 1 validations
      const requiredFields = ['name', 'email', 'phone', 'street', 'city', 'state', 'zipCode'];
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
      
      setError("");
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
      // Prepare hospital data for backend
      const hospitalData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipCode,
        // Note: registrationNumber will be generated on backend
      };

      console.log('Sending hospital data to backend:', hospitalData);

      // API call to backend
      const response = await fetch('http://localhost:5000/api/auth/register/hospital', {
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
      setSuccess('Hospital registration submitted successfully! Admin will verify and provide credentials via email. Redirecting to login...');
      
      // Store temporary data for reference
      localStorage.setItem('tempHospitalEmail', formData.email);
      localStorage.setItem('tempHospitalName', formData.name);
      
      // Clear form
      setFormData({
        name: "",
        email: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        zipCode: "",
      });
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Hospital registration error:', err);
      setError(err.message || 'Hospital registration failed. Please try again.');
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
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
          </Stack>
        );

      case 1:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Review Hospital Information
            </Typography>
            <Typography variant="body1" color="#64748b" paragraph>
              Please review your hospital information. Admin will verify and provide login credentials via email.
            </Typography>

            <Card sx={{ 
              p: 3, 
              textAlign: 'left', 
              bgcolor: '#f8fafc', 
              border: '1px solid #e2e8f0',
              maxWidth: 500,
              mx: 'auto'
            }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Hospital Name:</strong> {formData.name}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Email:</strong> {formData.email}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Phone:</strong> {formData.phone}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Address:</strong> {formData.street}, {formData.city}, {formData.state} {formData.zipCode}
              </Typography>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: '#fff8e1', borderRadius: 1 }}>
                <Typography variant="body2" color="#ff9800">
                  <strong>Note:</strong> Login credentials will be provided by admin after verification. You will receive an email with login details.
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
      justifyContent: 'center', // ADDED
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
            display: 'flex', // ADDED
            flexDirection: 'column', // ADDED
            alignItems: 'center', // ADDED
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

          {/* STEPPER - Centered */}
          <Box sx={{ width: '100%', mb: 5, display: 'flex', justifyContent: 'center' }}>
            <Stepper activeStep={activeStep} sx={{ maxWidth: 500 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* ERROR/SUCCESS ALERTS - Centered */}
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

          {/* FORM - Centered */}
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
                      {loading ? "Submitting..." : "Submit Hospital Details"}
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

          {/* ALTERNATIVE REGISTRATION OPTIONS - Centered */}
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

          {/* ALREADY HAVE ACCOUNT - Centered */}
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