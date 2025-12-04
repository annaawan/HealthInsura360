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
  Grid,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Card,
  IconButton,
} from "@mui/material";
import {
  Email,
  Lock,
  Business,
  Phone,
  LocationOn,
  CheckCircle,
  ArrowBack,
  MedicalServices,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

const steps = ['Hospital Details', 'Account Security', 'Confirmation'];

const RegisterHospital = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordMatch, setPasswordMatch] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [formData, setFormData] = useState({
    // Step 1
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    
    // Step 2
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
      // Step 1 validations
      const requiredFields = ['name', 'email', 'phone', 'street', 'city', 'state', 'zipCode'];
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
      if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
        setError("Please enter a valid zip code (5 digits or 5+4 format)");
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

    try {
      // Prepare data for backend
      const hospitalData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        password: formData.password,
        userType: 'hospital'
      };

      console.log('Sending to backend:', hospitalData);

      // TODO: Replace with actual API call
      setTimeout(() => {
        setLoading(false);
        setSuccess('Hospital account created successfully! Redirecting to login...');
        
        localStorage.setItem('tempUserEmail', formData.email);
        localStorage.setItem('tempUserType', 'hospital');
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }, 1500);

    } catch (err) {
      setError('Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            {/* Hospital Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hospital Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Email and Phone */}
            <Grid item xs={12} md={6}>
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
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
                helperText="10 digits required"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Street Address */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                name="street"
                value={formData.street}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn sx={{ color: "#94a3b8", mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* City, State, Zip Code */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
                helperText="e.g., CA"
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Zip Code"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
                helperText="5 digits or 5+4 format"
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
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
                sx={{ mb: 2 }}
                error={!!passwordError && formData.password.length > 0}
                helperText={formData.password.length > 0 ? passwordError : "Minimum 8 characters with uppercase, lowercase, number & special character"}
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
            </Grid>

            <Grid item xs={12} md={6}>
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
                sx={{ mb: 2 }}
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
            </Grid>

            {/* Password Requirements Box */}
            {formData.password.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ 
                  bgcolor: '#f8fafc', 
                  p: 3, 
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  mt: 2
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#0a2540' }}>
                    Password Requirements:
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: '50%', 
                          bgcolor: formData.password.length >= 8 ? '#4caf50' : '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5
                        }}>
                          {formData.password.length >= 8 ? '✓' : ''}
                        </Box>
                        <Typography variant="body2" sx={{ 
                          color: formData.password.length >= 8 ? '#4caf50' : '#666',
                          fontWeight: formData.password.length >= 8 ? 600 : 400
                        }}>
                          At least 8 characters
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: '50%', 
                          bgcolor: /[A-Z]/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5
                        }}>
                          {/[A-Z]/.test(formData.password) ? '✓' : ''}
                        </Box>
                        <Typography variant="body2" sx={{ 
                          color: /[A-Z]/.test(formData.password) ? '#4caf50' : '#666',
                          fontWeight: /[A-Z]/.test(formData.password) ? 600 : 400
                        }}>
                          One uppercase letter
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: '50%', 
                          bgcolor: /[a-z]/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5
                        }}>
                          {/[a-z]/.test(formData.password) ? '✓' : ''}
                        </Box>
                        <Typography variant="body2" sx={{ 
                          color: /[a-z]/.test(formData.password) ? '#4caf50' : '#666',
                          fontWeight: /[a-z]/.test(formData.password) ? 600 : 400
                        }}>
                          One lowercase letter
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: '50%', 
                          bgcolor: /\d/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5
                        }}>
                          {/\d/.test(formData.password) ? '✓' : ''}
                        </Box>
                        <Typography variant="body2" sx={{ 
                          color: /\d/.test(formData.password) ? '#4caf50' : '#666',
                          fontWeight: /\d/.test(formData.password) ? 600 : 400
                        }}>
                          One number
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: '50%', 
                          bgcolor: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? '#4caf50' : '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5
                        }}>
                          {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? '✓' : ''}
                        </Box>
                        <Typography variant="body2" sx={{ 
                          color: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? '#4caf50' : '#666',
                          fontWeight: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? 600 : 400
                        }}>
                          One special character
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            )}
          </Grid>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Review Your Information
            </Typography>
            <Typography variant="body1" color="#64748b" paragraph>
              Please review your information before creating your hospital account.
            </Typography>

            <Card sx={{ 
              p: 3, 
              textAlign: 'left', 
              bgcolor: '#f8fafc', 
              border: '1px solid #e2e8f0',
              maxWidth: 600,
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
          }}
        >
          {/* LOGO AREA */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 3 
            }}>
              <img
                src="/favicon.png"
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
              Join our network of healthcare providers
            </Typography>
          </Box>

          {/* STEPPER */}
          <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* ERROR ALERT */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* SUCCESS ALERT */}
          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          {/* FORM */}
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
                  {loading ? "Creating Account..." : "Create Hospital Account"}
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

          {/* ALTERNATIVE REGISTRATION OPTIONS */}
          <Box textAlign="center" sx={{ mt: 5, pt: 3, borderTop: "1px solid #e2e8f0" }}>
            <Typography variant="h6" fontWeight={600} color="#0a2540" gutterBottom>
              Looking for a different account?
            </Typography>
            <Typography variant="body2" color="#64748b" sx={{ mb: 3 }}>
              Register as a different user type:
            </Typography>
            
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} md={6}>
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
              </Grid>
              <Grid item xs={12} md={6}>
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
              </Grid>
            </Grid>
          </Box>

          {/* ALREADY HAVE ACCOUNT */}
          <Box textAlign="center" sx={{ mt: 4 }}>
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