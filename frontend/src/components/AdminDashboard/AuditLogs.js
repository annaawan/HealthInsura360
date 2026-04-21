import React, { useState, useEffect} from 'react';
import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from '../../config';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
// Icons from lucide-react
import { 
  FileText, 
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  XCircle,
 Calendar
} from 'lucide-react';


// Register Chart.js plugins
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);



function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUserType, setSelectedUserType] = useState('all');

  // ---------------------------
  // Fetch audit logs from backend
  // ---------------------------
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const res = await axios.get(`${API_BASE_URL}/audit-logs`, config);
      
      if (res.data.success) {
        setLogs(res.data.data);
      } else {
        console.error("Failed to fetch audit logs:", res.data.message);
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // ---------------------------
  // View Log Details
  // ---------------------------
  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  // ---------------------------
  // Get severity based on action
  // ---------------------------
  const getSeverity = (action) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('failed') || 
        actionLower.includes('error') || 
        actionLower.includes('delete') ||
        actionLower.includes('reject')) {
      return 'danger';
    } else if (actionLower.includes('warning') || 
               actionLower.includes('attempt') ||
               actionLower.includes('suspicious')) {
      return 'warning';
    } else if (actionLower.includes('login') || 
               actionLower.includes('create') ||
               actionLower.includes('update') ||
               actionLower.includes('view')) {
      return 'info';
    }
    return 'info';
  };

  // ---------------------------
  // Get severity color
  // ---------------------------
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'danger': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ---------------------------
  // Format timestamp
  // ---------------------------
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // ---------------------------
  // Filter logs
  // ---------------------------
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id?.toString().includes(searchTerm);
    
    const matchesAction = 
      selectedAction === 'all' || 
      log.action?.toLowerCase().includes(selectedAction.toLowerCase());
    
    const matchesUserType = 
      selectedUserType === 'all' || 
      log.user_type?.toLowerCase() === selectedUserType.toLowerCase();
    
    return matchesSearch && matchesAction && matchesUserType;
  });

  // ---------------------------
  // Get unique actions for filter
  // ---------------------------
  const uniqueActions = [...new Set(logs.map(log => log.action).filter(Boolean))];
  const uniqueUserTypes = [...new Set(logs.map(log => log.user_type).filter(Boolean))];

  // ---------------------------
  // Export logs to CSV
  // ---------------------------
  const exportToCSV = () => {
    const csvContent = [
      ['Audit ID', 'Timestamp', 'User Type', 'User ID', 'Action', 'Entity', 'Entity ID', 'Severity'],
      ...filteredLogs.map(log => [
        log.audit_id,
        formatTimestamp(log.timestamp),
        log.user_type || 'N/A',
        log.user_id || 'N/A',
        log.action,
        log.entity || 'N/A',
        log.entity_id || 'N/A',
        getSeverity(log.action)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Audit logs exported successfully!');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Audit Logs</h1>
          <p className="text-gray-600">Monitor system activities and security events</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchAuditLogs}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value)}
            >
              <option value="all">All User Types</option>
              {uniqueUserTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Total Logs</div>
          <div className="text-2xl font-bold text-gray-900">{filteredLogs.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Info</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredLogs.filter(log => getSeverity(log.action) === 'info').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Warnings</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredLogs.filter(log => getSeverity(log.action) === 'warning').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Danger</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredLogs.filter(log => getSeverity(log.action) === 'danger').length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedAction !== 'all' || selectedUserType !== 'all'
                ? 'Try adjusting your filters'
                : 'No audit logs available'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Timestamp</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">User Type</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">User ID</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Action</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Entity</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Severity</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => {
                const severity = getSeverity(log.action);
                return (
                  <tr key={log.audit_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <span className={`px-2 py-1 rounded text-xs ${log.user_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {log.user_type || 'System'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-mono">
                      {log.user_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{log.action}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {log.entity ? `${log.entity}${log.entity_id ? ` #${log.entity_id}` : ''}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(severity)}`}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewDetails(log)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* View Details Modal */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Header */}
                <div className={`p-4 rounded-lg ${getSeverityColor(getSeverity(selectedLog.action))}`}>
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6" />
                    <div>
                      <h3 className="text-lg font-semibold">{selectedLog.action}</h3>
                      <p className="text-sm opacity-90">Audit ID: #{selectedLog.audit_id}</p>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Audit ID</label>
                      <div className="font-mono text-gray-900">#{selectedLog.audit_id}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Timestamp</label>
                      <div className="text-gray-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatTimestamp(selectedLog.timestamp)}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Action</label>
                      <div className="text-gray-900 font-medium">{selectedLog.action}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Severity</label>
                      <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(getSeverity(selectedLog.action))}`}>
                        {getSeverity(selectedLog.action).charAt(0).toUpperCase() + getSeverity(selectedLog.action).slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* User & Entity Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">User & Entity Information</h4>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">User Type</label>
                      <div className="text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs ${selectedLog.user_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                          {selectedLog.user_type || 'System'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">User ID</label>
                      <div className="font-mono text-gray-900">{selectedLog.user_id || 'N/A'}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Entity</label>
                      <div className="text-gray-900">{selectedLog.entity || 'N/A'}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Entity ID</label>
                      <div className="font-mono text-gray-900">{selectedLog.entity_id || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Additional Information</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Full Action Description</label>
                    <div className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                      {selectedLog.user_type ? `${selectedLog.user_type.charAt(0).toUpperCase() + selectedLog.user_type.slice(1)}` : 'System'} 
                      {selectedLog.user_id ? ` (ID: ${selectedLog.user_id})` : ''} 
                      {selectedLog.action.toLowerCase()}
                      {selectedLog.entity ? ` on ${selectedLog.entity}` : ''}
                      {selectedLog.entity_id ? ` (ID: ${selectedLog.entity_id})` : ''}
                      {selectedLog.timestamp ? ` at ${formatTimestamp(selectedLog.timestamp)}` : ''}.
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AuditLogs;