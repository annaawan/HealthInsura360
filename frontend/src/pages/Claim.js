import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, Upload } from '@mui/icons-material';

const Claims = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    policyId: '',
    claimAmount: '',
    description: '',
    treatmentDetails: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSuccess('✅ Claim submitted successfully! We will review it shortly.');
      setLoading(false);
      setFormData({
        policyId: '',
        claimAmount: '',
        description: '',
        treatmentDetails: '',
      });
    }, 1500);
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1">
          Submit Claim
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Form */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Claim Details
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Fill in the details below to submit your health insurance claim
            </Typography>

            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Policy ID"
                    name="policyId"
                    value={formData.policyId}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Claim Amount (₹)"
                    name="claimAmount"
                    type="number"
                    value={formData.claimAmount}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Treatment Details"
                    name="treatmentDetails"
                    multiline
                    rows={4}
                    value={formData.treatmentDetails}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter treatment details, hospital name, dates, etc."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    startIcon={<Upload />}
                    variant="outlined"
                    component="label"
                    disabled={loading}
                    sx={{ mr: 2 }}
                  >
                    Upload Documents
                    <input type="file" hidden multiple />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Upload medical bills, prescriptions, reports (Max 10MB)
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ mt: 2, py: 1.5, px: 4 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit Claim'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: '#f0f7ff' }}>
            <Typography variant="h6" gutterBottom color="primary">
              📋 Claim Submission Guide
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                1. Policy Information
              </Typography>
              <Typography variant="body2">
                Enter your policy ID exactly as shown on your policy document
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                2. Claim Amount
              </Typography>
              <Typography variant="body2">
                Enter the total amount claimed in Indian Rupees
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                3. Supporting Documents
              </Typography>
              <Typography variant="body2">
                Upload medical bills, discharge summary, prescriptions
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                4. Processing Time
              </Typography>
              <Typography variant="body2">
                Claims are typically processed within 7-14 working days
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Claims;