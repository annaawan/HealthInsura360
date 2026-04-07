import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/RegisterCustomer';
import RegisterAgent from './pages/RegisterAgent';
import RegisterHospital from './pages/RegisterHospital';
import LandingPage from './pages/LandingPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './components/AdminDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import SubmitClaim from './components/Claims/SubmitClaim';
import MyClaims from './components/Claims/MyClaims';
import SetupPassword from './pages/hospital/SetupPassword';
import HospitalLogin from './pages/hospital/HospitalLogin';
import HospitalDashboard from './pages/hospital/HospitalDashboard';


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
        <Route path="/submit-claim" element={<SubmitClaim />} />
        <Route path="/my-claims" element={<MyClaims />} />
        <Route path="/hospital/setup-password" element={<SetupPassword />} />
        <Route path="/hospital/login" element={<HospitalLogin />} />
        <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
        <Route path="/hospital/setup-password" element={<SetupPassword />} />

        {/* Protected/Private Routes */}
        
        {/* Add other routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;