// frontend/src/pages/hospital/SetupPassword.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, CheckCircle, XCircle, Lock, Mail, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const SetupPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  useEffect(() => {
    verifyToken();
  }, [token, email]);

  const verifyToken = async () => {
    if (!token || !email) {
      setError('Invalid password setup link');
      setVerifying(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/hospitals/verify-setup-token`, {
        params: { token, email }
      });
      
      if (response.data.valid) {
        setValidToken(true);
        setError('');
      } else {
        setError(response.data.message || 'Invalid or expired token');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify token');
    } finally {
      setVerifying(false);
    }
  };

  const checkPasswordStrength = (pass) => {
    setPasswordStrength({
      hasMinLength: pass.length >= 8,
      hasUpperCase: /[A-Z]/.test(pass),
      hasLowerCase: /[a-z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    });
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const getPasswordStrengthScore = () => {
    const criteria = Object.values(passwordStrength);
    const metCount = criteria.filter(Boolean).length;
    
    if (metCount <= 2) return { label: 'Weak', color: '#dc3545', width: '25%' };
    if (metCount <= 4) return { label: 'Medium', color: '#ffc107', width: '50%' };
    return { label: 'Strong', color: '#28a745', width: '100%' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const strength = getPasswordStrengthScore();
    if (strength.label === 'Weak') {
      setError('Please choose a stronger password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/hospitals/setup-password`, {
        token,
        email,
        password
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          // CHANGED: Redirect to unified login page (not hospital-specific login)
          navigate('/login', { 
            state: { 
              message: 'Password set successfully! Please login with your email, registration number, and new password.',
              accountType: 'hospital'
            }
          });
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your link...</p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <XCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-600 mb-6">{error || 'This password setup link has expired or is invalid.'}</p>
          <p className="text-sm text-gray-500 mb-4">
            Password setup links are valid for 24 hours only.
            Please contact hospital support for assistance.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Set Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your password has been created. You will be redirected to the login page in a few seconds.
          </p>
          <div className="animate-pulse text-blue-600">Redirecting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Set Your Password</h1>
          <p className="text-gray-600">
            Create a strong password for your hospital account
          </p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <Mail size={16} className="inline mr-1" />
              {email}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
            <AlertCircle size={20} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                required
                minLength={8}
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

          {/* Password Strength Meter */}
          {password && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Password Strength:
                </span>
                <span 
                  className="text-sm font-bold"
                  style={{ color: getPasswordStrengthScore().color }}
                >
                  {getPasswordStrengthScore().label}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: getPasswordStrengthScore().width,
                    backgroundColor: getPasswordStrengthScore().color
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div className="flex items-center">
                  {passwordStrength.hasMinLength ? 
                    <CheckCircle size={16} className="text-green-500 mr-1" /> : 
                    <XCircle size={16} className="text-red-500 mr-1" />
                  }
                  <span className="text-gray-600">Min 8 characters</span>
                </div>
                <div className="flex items-center">
                  {passwordStrength.hasUpperCase ? 
                    <CheckCircle size={16} className="text-green-500 mr-1" /> : 
                    <XCircle size={16} className="text-red-500 mr-1" />
                  }
                  <span className="text-gray-600">Uppercase letter</span>
                </div>
                <div className="flex items-center">
                  {passwordStrength.hasLowerCase ? 
                    <CheckCircle size={16} className="text-green-500 mr-1" /> : 
                    <XCircle size={16} className="text-red-500 mr-1" />
                  }
                  <span className="text-gray-600">Lowercase letter</span>
                </div>
                <div className="flex items-center">
                  {passwordStrength.hasNumber ? 
                    <CheckCircle size={16} className="text-green-500 mr-1" /> : 
                    <XCircle size={16} className="text-red-500 mr-1" />
                  }
                  <span className="text-gray-600">Number</span>
                </div>
                <div className="flex items-center col-span-2">
                  {passwordStrength.hasSpecialChar ? 
                    <CheckCircle size={16} className="text-green-500 mr-1" /> : 
                    <XCircle size={16} className="text-red-500 mr-1" />
                  }
                  <span className="text-gray-600">Special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-3 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Password Match Indicator */}
          {confirmPassword && (
            <div className="flex items-center">
              {password === confirmPassword ? (
                <>
                  <CheckCircle size={16} className="text-green-500 mr-2" />
                  <span className="text-sm text-green-600">Passwords match</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-red-500 mr-2" />
                  <span className="text-sm text-red-600">Passwords do not match</span>
                </>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || password !== confirmPassword}
            className={`w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-medium transition-all duration-300 ${
              loading || password !== confirmPassword
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:from-blue-700 hover:to-cyan-700 transform hover:scale-105'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Setting Password...
              </div>
            ) : (
              'Set Password'
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          By setting your password, you agree to our Terms of Service and Privacy Policy.
          This link will expire in 24 hours.
        </p>
      </div>
    </div>
  );
};

export default SetupPassword;