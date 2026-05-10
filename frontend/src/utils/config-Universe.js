// frontend/src/utils/config.js

// API Base URL - adjust based on your environment
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Get axios configuration with authentication headers
// In your config.js
export const getAxiosConfig = () => {
  // ✅ FIXED: Use the correct key name
  const token = localStorage.getItem('healthinsura360_token');
  
  return {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  };
};
// Alternative: If you already have config elsewhere, export from there
// Example if you have a config file at src/config.js:
// export { API_BASE_URL, getAxiosConfig } from '../config';