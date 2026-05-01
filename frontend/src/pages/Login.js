import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  MenuItem,
  InputAdornment,
  IconButton,
  Stack,
} from '@mui/material';
import { Email, Lock, Person, Visibility, VisibilityOff, Business } from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationMessage = location.state?.message;
  const locationAccountType = location.state?.accountType;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(locationMessage || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistrationNumber, setShowRegistrationNumber] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    registrationNumber: '',
    accountType: locationAccountType || 'customer',
  });

  // Format registration number with fixed H360- prefix and dashes
  const formatRegistrationNumber = (value) => {
    // Remove all non-alphanumeric characters
    let cleaned = value.replace(/[^A-Za-z0-9]/g, '');
    
    // Make everything uppercase
    cleaned = cleaned.toUpperCase();
    
    // The prefix "H360" is fixed - user can only type after it
    // Remove any H360 that might have been typed at the beginning to avoid duplication
    if (cleaned.startsWith('H360')) {
      cleaned = cleaned.substring(4);
    }
    
    // Limit to 8 characters max (for two groups of 4)
    cleaned = cleaned.slice(0, 8);
    
    // Build the formatted string: H360-XXXX-XXXX
    let formatted = 'H360';
    
    // Add first dash and first group (up to 4 chars)
    if (cleaned.length > 0) {
      formatted += `-${cleaned.slice(0, 4)}`;
    } else {
      formatted += '-';
    }
    
    // Add second dash and second group (if there are more than 4 chars)
    if (cleaned.length > 4) {
      formatted += `-${cleaned.slice(4, 8)}`;
    } else if (cleaned.length >= 0) {
      // Add the second dash placeholder
      formatted += '-';
    }
    
    return formatted;
  };

  // Validate registration number format
  const validateRegistrationNumber = (regNumber) => {
    // Pattern: H360-XXXX-XXXX (where X is alphanumeric, exactly 4 chars each)
    const pattern = /^H360-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    return pattern.test(regNumber);
  };

  // Extract just the user-entered part for validation
  const getRegistrationNumberParts = (regNumber) => {
    const match = regNumber.match(/^H360-([A-Z0-9]{4})-([A-Z0-9]{4})$/i);
    if (match) {
      return { firstGroup: match[1], secondGroup: match[2] };
    }
    return null;
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowRegistrationNumber = () => {
    setShowRegistrationNumber(!showRegistrationNumber);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (successMessage) setSuccessMessage('');
  };

  const handleRegistrationNumberChange = (e) => {
    // Get the raw input value (user typed characters)
    let rawValue = e.target.value;
    
    // If the user is trying to delete the prefix, prevent it
    if (rawValue.length < 4 || !rawValue.toUpperCase().startsWith('H360')) {
      // Keep existing value or start fresh
      const newFormatted = formatRegistrationNumber('');
      setFormData({
        ...formData,
        registrationNumber: newFormatted
      });
      return;
    }
    
    // Extract what the user typed (remove the H360- prefix if it exists)
    let userTyped = rawValue;
    
    // Remove the H360 prefix if present
    if (userTyped.toUpperCase().startsWith('H360')) {
      userTyped = userTyped.substring(4);
    }
    
    // Remove any dashes the user might have typed
    userTyped = userTyped.replace(/-/g, '');
    
    // Format with fixed H360- prefix
    const formatted = formatRegistrationNumber(userTyped);
    
    setFormData({
      ...formData,
      registrationNumber: formatted
    });
    if (successMessage) setSuccessMessage('');
  };

  const handleAccountTypeChange = (e) => {
    const newAccountType = e.target.value;
    setFormData({
      ...formData,
      accountType: newAccountType,
      password: '',
      registrationNumber: newAccountType === 'hospital' ? 'H360--' : ''  // Reset to placeholder format
    });
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log('\n🔵 ============ LOGIN ATTEMPT ============');
      console.log('Account Type:', formData.accountType);
      console.log('Email:', formData.email);

      // Validate basic fields
      if (!formData.email || !formData.email.includes('@')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // HOSPITAL LOGIN (with password and registration number)
      if (formData.accountType === 'hospital') {
        if (!formData.registrationNumber) {
          setError('Registration number is required');
          setLoading(false);
          return;
        }
        
        // Validate registration number format (must have all 8 characters filled)
        if (!validateRegistrationNumber(formData.registrationNumber)) {
          setError('Please enter a complete registration number. Format: H360-XXXX-XXXX (e.g., H360-ABCD-1234)');
          setLoading(false);
          return;
        }
        
        if (!formData.password) {
          setError('Password is required');
          setLoading(false);
          return;
        }

        console.log('🏥 Hospital login with password:', {
          email: formData.email,
          registrationNumber: formData.registrationNumber
        });

        const response = await fetch('http://localhost:5000/api/hospitals/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
            registrationNumber: formData.registrationNumber.trim()
          }),
        });

        const data = await response.json();
        console.log('Hospital login response:', data);

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Hospital login failed');
        }

        // Create a proper user object for hospital
        const hospitalUser = {
          id: data.hospital.id || data.hospital.hospital_id,
          name: data.hospital.name,
          email: data.hospital.email,
          registrationNumber: data.hospital.registrationNumber || data.hospital.registration_number,
          phone: data.hospital.phone || '',
          city: data.hospital.city || '',
          role: 'hospital'
        };

        // Store ALL necessary data
        localStorage.setItem('healthinsura360_token', data.token);
        localStorage.setItem('user', JSON.stringify(hospitalUser));
        localStorage.setItem('accountType', 'hospital');
        localStorage.setItem('isLoggedIn', 'true');
        
        // Keep these for backward compatibility
        localStorage.setItem('userEmail', data.hospital.email);
        localStorage.setItem('hospitalName', data.hospital.name);
        localStorage.setItem('userId', data.hospital.id);
        localStorage.setItem('registrationNumber', hospitalUser.registrationNumber);

        console.log('✅ Hospital login successful!');
        console.log('👤 Stored user:', hospitalUser);
        
        // Redirect to hospital dashboard
        navigate('/hospital-dashboard');

      } else {
        // CUSTOMER/AGENT/ADMIN LOGIN
        if (!formData.password) {
          setError('Password is required');
          setLoading(false);
          return;
        }

        console.log('👤 Login data:', {
          email: formData.email,
          password: '[HIDDEN]',
          userType: formData.accountType
        });

        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
            userType: formData.accountType
          }),
        });

        const data = await response.json();
        console.log('Login response:', data);

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Login failed');
        }

        const userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.fullName || data.user.name || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
          role: formData.accountType
        };

        localStorage.setItem('healthinsura360_token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('accountType', formData.accountType);
        localStorage.setItem('userId', data.user.id);
        
        if (formData.accountType === 'agent') {
          localStorage.setItem('agentName', data.user.fullName || `${data.user.firstName} ${data.user.lastName}`);
          localStorage.setItem('licenseNumber', data.user.licenseNumber || '');
        } else if (formData.accountType === 'customer') {
          localStorage.setItem('customerName', data.user.fullName || `${data.user.firstName} ${data.user.lastName}`);
        } else if (formData.accountType === 'admin') {
          localStorage.setItem('adminName', data.user.fullName);
          localStorage.setItem('adminRole', data.user.role || '');
        }

        console.log('✅ Login successful! User stored:', userData);
        console.log('=====================================\n');

        const redirectPaths = {
          customer: '/customer-dashboard',
          agent: '/agent-dashboard',
          admin: '/admin-dashboard'
        };
        
        const redirectTo = redirectPaths[formData.accountType] || '/dashboard';
        navigate(redirectTo);
      }

    } catch (err) {
      console.error('❌ Login error:', err);
      
      let errorMessage = err.message;
      if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check if backend is running.';
      } else if (err.message.includes('401')) {
        errorMessage = 'Invalid email, registration number, or password.';
      } else if (err.message.includes('404')) {
        errorMessage = 'Login service unavailable. Please contact administrator.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const accountTypeDescriptions = {
    customer: 'Access your policies, claims, and insurance details',
    hospital: 'Manage patient claims and hospital records - Use registration number (H360-XXXX-XXXX) and password',
    agent: 'View clients, commissions, and sales dashboard',
    admin: 'System administration and user management'
  };

  const isHospitalLogin = formData.accountType === 'hospital';

  // Helper to display the registration number with proper masking
  const getDisplayRegistrationNumber = () => {
    if (!formData.registrationNumber) return 'H360----';
    return formData.registrationNumber;
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f8fafc',
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
            border: '1px solid #e2e8f0',
            bgcolor: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4, width: '100%' }}>
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
                <Typography variant="h3" fontWeight={800} color="#0a2540">
                  HealthInsura360
                </Typography>
              </Box>
            </Box>

            <Typography variant="h4" component="h1" gutterBottom fontWeight={700} color="#0a2540">
              Welcome Back
            </Typography>

            <Typography variant="body1" color="#64748b">
              Sign in to your HealthInsura360 account
            </Typography>
          </Box>

          {/* Success Message Alert */}
          <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
            {successMessage && (
              <Alert severity="success" sx={{ borderRadius: 2, textAlign: 'left' }}>
                {successMessage}
              </Alert>
            )}
          </Box>

          {/* Error Alert */}
          <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
          </Box>

          {/* Form */}
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 400 }}>
              <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    variant="outlined"
                    size="medium"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#94a3b8', mr: 1 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Password Field - Now also shown for hospital */}
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    variant="outlined"
                    size="medium"
                    helperText={isHospitalLogin ? "Enter the password you set during account setup" : ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#94a3b8', mr: 1 }} />
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
                  />

                  {/* Registration Number Field with Fixed H360- Prefix and Dashes */}
                  {isHospitalLogin && (
                    <TextField
                      fullWidth
                      label="Registration Number"
                      name="registrationNumber"
                      type={showRegistrationNumber ? 'text' : 'password'}
                      value={formData.registrationNumber}
                      onChange={handleRegistrationNumberChange}
                      required
                      disabled={loading}
                      variant="outlined"
                      size="medium"
                      helperText="Format: H360-XXXX-XXXX (e.g., H360-ABCD-1234) - Enter 8 characters total"
                      placeholder="H360-XXXX-XXXX"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business sx={{ color: '#94a3b8', mr: 1 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle registration number visibility"
                              onClick={handleClickShowRegistrationNumber}
                              edge="end"
                              size="large"
                            >
                              {showRegistrationNumber ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}

                  <TextField
                    select
                    fullWidth
                    label="Account Type"
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleAccountTypeChange}
                    required
                    disabled={loading}
                    variant="outlined"
                    size="medium"
                    helperText={accountTypeDescriptions[formData.accountType]}
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
                    <MenuItem value="customer">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ color: '#0cc0df' }} />
                        <Typography>Customer / Policyholder</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="hospital">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '1.2rem' }}>🏥</span>
                        <Typography>Hospital Representative</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="agent">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '1.2rem' }}>🤝</span>
                        <Typography>Insurance Agent</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="admin">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                        <Typography>Administrator</Typography>
                      </Box>
                    </MenuItem>
                  </TextField>
                </Stack>

                {/* Forgot Password Link */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    mb: 4,
                    mt: 3
                  }}
                >
                  <Link
                    to="/forgot-password"
                    style={{
                      color: '#0cc0df',
                      fontWeight: 500,
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: '#0cc0df',
                    fontWeight: 600,
                    fontSize: '1rem',
                    '&:hover': { bgcolor: '#0aa9c4' },
                    '&.Mui-disabled': {
                      bgcolor: '#e2e8f0',
                      color: '#94a3b8'
                    }
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </Box>
          </Box>

          <Divider sx={{ my: 4, width: '100%', maxWidth: 400 }}>
            <Typography variant="body2" color="#94a3b8">
              OR
            </Typography>
          </Divider>

          {/* Registration Options */}
          <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <Typography variant="body2" color="#64748b" sx={{ mb: 3 }}>
              Don't have an account yet?
            </Typography>

            <Stack spacing={2} sx={{ width: '100%' }}>
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: '#0cc0df',
                  color: '#0cc0df',
                  fontWeight: 600,
                  borderRadius: 2,
                  py: 1.5,
                  '&:hover': {
                    borderColor: '#0aa9c4',
                    bgcolor: '#f0faff',
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
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  fontWeight: 600,
                  borderRadius: 2,
                  py: 1.5,
                  '&:hover': {
                    borderColor: '#388e3c',
                    bgcolor: '#e8f5e9',
                  },
                }}
              >
                Register as Agent
              </Button>
              <Button
                component={Link}
                to="/register-hospital"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  fontWeight: 600,
                  borderRadius: 2,
                  py: 1.5,
                  '&:hover': {
                    borderColor: '#f57c00',
                    bgcolor: '#fff3e0',
                  },
                }}
              >
                Register as Hospital
              </Button>
            </Stack>

            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="#64748b" sx={{ mb: 1, display: 'block' }}>
                Admin registration is not available publicly. Contact system administrator.
              </Typography>
            </Box>
          </Box>

          {/* Footer */}
          <Box sx={{ width: '100%', maxWidth: 400, mt: 4, pt: 4, borderTop: '1px solid #e2e8f0' }}>
            <Typography variant="caption" color="#94a3b8" align="center">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;