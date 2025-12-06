const API_BASE_URL = 'http://localhost:5000/api';

export const authAPI = {
  registerCustomer: async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/register/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  registerAgent: async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/register/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  registerHospital: async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/register/hospital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  login: async (email, password, userType) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, userType })
    });
    return response.json();
  }
};