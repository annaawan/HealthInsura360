// src/config.js

// API Base URL - supports environment variables with fallback
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE_URL;

// Get axios configuration with authentication token
export const getAxiosConfig = () => {
  // Get token from localStorage (using secure key name)
  const token = localStorage.getItem('healthinsura360_token');
  
  // Default config
  const config = {
    headers: {
      'Content-Type': 'application/json'
    },
    withCredentials: true  // Important for CORS with authentication
  };
  
  // Add token if it exists - EXACT FORMAT REQUIRED!
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
};

// Helper to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('healthinsura360_token');
  const accountType = localStorage.getItem('accountType');
  return !!(token && accountType);
};

// Helper to check if user is admin
export const isAdmin = () => {
  return localStorage.getItem('accountType') === 'admin';
};

// Helper to get current user type
export const getUserType = () => {
  return localStorage.getItem('accountType');
};

// Helper to get current user ID
export const getUserId = () => {
  return localStorage.getItem('userId');
};

// Helper to logout user
export const logout = () => {
  localStorage.removeItem('healthinsura360_token');
  localStorage.removeItem('accountType');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  window.location.href = '/login';
};