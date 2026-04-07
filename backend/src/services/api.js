
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    ...( !(arguments[0]?.isFormData) ? { 'Content-Type': 'application/json' } : {} )
  };
};

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
  },

  forgotPassword: async (email, userType) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userType })
    });
    return response.json();
  },

  resetPassword: async (token, newPassword, confirmPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword, confirmPassword })
    });
    return response.json();
  },

  verifyResetToken: async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return response.json();
  }
};

// ============= HOSPITAL API =============
export const hospitalAPI = {
  // Get all hospitals
  getAllHospitals: async () => {
    const response = await fetch(`${API_BASE_URL}/hospitals`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Get single hospital by ID
  getHospitalById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/hospitals/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Update hospital status (active/inactive/pending)
  updateHospitalStatus: async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/hospitals/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return response.json();
  },

  // Update hospital verification status
  verifyHospital: async (id, verified_status) => {
    const response = await fetch(`${API_BASE_URL}/hospitals/${id}/verify`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ verified_status })
    });
    return response.json();
  },

  // ============= HOSPITAL DOCUMENTS API =============
  
  // Upload documents for a hospital
  uploadDocuments: async (hospitalId, files, documentType = 'hospital_document') => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('documents', file);
    });
    formData.append('document_type', documentType);

    const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
        // Don't set Content-Type header - browser will set it with boundary
      },
      body: formData
    });
    return response.json();
  },

  // Get all documents for a hospital
  getDocuments: async (hospitalId) => {
    const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/documents`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Delete a document
  deleteDocument: async (documentId) => {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Get document statistics for a hospital
  getDocumentStats: async (hospitalId) => {
    const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/documents/stats`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Download document
  downloadDocument: async (documentId) => {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'document';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true };
  }
};

// ============= ADMIN API =============
export const adminAPI = {
  // Get all users (admin only)
  getDashboardStats: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  }
};

// ============= CUSTOMER API =============
export const customerAPI = {
  getProfile: async (customerId) => {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  updateProfile: async (customerId, data) => {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// ============= AGENT API =============
export const agentAPI = {
  getProfile: async (agentId) => {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  updateProfile: async (agentId, data) => {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// ============= REPORTS API =============
export const reportsAPI = {
  getUserGrowthReport: async (range = 'last-30-days') => {
    const response = await fetch(`${API_BASE_URL}/reports/user?range=${range}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getHospitalNetworkReport: async (range = 'last-30-days') => {
    const response = await fetch(`${API_BASE_URL}/reports/hospital?range=${range}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  exportReport: async (reportType, format = 'pdf', range = 'last-30-days') => {
    const response = await fetch(
      `${API_BASE_URL}/reports/export/${reportType}?format=${format}&range=${range}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    if (format === 'pdf' || format === 'csv') {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    }
    
    return response.json();
  }
};

// ============= DASHBOARD API =============
export const dashboardAPI = {
  getAnalytics: async (timeRange = 'monthly', startDate = null, endDate = null) => {
    let url = `${API_BASE_URL}/analytics?timeRange=${timeRange}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  }
};

// Default export with all APIs
export default {
  auth: authAPI,
  hospital: hospitalAPI,
  admin: adminAPI,
  customer: customerAPI,
  agent: agentAPI,
  reports: reportsAPI,
  dashboard: dashboardAPI
};