import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/RegisterCustomer';
import RegisterAgent from './pages/RegisterAgent';
import RegisterHospital from './pages/RegisterHospital';
import LandingPage from './pages/LandingPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import { CustomerDashboard } from './components/CustomerDashboard';

function App() {
  return (
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

        {/* Protected/Private Routes */}
        
        {/* Add other routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;