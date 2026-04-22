// src/context/CommissionContext.js

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { commissionAPI } from '../services/api';
import { API_BASE_URL, getAxiosConfig } from '../config';

const CommissionContext = createContext();

// Helper function to get user type from localStorage
const getUserType = () => {
  try {
    // Try to get from userType directly
    let userType = localStorage.getItem('userType');
    if (userType) return userType;
    
    // Try to get from user object
    const userStr = localStorage.getItem('healthinsura360_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.userType || user.role || 'customer';
    }
    
    // Try to get from token (decode JWT)
    const token = localStorage.getItem('healthinsura360_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userType || payload.role || 'customer';
      } catch (e) {
        console.log('Could not decode token');
      }
    }
  } catch (error) {
    console.error('Error getting user type:', error);
  }
  
  return 'customer'; // Default to customer
};

// Define the reducer outside the component
const commissionReducer = (state, action) => {
  switch (action.type) {
    case 'SET_COMMISSIONS':
  // Convert amount to number for each commission
  const commissionsWithNumbers = action.payload.map(c => ({
    ...c,
    amount: parseFloat(c.amount) || 0,
    premium_amount: parseFloat(c.premium_amount) || 0
  }));
  
  const pending = commissionsWithNumbers
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);
  const paid = commissionsWithNumbers
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);
  
  return {
    ...state,
    commissions: commissionsWithNumbers,
    totalPending: pending,
    totalPaid: paid,
    summary: {
      totalCommissions: pending + paid,
      pendingCount: commissionsWithNumbers.filter(c => c.status === 'pending').length,
      paidCount: commissionsWithNumbers.filter(c => c.status === 'paid').length,
      cancelledCount: commissionsWithNumbers.filter(c => c.status === 'cancelled').length
    }
  };
      
    case 'ADD_COMMISSION':
      const newPending = state.totalPending + action.payload.amount;
      return {
        ...state,
        commissions: [action.payload, ...state.commissions],
        totalPending: newPending,
        summary: {
          ...state.summary,
          totalCommissions: state.summary.totalCommissions + action.payload.amount,
          pendingCount: state.summary.pendingCount + 1
        }
      };
      
    case 'ADD_BULK_COMMISSIONS':
      const bulkAmount = action.payload.reduce((sum, c) => sum + c.amount, 0);
      return {
        ...state,
        commissions: [...action.payload, ...state.commissions],
        totalPending: state.totalPending + bulkAmount,
        summary: {
          ...state.summary,
          totalCommissions: state.summary.totalCommissions + bulkAmount,
          pendingCount: state.summary.pendingCount + action.payload.length
        }
      };
      
    case 'UPDATE_COMMISSION_STATUS':
      const updatedCommissions = state.commissions.map(comm =>
        comm.commission_id === action.payload.commission_id
          ? { 
              ...comm, 
              status: action.payload.status,
              paid_at: action.payload.status === 'paid' ? new Date().toISOString().split('T')[0] : comm.paid_at,
              payment_reference: action.payload.payment_reference || comm.payment_reference,
              updated_at: new Date().toISOString().split('T')[0]
            }
          : comm
      );
      
      const updatedPending = updatedCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
      const updatedPaid = updatedCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
      
      return {
        ...state,
        commissions: updatedCommissions,
        totalPending: updatedPending,
        totalPaid: updatedPaid,
        summary: {
          totalCommissions: updatedPending + updatedPaid,
          pendingCount: updatedCommissions.filter(c => c.status === 'pending').length,
          paidCount: updatedCommissions.filter(c => c.status === 'paid').length,
          cancelledCount: updatedCommissions.filter(c => c.status === 'cancelled').length
        }
      };
      
    case 'UPDATE_COMMISSION_RATE':
      const updatedRateCommissions = state.commissions.map(comm =>
        comm.commission_id === action.payload.commission_id
          ? { 
              ...comm, 
              rate: action.payload.new_rate,
              amount: (comm.premium_amount * action.payload.new_rate) / 100,
              updated_at: new Date().toISOString().split('T')[0]
            }
          : comm
      );
      
      return {
        ...state,
        commissions: updatedRateCommissions,
        totalPending: updatedRateCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
        totalPaid: updatedRateCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
      };
      
    case 'DELETE_COMMISSION':
      const filteredCommissions = state.commissions.filter(comm => comm.commission_id !== action.payload.commission_id);
      const newTotalPending = filteredCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
      const newTotalPaid = filteredCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
      
      return {
        ...state,
        commissions: filteredCommissions,
        totalPending: newTotalPending,
        totalPaid: newTotalPaid,
        summary: {
          totalCommissions: newTotalPending + newTotalPaid,
          pendingCount: filteredCommissions.filter(c => c.status === 'pending').length,
          paidCount: filteredCommissions.filter(c => c.status === 'paid').length,
          cancelledCount: filteredCommissions.filter(c => c.status === 'cancelled').length
        }
      };
      
    default:
      return state;
  }
};

// Initial state
const initialState = {
  commissions: [],
  totalPending: 0,
  totalPaid: 0,
  summary: {
    totalCommissions: 0,
    pendingCount: 0,
    paidCount: 0,
    cancelledCount: 0
  }
};

export function CommissionProvider({ children }) {
  const [state, dispatch] = useReducer(commissionReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const accountType = localStorage.getItem('accountType');
  const [isCommissionUser, setIsCommissionUser] = useState(false);
  
  // Check if user is agent or admin on mount
  useEffect(() => {
    const userType = getUserType();
    const hasCommissionAccess = userType === 'agent' || userType === 'admin';
    setIsCommissionUser(hasCommissionAccess);
    
    if (!hasCommissionAccess) {
      console.log('ℹ️ Commission service disabled for user type:', userType);
      setLoading(false);
      dispatch({ type: 'SET_COMMISSIONS', payload: [] });
    }
  }, []);
  
  // Load mock data (only used as fallback)
  const loadMockData = useCallback(() => {
    const mockCommissions = [
      {
        commission_id: 1,
        agent_id: 101,
        agent_name: 'David Wilson',
        policy_id: 1001,
        premium_amount: 5000.00,
        amount: 750.00,
        rate: 15.00,
        status: 'pending',
        created_at: '2024-01-15',
        paid_at: null,
        payment_reference: null,
        updated_at: '2024-01-15'
      },
      {
        commission_id: 2,
        agent_id: 102,
        agent_name: 'Lisa Brown',
        policy_id: 1002,
        premium_amount: 3200.00,
        amount: 384.00,
        rate: 12.00,
        status: 'paid',
        created_at: '2024-01-10',
        paid_at: '2024-01-20',
        payment_reference: 'TRX-001',
        updated_at: '2024-01-20'
      },
      {
        commission_id: 3,
        agent_id: 103,
        agent_name: 'Tom Harris',
        policy_id: 1003,
        premium_amount: 1800.00,
        amount: 180.00,
        rate: 10.00,
        status: 'pending',
        created_at: '2024-01-18',
        paid_at: null,
        payment_reference: null,
        updated_at: '2024-01-18'
      }
    ];
    dispatch({ type: 'SET_COMMISSIONS', payload: mockCommissions });
  }, []);

  // Fetch commissions - ONLY for agents and admins
  const fetchCommissions = useCallback(async () => {
    // Double check user type before fetching
    const userType = getUserType();
    const hasAccess = userType === 'agent' || userType === 'admin';
    
    if (!hasAccess) {
      console.log('ℹ️ Skipping commission fetch - user type:', userType);
      setLoading(false);
      dispatch({ type: 'SET_COMMISSIONS', payload: [] });
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await commissionAPI.getAllCommissions();
      
      if (response && Array.isArray(response)) {
        dispatch({ type: 'SET_COMMISSIONS', payload: response });
      } else {
        dispatch({ type: 'SET_COMMISSIONS', payload: [] });
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
      setError(error.message);
      // Don't load mock data - set empty array
      dispatch({ type: 'SET_COMMISSIONS', payload: [] });
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch commissions only if user has access
  useEffect(() => {
    if (isCommissionUser) {
      if (accountType === 'admin') {
      fetchCommissions();
    }
    } else {
      setLoading(false);
    }
  }, [fetchCommissions, isCommissionUser, accountType]);
  
  const addCommission = async (commissionData) => {
    if (!isCommissionUser) throw new Error('Unauthorized');
    
    try {
      const response = await commissionAPI.createCommission(commissionData);
      dispatch({ type: 'ADD_COMMISSION', payload: response });
      return response;
    } catch (error) {
      console.error('Error adding commission:', error);
      throw error;
    }
  };
  
  const addBulkCommissions = async (commissionsData) => {
    if (!isCommissionUser) throw new Error('Unauthorized');
    
    try {
      const response = await commissionAPI.createBulkCommissions(commissionsData);
      dispatch({ type: 'ADD_BULK_COMMISSIONS', payload: response });
      return response;
    } catch (error) {
      console.error('Error adding bulk commissions:', error);
      throw error;
    }
  };
  
 const payCommission = async (commissionId, paymentReference, paymentMethod, paymentDate, notes) => {
    if (!isCommissionUser) throw new Error('Unauthorized');
    
    try {
        const config = getAxiosConfig();
        const response = await axios.put(
            `${API_BASE_URL}/commissions/${commissionId}/pay`,
            { 
                payment_reference: paymentReference,
                payment_method: paymentMethod,
                payment_date: paymentDate,
                notes: notes
            },
            config
        );
        dispatch({ type: 'UPDATE_COMMISSION_STATUS', payload: response.data.commission });
        return response.data;
    } catch (error) {
        console.error('Error paying commission:', error);
        throw error;
    }
};
  
 const cancelCommission = async (commissionId, reason) => {
    if (!isCommissionUser) throw new Error('Unauthorized');
    
    try {
        const config = getAxiosConfig();
        const response = await axios.put(
            `${API_BASE_URL}/commissions/${commissionId}/cancel`,
            { reason },
            config
        );
        
        console.log('Cancel response:', response.data);
        
        // Refresh commissions after cancellation to get updated data
        await fetchCommissions();
        
        return response.data;
    } catch (error) {
        console.error('Error cancelling commission:', error.response?.data || error.message);
        throw error;
    }
};
  
  const updateCommissionRate = async (commissionId, newRate) => {
    if (!isCommissionUser) throw new Error('Unauthorized');
    
    try {
      const response = await commissionAPI.updateCommissionRate(commissionId, newRate);
      dispatch({ type: 'UPDATE_COMMISSION_RATE', payload: { commission_id: commissionId, new_rate: newRate } });
      return response;
    } catch (error) {
      console.error('Error updating rate:', error);
      throw error;
    }
  };
  
  const deleteCommission = async (commissionId) => {
    if (!isCommissionUser) throw new Error('Unauthorized');
    
    try {
      await commissionAPI.deleteCommission(commissionId);
      dispatch({ type: 'DELETE_COMMISSION', payload: { commission_id: commissionId } });
    } catch (error) {
      console.error('Error deleting commission:', error);
      throw error;
    }
  };
  // Add to CommissionContext.js inside CommissionProvider component
// Add this function to fetch commissions with filters
const fetchCommissionsWithFilters = useCallback(async (filters = {}) => {
    try {
        setLoading(true);
        const params = new URLSearchParams(filters).toString();
        const url = `${API_BASE_URL}/commissions${params ? '?' + params : ''}`;
        const config = getAxiosConfig();
        const response = await axios.get(url, config);
        
        if (response.data && Array.isArray(response.data)) {
            dispatch({ type: 'SET_COMMISSIONS', payload: response.data });
        } else {
            dispatch({ type: 'SET_COMMISSIONS', payload: [] });
        }
    } catch (error) {
        console.error('Error fetching commissions:', error);
        dispatch({ type: 'SET_COMMISSIONS', payload: [] });
    } finally {
        setLoading(false);
    }
}, []);
// Approve commission (process payment)
const approveCommission = async (commissionId, paymentMethod = 'stripe', notes = '') => {
    try {
        const config = getAxiosConfig();
        const response = await axios.post(
            `${API_BASE_URL}/commissions/${commissionId}/approve`,
            { payment_method: paymentMethod, notes },
            config
        );
        
        // Refresh commissions after approval
        await fetchCommissions();
        
        return response.data;
    } catch (error) {
        console.error('Error approving commission:', error);
        throw error;
    }
};

// Disapprove commission (reject with reason)
const disapproveCommission = async (commissionId, reason, notes = '') => {
    try {
        const config = getAxiosConfig();
        const response = await axios.post(
            `${API_BASE_URL}/commissions/${commissionId}/disapprove`,
            { reason, notes },
            config
        );
        
        // Refresh commissions after disapproval
        await fetchCommissions();
        
        return response.data;
    } catch (error) {
        console.error('Error disapproving commission:', error);
        throw error;
    }
};
  const exportReport = async (filters = {}) => {
    if (!isCommissionUser) throw new Error('Unauthorized');
    
    try {
      const blob = await commissionAPI.exportCommissionsReport(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commissions_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  };
  
  const refreshData = async () => {
    if (isCommissionUser) {
      await fetchCommissions();
    }
  };
  
  const getCommissionsByAgent = (agentId) => {
    return state.commissions.filter(comm => comm.agent_id === agentId);
  };
  
  const getAgentSummary = (agentId) => {
    const agentCommissions = state.commissions.filter(comm => comm.agent_id === agentId);
    return {
      totalCommissions: agentCommissions.reduce((sum, c) => sum + c.amount, 0),
      pending: agentCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
      paid: agentCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
      count: agentCommissions.length
    };
  };
  
  const getAllCommissions = () => {
    return state.commissions;
  };
  
  const getAdminSummary = () => {
    return state.summary;
  };
  
  // ==================== AUDIT LOG FUNCTIONS ====================
  
  const getCommissionAuditLogs = async (commissionId) => {
    if (!isCommissionUser) return [];
    
    try {
      const config = getAxiosConfig();
      const response = await axios.get(
        `${API_BASE_URL}/commissions/audit-logs/${commissionId}`,
        config
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  };
  
  const getAllAuditLogs = async (filters = {}) => {
    if (!isCommissionUser) return { logs: [], total: 0 };
    
    try {
      const config = getAxiosConfig();
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(
        `${API_BASE_URL}/commissions/audit-logs/all?${params}`,
        config
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], total: 0 };
    }
  };
  
  return (
    <CommissionContext.Provider value={{
      commissions: state.commissions,
      totalPending: state.totalPending,
      totalPaid: state.totalPaid,
      summary: state.summary,
      loading,
      error,
      isCommissionUser, // ✅ Expose this to check if user has commission access
      getAllCommissions,
      getCommissionsByAgent,
      getAgentSummary,
      getAdminSummary,
      addCommission,
      addBulkCommissions,
      payCommission,
      cancelCommission,
      updateCommissionRate,
      deleteCommission,
      fetchCommissionsWithFilters,
      exportReport,
      refreshData,
      getCommissionAuditLogs,
      getAllAuditLogs,
      approveCommission,
      disapproveCommission
    }}>
      {children}
    </CommissionContext.Provider>
  );
}

export const useCommissions = () => {
  const context = useContext(CommissionContext);
  if (!context) {
    throw new Error('useCommissions must be used within a CommissionProvider');
  }
  return context;
};