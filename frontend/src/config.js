// src/config.js
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const getAxiosConfig = () => {
  const token = localStorage.getItem('token');
  
  return {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    withCredentials: true
  };
};