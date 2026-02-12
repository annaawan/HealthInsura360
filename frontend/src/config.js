export const API_BASE_URL = 'http://localhost:5000/api';

export const getAxiosConfig = () => {
  // Get token from localStorage
  const token = localStorage.getItem('healthinsura360_token');
  
  // Default config
  const config = {
    headers: {
      'Content-Type': 'application/json'
    }
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