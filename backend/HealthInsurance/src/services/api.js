import axios from 'axios';

// Backend API URL
const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// User APIs
export const registerUser = async (userData) => {
  return await api.post('/users/register', userData);
};

export const loginUser = async (credentials) => {
  return await api.post('/users/login', credentials);
};

export const getUserProfile = async () => {
  return await api.get('/users/profile');
};

// Policy APIs
export const getInsurancePlans = async () => {
  return await api.get('/policies/plans');
};

export const purchasePolicy = async (planId) => {
  return await api.post('/policies/purchase', { planId });
};

export const getUserPolicies = async () => {
  return await api.get('/policies/my-policies');
};

// Claim APIs
export const submitClaim = async (claimData) => {
  return await api.post('/claims/submit', claimData);
};

export const getUserClaims = async () => {
  return await api.get('/claims/my-claims');
};

// Health check
export const checkHealth = async () => {
  return await api.get('/health');
};

export default api;