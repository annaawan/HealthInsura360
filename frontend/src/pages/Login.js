import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Stack, // ADDED
} from '@mui/material';
import { Email, Lock, Person, Visibility, VisibilityOff } from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    accountType: 'customer', // Default to customer
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.email || !formData.password || !formData.accountType) {
      setError('Please fill all required fields');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Simulate API call - In real app, verify credentials with backend
    setTimeout(() => {
      setLoading(false);
      
      // Store login info (in real app, this would be JWT token)
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('accountType', formData.accountType);
      
      // Redirect based on account type
      switch(formData.accountType) {
        case 'customer':
          navigate('/customer-dashboard');
          break;
        case 'hospital':
          navigate('/hospital-dashboard');
          break;
        case 'agent':
          navigate('/agent-dashboard');
          break;
        case 'admin':
          navigate('/admin-dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    }, 1500);
  };

  // Account type descriptions
  const accountTypeDescriptions = {
    customer: 'Access your policies, claims, and insurance details',
    hospital: 'Manage patient claims and hospital records',
    agent: 'View clients, commissions, and sales dashboard',
    admin: 'System administration and user management'
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
            display: 'flex', // ADDED
            flexDirection: 'column', // ADDED
            alignItems: 'center', // ADDED
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4, width: '100%' }}>
            {/* Logo */}
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
              
              {/* Fallback logo */}
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

          {/* Error Alert - Centered */}
          <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
          </Box>

          {/* Form - Centered with Stack */}
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

                  <TextField
                    select
                    fullWidth
                    label="Account Type"
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleChange}
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

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end', // Changed to align right
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

          {/* Registration Options - Centered */}
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

          {/* Footer - Centered */}
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