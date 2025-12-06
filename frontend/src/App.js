import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/RegisterCustomer';
import RegisterAgent from './pages/RegisterAgent';
import RegisterHospital from './pages/RegisterHospital';
import LandingPage from './pages/LandingPage';

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
        
        {/* Protected/Private Routes */}
        
        {/* Add other routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;