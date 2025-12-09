// utils/auditlogger.js
import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from './config';

export const logAuditAction = async (action, entity, entity_id) => { // ✅ Only 3 parameters
  try {
    const config = getAxiosConfig();
    
    // Get current user info
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    const auditData = {
      user_type: currentUser.userType || 'admin',
      user_id: currentUser.id || 1,
      action: action,
      entity: entity,
      entity_id: entity_id,
    };
    
    console.log('📝 Sending audit log to backend:', auditData);
    const response = await axios.post(`${API_BASE_URL}/audit-logs`, auditData, config);
    
    console.log('✅ Audit log response:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ Failed to log audit action:', error);
    console.error('❌ Error details:', error.response?.data || error.message);
    return false;
  }
};

// Helper functions for specific actions - UPDATED to not pass details
export const auditLogger = {
  // Account management actions
  createAccount: (accountType, accountId) => // ✅ Remove details parameter
    logAuditAction(`CREATE_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId),
  
  updateAccount: (accountType, accountId) => // ✅ Remove details parameter
    logAuditAction(`UPDATE_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId),
  
  deleteAccount: (accountType, accountId) => // ✅ Remove details parameter
    logAuditAction(`DELETE_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId),
  
  // View actions
  viewAccount: (accountType, accountId) => 
    logAuditAction(`VIEW_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId),
  
  // Status change actions - Remove details or update if backend supports it
  changeStatus: (accountType, accountId) => // ✅ Remove details parameter
    logAuditAction(`CHANGE_STATUS_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId),
  
  // Login/logout actions (if needed)
  userLogin: (userId, userType) => 
    logAuditAction('LOGIN', userType, userId),
  
  userLogout: (userId, userType) => 
    logAuditAction('LOGOUT', userType, userId)
};