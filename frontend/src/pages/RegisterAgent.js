import React, { useState, useEffect } from "react";
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
  IconButton,
  Stack,
  MenuItem,
} from "@mui/material";
import {
  Email,
  Lock,
  Person,
  Phone,
  CheckCircle,
  ArrowBack,
  MedicalServices,
  Visibility,
  VisibilityOff,
  LocationCity,
  LocationOn,
  Map,
  Home,
  CalendarMonth,
} from "@mui/icons-material";
import { API_BASE_URL } from '../utils/config';

const steps = ['Agent Details', 'Account Security', 'Confirmation'];

const RegisterAgent = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordMatch, setPasswordMatch] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Updated formData state WITHOUT licenseNumber and commissionRate
  const [formData, setFormData] = useState({
    // Step 1: Agent Details
    firstName: "",
    lastName: "",
    gender: "male",
    dob: "",
    email: "",
    phone: "",
    // REMOVED: licenseNumber and commissionRate
    
    // Address fields
    street: "",
    city: "",
    state: "",
    zipcode: "",
    
    // Step 2: Account Security
    password: "",
    confirmPassword: "",
  });

  // Password validation function
  const validatePassword = (password) => {
    if (!password) return '';
    
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/\d/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push('One special character');
    
    return errors.length === 0 ? '' : errors.join(', ');
  };

  // Check password match
  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      setPasswordMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordMatch(false);
    }
  }, [formData.password, formData.confirmPassword]);

  // Validate password on change
  useEffect(() => {
    setPasswordError(validatePassword(formData.password));
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Toggle visibility functions
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleNext = () => {
    // Validate current step before moving forward
    if (activeStep === 0) {
      // Step 1 validations - REMOVED licenseNumber validation
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'zipcode', 'dob'];
      const emptyFields = requiredFields.filter(field => !formData[field].trim());
      
      if (emptyFields.length > 0) {
        setError("Please fill all required fields in Step 1");
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
      if (!/^\d{5,6}$/.test(formData.zipcode)) {
        setError("Zip code must be 5-6 digits");
        return;
      }
      
      setError("");
    } else if (activeStep === 1) {
      // Step 2 validations
      if (!formData.password || !formData.confirmPassword) {
        setError("Please fill all required fields in Step 2");
        return;
      }
      if (passwordError) {
        setError(`Password requirements not met: ${passwordError}`);
        return;
      }
      if (!passwordMatch) {
        setError("Passwords do not match");
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
  setSuccess("");

  try {
    // Generate random license number
    const randomLicenseNumber = `AGENT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    // Prepare agent data
    const agentData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      licenseNumber: randomLicenseNumber,
      commissionRate: null,
      street: formData.street,
      city: formData.city,
      state: formData.state,
      zipcode: formData.zipcode,
      date_of_birth: formData.dob
    };

    // DEBUG: Log all fields
    console.log('=== AGENT REGISTRATION DATA ===');
    console.log('firstName:', formData.firstName, 'filled:', !!formData.firstName);
    console.log('lastName:', formData.lastName, 'filled:', !!formData.lastName);
    console.log('gender:', formData.gender, 'filled:', !!formData.gender);
    console.log('email:', formData.email, 'filled:', !!formData.email);
    console.log('phone:', formData.phone, 'filled:', !!formData.phone);
    console.log('password:', '[HIDDEN]', 'filled:', !!formData.password);
    console.log('street:', formData.street, 'filled:', !!formData.street);
    console.log('city:', formData.city, 'filled:', !!formData.city);
    console.log('state:', formData.state, 'filled:', !!formData.state);
    console.log('zipcode:', formData.zipcode, 'filled:', !!formData.zipcode);
    console.log('dob:', formData.dob, 'filled:', !!formData.dob);
    console.log('licenseNumber (generated):', randomLicenseNumber);
    console.log('commissionRate:', null);
    console.log('===============================');

    console.log('Sending agent data to backend:', agentData);

    // API call to backend
    const response = await fetch(`${API_BASE_URL}/auth/register/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentData),
    });

    const data = await response.json();
    console.log('Backend response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Success
    setLoading(false);
    setSuccess('Agent account created successfully! Redirecting to login...');
    
    localStorage.setItem('tempUserEmail', formData.email);
    localStorage.setItem('tempUserType', 'agent');
    
    setTimeout(() => {
      navigate('/login');
    }, 2000);

  } catch (err) {
    console.error('Registration error:', err);
    setError(err.message || 'Registration failed. Please try again.');
    setLoading(false);
  }
};

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3} sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            {/* Name fields side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Gender and DOB side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                fullWidth
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                      },
                    },
                  },
                }}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Date of Birth"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

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
                    <Home sx={{ color: "#94a3b8", mr: 1 }} />
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationCity sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Zip Code"
                name="zipcode"
                value={formData.zipcode}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                helperText="5-6 digits"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Map sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3} sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            {/* Password fields side by side */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                error={!!passwordError && formData.password.length > 0}
                helperText={formData.password.length > 0 ? passwordError : "Min 8 chars: A-Z, a-z, 0-9, special"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="large"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                FormHelperTextProps={{
                  sx: { 
                    color: passwordError ? '#f44336' : '#666',
                    fontWeight: 500,
                    fontSize: '0.8rem'
                  }
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                error={formData.confirmPassword.length > 0 && !passwordMatch}
                helperText={
                  formData.confirmPassword.length > 0 
                    ? (passwordMatch ? "✓ Passwords match" : "✗ Passwords do not match")
                    : "Re-enter your password"
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleClickShowConfirmPassword}
                        edge="end"
                        size="large"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                FormHelperTextProps={{
                  sx: { 
                    color: passwordMatch && formData.confirmPassword ? '#4caf50' : '#f44336',
                    fontWeight: 500
                  }
                }}
              />
            </Box>

            {/* Password Requirements Box */}
            {formData.password.length > 0 && (
              <Box sx={{ 
                bgcolor: '#f8fafc', 
                p: 3, 
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                mt: 1
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#0a2540' }}>
                  Password Requirements:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { label: 'At least 8 characters', check: formData.password.length >= 8 },
                    { label: 'One uppercase letter', check: /[A-Z]/.test(formData.password) },
                    { label: 'One lowercase letter', check: /[a-z]/.test(formData.password) },
                    { label: 'One number', check: /\d/.test(formData.password) },
                    { label: 'One special character', check: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) },
                  ].map((req, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        bgcolor: req.check ? '#4caf50' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5
                      }}>
                        {req.check ? '✓' : ''}
                      </Box>
                      <Typography variant="body2" sx={{ 
                        color: req.check ? '#4caf50' : '#666',
                        fontWeight: req.check ? 600 : 400
                      }}>
                        {req.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Review Your Information
            </Typography>
            <Typography variant="body1" color="#64748b" paragraph>
              Please review your information. Commission rate will be set by admin.
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
                <strong style={{ color: '#0a2540' }}>Name:</strong> {formData.firstName} {formData.lastName}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Gender:</strong> {formData.gender}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Date of Birth:</strong> {formData.dob}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Email:</strong> {formData.email}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Phone:</strong> {formData.phone}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong style={{ color: '#0a2540' }}>Address:</strong> {formData.street}, {formData.city}, {formData.state} {formData.zipcode}
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                <Typography variant="body2" color="#388e3c">
                  <strong>Note:</strong> Your commission rate will be assigned by the admin after review.
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
              Register as Insurance Agent
            </Typography>
            <Typography variant="body1" color="#64748b">
              Join our network of insurance agents
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
                      disabled={loading || !!passwordError || !passwordMatch}
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
                      {loading ? "Creating Account..." : "Create Agent Account"}
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
                to="/register-hospital"
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
                Register as Hospital
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

export default RegisterAgent;