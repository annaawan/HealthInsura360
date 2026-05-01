// frontend/src/pages/hospital/HospitalLogin.jsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Mail, 
  Lock, 
  Building, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ArrowRight,
  Hospital
} from 'lucide-react';

import { API_BASE_URL } from '../../config';

const HospitalLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    registrationNumber: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(message || '');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user types
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    if (!formData.email || !formData.password || !formData.registrationNumber) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/hospitals/login`, {
        email: formData.email,
        password: formData.password,
        registrationNumber: formData.registrationNumber
      });

      if (response.data.success) {
        // Store token with consistent naming
        localStorage.setItem('healthinsura360_token', response.data.token);
        localStorage.setItem('token', response.data.token);
        // Store hospital user data
        localStorage.setItem('user', JSON.stringify({
          ...response.data.hospital,
          role: 'hospital'
        }));
        // Store account type for role-based access
        localStorage.setItem('accountType', 'hospital');
        
        setSuccessMessage('Login successful! Redirecting...');
        
        // Redirect to hospital dashboard
        setTimeout(() => {
          navigate('/hospital-dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response?.status === 401) {
        setError(err.response.data.message || 'Invalid credentials');
      } else if (err.response?.status === 403) {
        setError(err.response.data.message || 'Account not verified');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Hospital size={40} className="text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hospital Login</h1>
          <p className="text-gray-600">
            Enter your credentials to access the hospital portal
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="hospital@example.com"
                required
              />
            </div>
          </div>

          {/* Registration Number Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Number
            </label>
            <div className="relative">
              <Building size={20} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="H360-2026-0001"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the registration number from your approval email
            </p>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link 
              to="/forgot-password?type=hospital" 
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center ${
              loading 
                ? 'opacity-70 cursor-not-allowed' 
                : 'hover:from-blue-700 hover:to-cyan-700 transform hover:scale-105'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Logging in...
              </>
            ) : (
              <>
                Login to Portal
                <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </button>
        </form>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Having trouble logging in?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Check your email for the registration number</li>
            <li>• Password must be set using the link from your approval email</li>
            <li>• Contact support if you need assistance</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} HealthInsura360. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default HospitalLogin;