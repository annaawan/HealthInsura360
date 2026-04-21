// frontend/src/services/api.js

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};
 

export const hospitalAPI = {
  // Upload documents for a hospital
  uploadDocuments: async (hospitalId, files, documentType = 'hospital_registration') => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('documents', file);
    });
    formData.append('document_type', documentType);

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
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
  }
};

export const authAPI = {
  registerHospital: async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/register/hospital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// ============= COMMISSION API =============

export const commissionAPI = {
  // Get all commissions (Admin only)
  getAllCommissions: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams 
      ? `${API_BASE_URL}/commissions?${queryParams}`
      : `${API_BASE_URL}/commissions`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch commissions');
    }
    
    return response.json();
  },

  // Get commissions for a specific agent
  getAgentCommissions: async (agentId, filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams 
      ? `${API_BASE_URL}/commissions/agent/${agentId}?${queryParams}`
      : `${API_BASE_URL}/commissions/agent/${agentId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch agent commissions');
    }
    
    return response.json();
  },

  // Get commission summary for an agent
  getAgentCommissionSummary: async (agentId) => {
    const response = await fetch(`${API_BASE_URL}/commissions/agent/${agentId}/summary`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch commission summary');
    }
    
    return response.json();
  },

  // Get admin dashboard summary
  getAdminSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/commissions/admin/summary`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch admin summary');
    }
    
    return response.json();
  },

  // Create a new commission (when policy is sold)
  createCommission: async (commissionData) => {
    const response = await fetch(`${API_BASE_URL}/commissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(commissionData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create commission');
    }
    
    return response.json();
  },

  // Create multiple commissions at once (bulk)
  createBulkCommissions: async (commissionsData) => {
    const response = await fetch(`${API_BASE_URL}/commissions/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ commissions: commissionsData })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create bulk commissions');
    }
    
    return response.json();
  },

  // Update commission rate
  updateCommissionRate: async (commissionId, newRate) => {
    const response = await fetch(`${API_BASE_URL}/commissions/${commissionId}/rate`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rate: newRate })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update commission rate');
    }
    
    return response.json();
  },

  // Pay commission
  payCommission: async (commissionId, paymentReference) => {
    const response = await fetch(`${API_BASE_URL}/commissions/${commissionId}/pay`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        status: 'paid',
        payment_reference: paymentReference,
        paid_at: new Date().toISOString().split('T')[0]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process payment');
    }
    
    return response.json();
  },

  // Cancel commission
  cancelCommission: async (commissionId) => {
    const response = await fetch(`${API_BASE_URL}/commissions/${commissionId}/cancel`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'cancelled' })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel commission');
    }
    
    return response.json();
  },

  // Delete commission (Admin only)
  deleteCommission: async (commissionId) => {
    const response = await fetch(`${API_BASE_URL}/commissions/${commissionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete commission');
    }
    
    return response.json();
  },

  // Export commissions report
  exportCommissionsReport: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams 
      ? `${API_BASE_URL}/commissions/export?${queryParams}`
      : `${API_BASE_URL}/commissions/export`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to export report');
    }
    
    // Return blob for file download
    return response.blob();
  }
};// Add at the very end of api.js

// Export the base URL for use in other files
export { API_BASE_URL };

// Export the auth headers function as getAxiosConfig for compatibility
export const getAxiosConfig = getAuthHeaders;