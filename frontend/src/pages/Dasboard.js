import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
} from '@mui/material';
import {
  MedicalServices,
  AccountCircle,
  Notifications,
  Logout,
  AddCircle,
  Receipt,
  Policy,
  Assessment,
} from '@mui/icons-material';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const stats = [
    { label: 'Active Policies', value: '3', icon: <Policy />, color: 'primary' },
    { label: 'Total Claims', value: '5', icon: <Receipt />, color: 'secondary' },
    { label: 'Claim Success Rate', value: '92%', icon: <Assessment />, color: 'success' },
    { label: 'Renewals Due', value: '1', icon: <AddCircle />, color: 'warning' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Bar */}
      <AppBar position="static">
        <Container maxWidth="lg">
          <Toolbar>
            <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
              <MedicalServices />
              <Typography variant="h6">HealthInsura360</Typography>
            </Box>

            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            <Button color="inherit" startIcon={<Logout />} onClick={handleLogout}>
              Logout
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
              <AccountCircle sx={{ fontSize: 50 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Welcome back, John! 👋
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Here's what's happening with your health insurance today.
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: `${stat.color}.light` }}>
                      {stat.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2} sx={{ mb: 6 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddCircle />}
              sx={{ py: 2 }}
            >
              Buy New Policy
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Receipt />}
              sx={{ py: 2 }}
            >
              Submit Claim
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Policy />}
              sx={{ py: 2 }}
            >
              View Policies
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Assessment />}
              sx={{ py: 2 }}
            >
              Generate Report
            </Button>
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Policies
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
                  <Typography fontWeight="medium">Family Health Plan</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valid until: Dec 31, 2024
                  </Typography>
                </Box>
                <Button fullWidth variant="text">
                  View All Policies
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Claims
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
                  <Typography fontWeight="medium">Claim #CLM-12345</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: Approved • Amount: ₹25,000
                  </Typography>
                </Box>
                <Button fullWidth variant="text">
                  View All Claims
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;