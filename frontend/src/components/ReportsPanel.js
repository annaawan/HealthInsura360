// frontend/src/components/ReportsPanel.js
import React, { useState } from 'react';
import axios from 'axios';
import { Download, Calendar, FileText, TrendingUp, Users, Building, DollarSign } from 'lucide-react';
import { API_BASE_URL } from '../utils/config';

function ReportsPanel({ token }) {
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/payments/admin/reports/generate`, {
        reportType,
        startDate,
        endDate,
        includeDetails: true
      });
      
      setReportData(response.data.report);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;
    
    let headers = [];
    let rows = [];
    
    if (reportType === 'summary') {
      headers = ['Metric', 'Value'];
      rows = Object.entries(reportData.data).map(([key, value]) => [key, value]);
    } else if (reportType === 'by-type') {
      headers = ['Type', 'Count', 'Total Amount', 'Average Amount', 'Completed Amount'];
      rows = reportData.data.map(item => [
        item.type, item.count, item.total_amount, item.avg_amount, item.completed_amount
      ]);
    } else if (reportType === 'daily') {
      headers = ['Date', 'Count', 'Total', 'Revenue'];
      rows = reportData.data.map(item => [
        item.date, item.count, item.total, item.revenue
      ]);
    }
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payment_report_${reportType}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(blob);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Generate Reports</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="summary">Summary Report</option>
            <option value="by-type">Payment Types Breakdown</option>
            <option value="daily">Daily Breakdown</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div className="flex items-end">
          <button
            onClick={generateReport}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      {reportData && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">
              Report: {reportData.type.toUpperCase()}
              <span className="text-sm text-gray-500 ml-2">
                ({reportData.period.startDate} to {reportData.period.endDate})
              </span>
            </h3>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            {reportType === 'summary' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Total Transactions</div>
                  <div className="text-2xl font-bold text-blue-900">{reportData.data.total_transactions || 0}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-900">{formatCurrency(reportData.data.total_revenue || 0)}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600">Average Transaction</div>
                  <div className="text-2xl font-bold text-yellow-900">{formatCurrency(reportData.data.avg_transaction || 0)}</div>
                </div>
                <div className="bg-green-100 p-4 rounded-lg">
                  <div className="text-sm text-green-700">Completed</div>
                  <div className="text-2xl font-bold text-green-800">{reportData.data.completed || 0}</div>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg">
                  <div className="text-sm text-yellow-700">Pending</div>
                  <div className="text-2xl font-bold text-yellow-800">{reportData.data.pending || 0}</div>
                </div>
                <div className="bg-red-100 p-4 rounded-lg">
                  <div className="text-sm text-red-700">Failed/Refunded/Disputed</div>
                  <div className="text-2xl font-bold text-red-800">
                    {(reportData.data.failed || 0) + (reportData.data.refunded || 0) + (reportData.data.disputed || 0)}
                  </div>
                </div>
              </div>
            )}
            
            {reportType === 'by-type' && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Payment Type</th>
                    <th className="px-4 py-2 text-right">Count</th>
                    <th className="px-4 py-2 text-right">Total Amount</th>
                    <th className="px-4 py-2 text-right">Average</th>
                    <th className="px-4 py-2 text-right">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 font-medium">{item.type}</td>
                      <td className="px-4 py-2 text-right">{item.count}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.total_amount)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.avg_amount)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.completed_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {reportType === 'daily' && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">Transactions</th>
                    <th className="px-4 py-2 text-right">Total Amount</th>
                    <th className="px-4 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{item.date}</td>
                      <td className="px-4 py-2 text-right">{item.count}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Generated at: {new Date(reportData.generated_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsPanel;