import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import {
  MedicalServices,
  Facebook,
  Google,
} from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Grid container spacing={4}>
          {/* Left side - Brand/Info */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <MedicalServices sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h3" fontWeight="bold" color="primary">
                  HealthInsura360
                </Typography>
              </Box>
              
              <Typography variant="h4" gutterBottom fontWeight="medium">
                Welcome Back!
              </Typography>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                Sign in to access your personalized health insurance dashboard, track claims, and manage policies.
              </Typography>

              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  New to HealthInsura360?
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  component={Link}
                  to="/register"
                  sx={{ mt: 1 }}
                >
                  Create Free Account
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Right side - Login Form */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 5, borderRadius: 3 }}>
              <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold">
                Sign In
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
                Enter your credentials to continue
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Social Login Buttons */}
              <Box sx={{ mb: 4 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Google />}
                  sx={{ mb: 2, py: 1.5 }}
                >
                  Continue with Google
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Facebook />}
                  sx={{ py: 1.5 }}
                >
                  Continue with Facebook
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Typography color="text.secondary">OR</Typography>
              </Divider>

              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={loading}
                  variant="outlined"
                  size="medium"
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={loading}
                  variant="outlined"
                  size="medium"
                  sx={{ mb: 1 }}
                />

                <Box sx={{ textAlign: 'right', mb: 3 }}>
                  <Button
                    component={Link}
                    to="/forgot-password"
                    variant="text"
                    size="small"
                  >
                    Forgot Password?
                  </Button>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  sx={{ py: 1.5, mb: 3 }}
                  size="large"
                >
                  {loading ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>

                <Typography variant="body2" align="center" color="text.secondary">
                  By signing in, you agree to our{' '}
                  <Link to="/terms" style={{ color: '#2196f3' }}>Terms of Service</Link>{' '}
                  and{' '}
                  <Link to="/privacy" style={{ color: '#2196f3' }}>Privacy Policy</Link>
                </Typography>

                <Typography variant="body2" align="center" sx={{ mt: 3 }}>
                  Don't have an account?{' '}
                  <Link to="/register" style={{ color: '#2196f3', fontWeight: 'bold' }}>
                    Sign up now
                  </Link>
                </Typography>
              </form>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Login;