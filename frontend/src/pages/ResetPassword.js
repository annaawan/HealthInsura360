import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Stack,
  IconButton,
  Card
} from '@mui/material';
import { 
  Lock, 
  Visibility, 
  VisibilityOff, 
  ArrowBack, 
  CheckCircle,
  ErrorOutline,
  Email,
  MedicalServices
} from '@mui/icons-material';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Get token from URL
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  const type = queryParams.get('type');

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid or missing reset token');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/auth/verify-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setTokenValid(true);
          setEmail(data.email);
          // userType is received but not used in component, so we don't store it
        } else {
          setError(data.message || 'Invalid reset token');
        }
      } catch (err) {
        console.error('Token verification error:', err);
        setError('Failed to verify reset token. Please request a new link.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, type]);

  // Check password strength
  useEffect(() => {
    const password = formData.newPassword;
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    });
  }, [formData.newPassword]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Both password fields are required');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Check if all password requirements are met
    const allRequirementsMet = Object.values(passwordStrength).every(Boolean);
    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f8fafc'
      }}>
        <CircularProgress size={60} sx={{ mb: 3, color: '#0cc0df' }} />
        <Typography variant="h6" color="#0a2540">
          Verifying reset link...
        </Typography>
        <Typography variant="body2" color="#64748b" sx={{ mt: 1 }}>
          Please wait while we verify your password reset link
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4 
    }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            bgcolor: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo */}
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
                  width: 140, 
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
                  fontSize: 56, 
                  color: "#0cc0df",
                  mb: 1
                }} />
                <Typography variant="h3" fontWeight={800} color="#0a2540">
                  HealthInsura360
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="h4" component="h1" gutterBottom fontWeight={700} color="#0a2540">
              {success ? 'Password Reset Successful!' : 'Set New Password'}
            </Typography>
            
            {email && !success && tokenValid && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Email sx={{ color: '#94a3b8', fontSize: 20 }} />
                <Typography variant="body1" color="#64748b">
                  Resetting password for: <strong>{email}</strong>
                </Typography>
              </Box>
            )}
          </Box>

          {/* Error/Success Alerts */}
          <Box sx={{ width: '100%', mb: 3 }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ borderRadius: 2 }}
                icon={<ErrorOutline />}
              >
                {error}
              </Alert>
            )}
            {success && (
              <Alert 
                severity="success" 
                sx={{ borderRadius: 2 }}
                icon={<CheckCircle />}
              >
                {success}
              </Alert>
            )}
          </Box>

          {/* Invalid Token Message */}
          {!tokenValid && !success && (
            <Box sx={{ textAlign: 'center', width: '100%', py: 3 }}>
              <ErrorOutline sx={{ fontSize: 64, color: '#f44336', mb: 2 }} />
              
              <Typography variant="h6" color="#0a2540" gutterBottom>
                Invalid Reset Link
              </Typography>
              
              <Typography variant="body1" color="#64748b" paragraph>
                This password reset link is invalid or has expired.
              </Typography>
              
              <Typography variant="body2" color="#94a3b8" sx={{ mb: 4 }}>
                Reset links are only valid for 1 hour for security reasons.
              </Typography>
              
              <Button
                component={Link}
                to="/forgot-password"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#0cc0df',
                  '&:hover': { bgcolor: '#0aa9c4' },
                  borderRadius: 2,
                  px: 4,
                  py: 1.5
                }}
              >
                Request New Reset Link
              </Button>
            </Box>
          )}

          {/* Success Message */}
          {success && (
            <Box sx={{ textAlign: 'center', width: '100%', py: 3 }}>
              <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
              
              <Typography variant="h5" color="#0a2540" gutterBottom>
                Password Reset Successful!
              </Typography>
              
              <Typography variant="body1" color="#64748b" paragraph>
                Your password has been successfully updated.
              </Typography>
              
              <Typography variant="body2" color="#94a3b8" sx={{ mb: 4 }}>
                Redirecting to login page in 3 seconds...
              </Typography>
              
              <Button
                onClick={() => navigate('/login')}
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#388e3c' },
                  borderRadius: 2,
                  px: 4,
                  py: 1.5
                }}
              >
                Go to Login Now
              </Button>
            </Box>
          )}

          {/* Reset Form */}
          {tokenValid && !success && (
            <Box sx={{ width: '100%' }}>
              <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  {/* New Password */}
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    variant="outlined"
                    size="medium"
                    placeholder="Enter new password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#94a3b8', mr: 1 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="large"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Confirm Password */}
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    variant="outlined"
                    size="medium"
                    placeholder="Re-enter new password"
                    error={formData.confirmPassword && formData.newPassword !== formData.confirmPassword}
                    helperText={formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? "Passwords don't match" : ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#94a3b8', mr: 1 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            size="large"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>

                {/* Password Requirements */}
                {formData.newPassword && (
                  <Card sx={{ 
                    mt: 3, 
                    p: 2.5, 
                    bgcolor: '#f8fafc', 
                    border: '1px solid #e2e8f0',
                    borderRadius: 2 
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0a2540', mb: 2 }}>
                      Password Requirements:
                    </Typography>
                    
                    <Stack spacing={1}>
                      {[
                        { label: 'At least 8 characters', check: passwordStrength.length },
                        { label: 'One uppercase letter (A-Z)', check: passwordStrength.uppercase },
                        { label: 'One lowercase letter (a-z)', check: passwordStrength.lowercase },
                        { label: 'One number (0-9)', check: passwordStrength.number },
                        { label: 'One special character (!@#$%^&*)', check: passwordStrength.special },
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
                            mr: 1.5,
                            fontSize: '0.75rem',
                            color: 'white',
                            fontWeight: 'bold'
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
                    </Stack>
                  </Card>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{
                    mt: 4,
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
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </Button>
              </form>
            </Box>
          )}

          {/* Back to Login Link */}
          {!success && tokenValid && (
            <Box sx={{ width: '100%', mt: 4, pt: 3, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <Button
                component={Link}
                to="/login"
                startIcon={<ArrowBack />}
                sx={{
                  color: '#0cc0df',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.95rem'
                }}
              >
                Back to Sign In
              </Button>
            </Box>
          )}

          {/* Security Note */}
          <Box sx={{ width: '100%', mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="#94a3b8">
              🔒 For security, create a strong password you haven't used before
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;