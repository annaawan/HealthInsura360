import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Removed useNavigate
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
  MenuItem,
  Card
} from '@mui/material';
import { 
  Email, 
  ArrowBack, 
  CheckCircle,
  Person,
  MedicalServices,
  Business,
  Security
} from '@mui/icons-material';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1); // 1: Request reset, 2: Success

  const [formData, setFormData] = useState({
    email: '',
    userType: 'customer'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  try {
    console.log('🔄 Sending password reset request:', formData);

const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);

    // Get response text first
    const responseText = await response.text();
    console.log('📡 Raw response text:', responseText);

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
      console.log('📡 Parsed response data:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      throw new Error('Server returned invalid response');
    }

    if (!response.ok) {
      console.error('❌ Server error response:', data);
      throw new Error(data.message || data.error || `Server error: ${response.status}`);
    }

    console.log('✅ Password reset request successful:', data);
    
    setSuccess(data.message);
    setStep(2);

    // Show dev info if available
    if (data.devToken) {
      console.log('🔗 Development reset token:', data.devToken);
      console.log('📝 Dev message:', data.devMessage);
    }

  } catch (err) {
    console.error('❌ Password reset error:', err);
    
    // More specific error messages
    let errorMessage = err.message;
    if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
errorMessage = `Cannot connect to server. Please check if backend is running on ${process.env.REACT_APP_API_BASE_URL}`;
    } else if (err.message.includes('404')) {
      errorMessage = 'Password reset endpoint not found. Check backend routes.';
    } else if (err.message.includes('500')) {
      errorMessage = 'Server error. Check backend logs.';
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
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
                  width: 160, 
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
            
            <Typography variant="h4" component="h1" gutterBottom fontWeight={700} color="#0a2540">
              {step === 1 ? 'Reset Your Password' : 'Check Your Email'}
            </Typography>
            
            <Typography variant="body1" color="#64748b">
              {step === 1 
                ? 'Enter your email to receive password reset instructions' 
                : 'We have sent password reset instructions to your email'}
            </Typography>
          </Box>

          {/* Error/Success Alerts */}
          <Box sx={{ width: '100%', mb: 3 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                {success}
              </Alert>
            )}
          </Box>

          {/* Step 1: Request Form */}
          {step === 1 && (
            <Box sx={{ width: '100%' }}>
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
                    placeholder="Enter your registered email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#94a3b8', mr: 1 }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    select
                    fullWidth
                    label="Account Type"
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    variant="outlined"
                    size="medium"
                    helperText="Select your account type"
                  >
                    <MenuItem value="customer">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ color: '#0cc0df' }} />
                        <Typography>Customer</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="agent">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Security sx={{ color: '#4caf50' }} />
                        <Typography>Agent</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="admin">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                        <Typography>Administrator</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="hospital">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business sx={{ color: '#ff9800' }} />
                        <Typography>Hospital</Typography>
                      </Box>
                    </MenuItem>
                  </TextField>
                </Stack>

                {/* Instructions Card */}
                <Card sx={{ 
                  mt: 3, 
                  p: 2.5, 
                  bgcolor: '#f0faff', 
                  border: '1px solid #0cc0df20',
                  borderRadius: 2 
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0a2540', mb: 1 }}>
                    What happens next?
                  </Typography>
                  <Typography variant="body2" color="#64748b">
                    1. Enter your email and account type<br/>
                    2. We'll send a reset link to your email<br/>
                    3. Click the link to set a new password<br/>
                    4. The link expires in 1 hour
                  </Typography>
                </Card>

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
                  {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </Button>
              </form>
            </Box>
          )}

          {/* Step 2: Success Message */}
          {step === 2 && (
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 3 }} />
              
              <Typography variant="h5" gutterBottom fontWeight={600} color="#0a2540">
                Check Your Email
              </Typography>
              
              <Typography variant="body1" color="#64748b" paragraph>
                We've sent password reset instructions to:
              </Typography>
              
              <Box sx={{ 
                bgcolor: '#f8fafc', 
                p: 2, 
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                mb: 3
              }}>
                <Typography variant="h6" color="#0a2540">
                  {formData.email}
                </Typography>
              </Box>
              
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'left', 
                bgcolor: '#fff8e1', 
                border: '1px solid #ffecb3',
                mb: 4
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#ff9800', mb: 1 }}>
                  📧 Important:
                </Typography>
                <Typography variant="body2" color="#666">
                  • Check your spam or junk folder if you don't see the email<br/>
                  • The reset link will expire in 1 hour<br/>
                  • Contact support if you need assistance<br/>
                  • Email will be sent from: quratulainazhar470@gmail.com
                </Typography>
              </Card>

              <Stack spacing={2} sx={{ width: '100%' }}>
                <Button
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setSuccess('');
                  }}
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#e2e8f0',
                    color: '#425466',
                    borderRadius: 2,
                    py: 1.5
                  }}
                >
                  Try Another Email
                </Button>
                
                <Button
                  component={Link}
                  to="/login"
                  variant="contained"
                  fullWidth
                  sx={{
                    bgcolor: '#0cc0df',
                    borderRadius: 2,
                    py: 1.5,
                    '&:hover': { bgcolor: '#0aa9c4' }
                  }}
                >
                  Back to Login
                </Button>
              </Stack>
            </Box>
          )}

          {/* Back to Login Link */}
          {step === 1 && (
            <Box sx={{ width: '100%', mt: 4, pt: 3, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <Typography variant="body2" color="#64748b" sx={{ mb: 1 }}>
                Remember your password?
              </Typography>
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

          {/* Support Info */}
          <Box sx={{ width: '100%', mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="#94a3b8">
              Need help? Contact support at quratulainazhar470@gmail.com
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;