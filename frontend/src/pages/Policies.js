import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowBack, MedicalServices } from '@mui/icons-material';

const Policies = () => {
  const navigate = useNavigate();

  const insurancePlans = [
    { id: 1, name: 'Basic Health Cover', premium: 5000, coverage: '₹5,00,000' },
    { id: 2, name: 'Premium Health Plus', premium: 12000, coverage: '₹20,00,000' },
    { id: 3, name: 'Family Health Plan', premium: 18000, coverage: '₹15,00,000' },
    { id: 4, name: 'Senior Citizen Care', premium: 8000, coverage: '₹10,00,000' },
  ];

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
          Insurance Plans
        </Typography>
      </Box>

      <Typography variant="body1" color="text.secondary" paragraph>
        Choose from our comprehensive health insurance plans
      </Typography>

      {/* Plans Grid */}
      <Grid container spacing={3}>
        {insurancePlans.map((plan) => (
          <Grid item xs={12} sm={6} md={3} key={plan.id}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <MedicalServices color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    {plan.name}
                  </Typography>
                </Box>
                
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Annual Premium
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    ₹{plan.premium}
                  </Typography>
                </Box>

                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary">
                    Coverage Amount
                  </Typography>
                  <Typography variant="h6">
                    {plan.coverage}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => alert(`Purchasing ${plan.name}`)}
                >
                  Purchase Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Policies;