import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Box, Typography } from '@mui/material';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      {/* Logo - Replace with your actual logo */}
      <Box 
        component="img"
        src="public/HealthInsura360.png" // or your logo path
        alt="HealthInsura360 Logo"
        sx={{ width: 150, height: 150, mb: 3 }}
      />
      
      {/* Project Name */}
      <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        HealthInsura360
      </Typography>
      
      {/* Tagline */}
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Your Complete Health Insurance Solution
      </Typography>
      
      {/* Welcome Button */}
      <Button 
        variant="contained" 
        size="large"
        onClick={() => navigate('/register')}
        sx={{ mt: 4, px: 6, py: 1.5, fontSize: '1.2rem' }}
      >
        Welcome
      </Button>
    </Container>
  );
}

export default LandingPage;