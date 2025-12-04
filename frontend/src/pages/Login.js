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
} from '@mui/material';
import { Email, Lock } from '@mui/icons-material';

// Import your logo (place it in src/assets/)
import Logo from '../assets/HealthInsura360.png';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Removed Header */}

      <Container maxWidth="sm">
        <Box sx={{ py: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: 'white',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <img
                src={Logo}
                alt="HealthInsura360 Logo"
                style={{ width: 70, height: 70, marginBottom: 16 }}
              />

              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                fontWeight={700}
                color="#0a2540"
              >
                Welcome Back
              </Typography>

              <Typography variant="body1" color="#64748b">
                Sign in to your HealthInsura360 account
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ mb: 3 }}>
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
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: '#94a3b8' }} />,
                  }}
                  sx={{ mb: 3 }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: '#94a3b8' }} />,
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mb: 4,
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
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <Divider sx={{ my: 4 }}>
              <Typography variant="body2" color="#94a3b8">
                OR
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="#64748b" sx={{ mb: 2 }}>
                Don't have an account yet?
              </Typography>

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
                  '&:hover': {
                    borderColor: '#0aa9c4',
                    bgcolor: '#f0faff',
                  },
                }}
              >
                Create Account
              </Button>
            </Box>

            <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid #e2e8f0' }}>
              <Typography variant="caption" color="#94a3b8" align="center">
                By signing in, you agree to our Terms of Service and Privacy
                Policy.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
