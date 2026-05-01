// frontend/src/utils/config.js

// API Base URL - adjust based on your environment
export const API_BASE_URL = process.env.API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Get axios configuration with authentication headers
export const getAxiosConfig = () => {
  const token = localStorage.getItem('healthinsura360_token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true // Include cookies if needed
  };
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
};

// Alternative: If you already have config elsewhere, export from there
// Example if you have a config file at src/config.js:
// export { API_BASE_URL, getAxiosConfig } from '../config';