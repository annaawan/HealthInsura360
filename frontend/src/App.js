// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/RegisterCustomer';
import RegisterAgent from './pages/RegisterAgent';
import RegisterHospital from './pages/RegisterHospital';
import LandingPage from './pages/LandingPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CommissionProvider } from './context/CommissionContext';
import { AgentDashboard } from './components/AgentDashboard/AgentDashboard';  


function App() {
  return (
    <CommissionProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-agent" element={<RegisterAgent />} />
          <Route path="/register-hospital" element={<RegisterHospital />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          {/* <Route path="/agent-dashboard" element={<AgentDashboard />} /> */}
          <Route 
            path="/agent-dashboard" 
            element={
              <AgentDashboardWrapper />
               } 
          />

        </Routes>
      </Router>
    </CommissionProvider>
  );
}
function AgentDashboardWrapper() {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.clear(); // Clear all localStorage
    navigate('/login');
  };
  
  return <AgentDashboard onLogout={handleLogout} />;
}
export default App;