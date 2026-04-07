import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from './config';

// ✅ FIXED: Removed top-level await, wrapped in async function
export const logAuditAction = async (action, entity, entity_id, details = {}) => {
  try {
    const config = getAxiosConfig ? getAxiosConfig() : {}; // Handle if getAxiosConfig is async
    
    // Get current user info
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    const auditData = {
      user_type: currentUser.userType || 'admin',
      user_id: currentUser.id || 1,
      action: action,
      entity: entity,
      entity_id: entity_id,
      details: details,
      timestamp: new Date().toISOString()
    };
    
    console.log('📝 Sending audit log to backend:', auditData);
    
    // Make sure config is properly resolved
    const response = await axios.post(`${API_BASE_URL}/audit-logs`, auditData, config);
    
    console.log('✅ Audit log response:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ Failed to log audit action:', error);
    console.error('❌ Error details:', error.response?.data || error.message);
    return false;
  }
};

// Helper functions for specific actions
export const auditLogger = {
  log: (action, entity, entityId, details = {}) => 
    logAuditAction(action, entity, entityId, details),
  
  createAccount: (accountType, accountId, details = {}) => 
    logAuditAction(`CREATE_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId, details),
  
  updateAccount: (accountType, accountId, details = {}) => 
    logAuditAction(`UPDATE_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId, details),
  
  deleteAccount: (accountType, accountId, details = {}) => 
    logAuditAction(`DELETE_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId, details),
  
  viewAccount: (accountType, accountId, details = {}) => 
    logAuditAction(`VIEW_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId, details),
  
  changeStatus: (accountType, accountId, details = {}) => 
    logAuditAction(`CHANGE_STATUS_${accountType.toUpperCase()}`, accountType.slice(0, -1), accountId, details),
  
  userLogin: (userId, userType, details = {}) => 
    logAuditAction('LOGIN', userType, userId, details),
  
  userLogout: (userId, userType, details = {}) => 
    logAuditAction('LOGOUT', userType, userId, details)
};

export default auditLogger;