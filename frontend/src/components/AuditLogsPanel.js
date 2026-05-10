// frontend/src/components/AuditLogsPanel.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, Search, Filter, Eye } from 'lucide-react';

function AuditLogsPanel({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    performed_by_type: '',
    startDate: '',
    endDate: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.performed_by_type) params.append('performed_by_type', filters.performed_by_type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/payments/admin/audit-logs?${params}`);
      setLogs(response.data.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const getActionBadge = (action) => {
    if (action.includes('Completed')) return 'bg-green-100 text-green-800';
    if (action.includes('Failed')) return 'bg-red-100 text-red-800';
    if (action.includes('Refunded')) return 'bg-orange-100 text-orange-800';
    if (action.includes('Disputed')) return 'bg-red-100 text-red-800';
    if (action.includes('REPORT')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <History className="h-5 w-5" />
          Payment Audit Logs
        </h2>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <select
          value={filters.action}
          onChange={(e) => setFilters({...filters, action: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Actions</option>
          <option value="STATUS_CHANGE">Status Changes</option>
          <option value="REPORT_GENERATED">Report Generations</option>
        </select>
        
        <select
          value={filters.performed_by_type}
          onChange={(e) => setFilters({...filters, performed_by_type: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Users</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="customer">Customer</option>
        </select>
        
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Start Date"
        />
        
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="End Date"
        />
      </div>
      
      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-8">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No audit logs found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Transaction</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Performed By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status Change</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{log.transaction_id || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{log.performed_by_type}</div>
                    <div className="text-xs text-gray-500">{log.performed_by_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {log.old_status && log.new_status ? (
                      <span className="text-sm">
                        {log.old_status} → <span className="font-medium">{log.new_status}</span>
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="font-bold">Audit Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div><strong>Action:</strong> {selectedLog.action}</div>
              <div><strong>Transaction ID:</strong> {selectedLog.transaction_id || 'N/A'}</div>
              <div><strong>Status Change:</strong> {selectedLog.old_status} → {selectedLog.new_status}</div>
              <div><strong>Performed By:</strong> {selectedLog.performed_by_type} ({selectedLog.performed_by_email})</div>
              <div><strong>Timestamp:</strong> {formatDateTime(selectedLog.created_at)}</div>
              <div><strong>IP Address:</strong> {selectedLog.ip_address || 'N/A'}</div>
              {selectedLog.reason && <div><strong>Reason:</strong> {selectedLog.reason}</div>}
              {selectedLog.details && (
                <div>
                  <strong>Details:</strong>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.details), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsPanel;