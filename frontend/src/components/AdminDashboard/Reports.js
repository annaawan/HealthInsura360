import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Activity, DollarSign, FileBarChart, TrendingUp, Users as UsersIcon, Building, BarChart3, AlertCircle, Download, FileText, Table, Printer, RefreshCw} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { Line as LineChart, Doughnut as DonutChart, Bar as BarChart } from 'react-chartjs-2';
import { API_BASE_URL, getAxiosConfig } from '../../config';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  ChartTooltip,
  Legend,
  Filler
);
function Reports() {
  const [selectedReport, setSelectedReport] = useState('commission-summary');
  const [dateRange, setDateRange] = useState('last-30-days');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reports = useMemo(() => [
    { id: 'monthly', name: 'Monthly Performance', icon: Activity, chartType: 'line', active: false },
    { id: 'commission-summary', name: 'Commission Summary', icon: DollarSign, chartType: 'bar', active: true },
    { id: 'claims', name: 'Claims Analysis', icon: FileBarChart, chartType: 'pie', active: false },
    { id: 'user', name: 'User Growth', icon: TrendingUp, chartType: 'line', active: true },
    { id: 'agent', name: 'Agent Performance', icon: UsersIcon, chartType: 'bar', active: true },
    { id: 'hospital', name: 'Hospital Network', icon: Building, chartType: 'doughnut', active: true },
  ], []);

  // Helper function to get date range values - FIXED (removed unused endDate variable)
const getDateRangeValues = useCallback(() => {
  const today = new Date();
  let startDate;
  
  switch (dateRange) {
    case 'last-7-days':
      startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
      break;
    case 'last-30-days':
      startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
      break;
    case 'last-quarter':
      startDate = new Date(today.setMonth(today.getMonth() - 3)).toISOString().split('T')[0];
      break;
    case 'last-year':
      startDate = new Date(today.setFullYear(today.getFullYear() - 1)).toISOString().split('T')[0];
      break;
    case 'all-time':
      startDate = '2020-01-01';
      break;
    default:
      startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
  }
  
  return { 
    start_date: startDate, 
    end_date: new Date().toISOString().split('T')[0] 
  };
}, [dateRange]);
  // Fetch report data
  const fetchReport = useCallback(async () => {
    const currentReport = reports.find(r => r.id === selectedReport);
    
    if (!currentReport?.active) {
      setError(`${currentReport?.name} report is currently inactive`);
      setReportData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const config = getAxiosConfig();
      
      // For commission summary, use the commission API
      if (selectedReport === 'commission-summary') {
        const dateValues = getDateRangeValues();
        const response = await axios.get(
          `${API_BASE_URL}/commissions/report/summary`,
          {
            ...config,
            params: { 
              start_date: dateValues.start_date,
              end_date: dateValues.end_date
            }
          }
        );
        
        if (response.data) {
          setReportData(response.data);
        } else {
          throw new Error('Failed to fetch commission summary');
        }
      } 
      else if (selectedReport === 'agent') {
        const dateValues = getDateRangeValues();
        const response = await axios.get(
          `${API_BASE_URL}/commissions/report/agent-performance`,
          {
            ...config,
            params: { 
              start_date: dateValues.start_date,
              end_date: dateValues.end_date
            }
          }
        );
        
        if (response.data) {
          setReportData(response.data);
        } else {
          throw new Error('Failed to fetch agent performance');
        }
      }
      else {
        // Handle other reports
        const res = await axios.get(
          `${API_BASE_URL}/reports/${selectedReport}`,
          {
            ...config,
            params: { range: dateRange }
          }
        );
        
        if (res.data.success) {
          setReportData(res.data.data);
        } else {
          throw new Error(res.data.message || 'Failed to fetch report data');
        }
      }
    } catch (err) {
      console.error("Error loading report:", err);
      setError(err.response?.data?.message || err.message || 'Failed to load report');
      setReportData(null);
      
      // Load mock data for commission summary if API fails
      if (selectedReport === 'commission-summary') {
        loadMockCommissionData();
      } else if (selectedReport === 'agent') {
        loadMockAgentPerformanceData();
      }
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange, reports, getDateRangeValues]);

  // Mock data for commission summary
  const loadMockCommissionData = () => {
    const mockData = {
      summary: {
        total_commissions: 12500,
        paid_commissions: 8750,
        pending_commissions: 3750,
        total_agents: 15,
        active_agents: 12,
        avg_commission_rate: 12.5,
        total_policies: 48
      },
      chartData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        commission_amounts: [1250, 1800, 2200, 1900, 2500, 2850],
        paid_amounts: [1000, 1500, 2000, 1800, 1500, 950],
        pending_amounts: [250, 300, 200, 100, 1000, 1900]
      },
      topAgents: [
        { name: 'David Wilson', commission: 3250, policies: 8, rate: 15 },
        { name: 'Lisa Brown', commission: 2840, policies: 6, rate: 12 },
        { name: 'Tom Harris', commission: 1800, policies: 4, rate: 10 },
        { name: 'Sarah Johnson', commission: 1650, policies: 5, rate: 11 },
        { name: 'Michael Lee', commission: 1400, policies: 3, rate: 9 }
      ],
      period: { start_date: '2024-01-01', end_date: '2024-06-30' }
    };
    setReportData(mockData);
  };

  const loadMockAgentPerformanceData = () => {
    const mockData = {
      summary: {
        total_agents: 15,
        active_agents: 12,
        total_commissions: 12500,
        avg_commission_per_agent: 1042,
        top_performer: 'David Wilson',
        top_performer_commission: 3250
      },
      chartData: {
        labels: ['David Wilson', 'Lisa Brown', 'Tom Harris', 'Sarah Johnson', 'Michael Lee', 'Others'],
        commission_amounts: [3250, 2840, 1800, 1650, 1400, 1560],
        policy_counts: [8, 6, 4, 5, 3, 22]
      },
      agents: [
        { name: 'David Wilson', commission: 3250, policies: 8, rate: 15, status: 'active' },
        { name: 'Lisa Brown', commission: 2840, policies: 6, rate: 12, status: 'active' },
        { name: 'Tom Harris', commission: 1800, policies: 4, rate: 10, status: 'active' },
        { name: 'Sarah Johnson', commission: 1650, policies: 5, rate: 11, status: 'active' },
        { name: 'Michael Lee', commission: 1400, policies: 3, rate: 9, status: 'pending' }
      ],
      period: { start_date: '2024-01-01', end_date: '2024-06-30' }
    };
    setReportData(mockData);
  };

  // Export report
  const exportReport = async (format = 'pdf') => {
    const currentReport = reports.find(r => r.id === selectedReport);
    
    if (!currentReport?.active) {
      alert(`${currentReport?.name} report export is currently inactive`);
      return;
    }

    try {
      const config = getAxiosConfig();
      
      if (selectedReport === 'commission-summary') {
        const dateValues = getDateRangeValues();
        const response = await axios.get(
          `${API_BASE_URL}/commissions/report/export`,
          {
            ...config,
            params: { 
              start_date: dateValues.start_date,
              end_date: dateValues.end_date,
              format: format 
            },
            responseType: 'blob'
          }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const fileName = `Commission_Summary_${new Date().toISOString().split('T')[0]}.${format}`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        alert(`Report exported successfully as ${fileName}`);
      } else {
        const response = await axios.get(
          `${API_BASE_URL}/reports/export/${selectedReport}`,
          {
            ...config,
            params: { 
              range: dateRange,
              format: format 
            },
            responseType: 'blob'
          }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${currentReport?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        alert(`Report exported successfully as ${fileName}`);
      }
    } catch (err) {
      console.error("Error exporting report:", err);
      alert(err.response?.data?.message || 'Failed to export report');
    }
  };

  // Generate chart data
  const getChartData = useCallback(() => {
    if (!reportData) return null;
    
    switch (selectedReport) {
      case 'commission-summary':
        if (!reportData.chartData) return null;
        return {
          labels: reportData.chartData.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Commission Earned',
              data: reportData.chartData.commission_amounts || [],
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: 'Paid Amount',
              data: reportData.chartData.paid_amounts || [],
              backgroundColor: 'rgba(34, 197, 94, 0.6)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: 'Pending Amount',
              data: reportData.chartData.pending_amounts || [],
              backgroundColor: 'rgba(234, 179, 8, 0.6)',
              borderColor: 'rgb(234, 179, 8)',
              borderWidth: 2,
              borderRadius: 6,
            }
          ]
        };
        
      case 'agent':
        if (!reportData.chartData) return null;
        return {
          labels: reportData.chartData.labels || [],
          datasets: [
            {
              label: 'Commission Amount ($)',
              data: reportData.chartData.commission_amounts || [],
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 2,
            }
          ]
        };
        
      case 'user':
        const userLabels = reportData.labels || [];
        const userData = reportData.data || [];
        const cumulativeData = reportData.cumulativeData || [];
        
        if (userLabels.length === 0 || userData.length === 0) {
          return null;
        }
        
        return {
          labels: userLabels,
          datasets: [
            {
              label: 'New Users',
              data: userData,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true,
            },
            {
              label: 'Total Users',
              data: cumulativeData.length > 0 ? cumulativeData : userData,
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.4,
              borderDash: [5, 5],
              fill: false,
            }
          ]
        };
        
      case 'hospital':
        const hospitalLabels = reportData.labels || [];
        const hospitalData = reportData.data || [];
        
        if (hospitalLabels.length === 0 || hospitalData.length === 0) {
          return null;
        }
        
        const backgroundColors = [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ];
        
        return {
          labels: hospitalLabels,
          datasets: [
            {
              label: 'Hospital Count',
              data: hospitalData,
              backgroundColor: backgroundColors.slice(0, hospitalLabels.length),
              borderColor: backgroundColors.slice(0, hospitalLabels.length).map(color => color.replace('0.8', '1')),
              borderWidth: 2,
              hoverOffset: 15,
            }
          ]
        };
        
      default:
        return null;
    }
  }, [reportData, selectedReport]);

  // Get chart options
  const getChartOptions = useCallback(() => {
    const currentReport = reports.find(r => r.id === selectedReport);
    
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 12 },
            padding: 20,
            usePointStyle: true,
          }
        },
        title: {
          display: true,
          text: currentReport?.name || 'Report',
          font: { size: 16, weight: 'bold' },
          padding: { top: 10, bottom: 30 }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#111827',
          bodyColor: '#374151',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== undefined) {
                label += '$' + context.parsed.y.toLocaleString();
              } else if (context.parsed !== undefined) {
                label += context.parsed.toLocaleString();
              }
              return label;
            }
          }
        },
      },
    };

    if (selectedReport === 'hospital') {
      return {
        ...baseOptions,
        cutout: '60%',
        plugins: {
          ...baseOptions.plugins,
          legend: {
            position: 'right',
            labels: { font: { size: 11 }, padding: 10, usePointStyle: true }
          },
        }
      };
    } else if (selectedReport === 'commission-summary' || selectedReport === 'agent') {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: selectedReport === 'commission-summary' ? 'Amount ($)' : 'Commission Amount ($)',
              font: { size: 12, weight: 'bold' }
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          },
          x: {
            title: {
              display: true,
              text: selectedReport === 'commission-summary' ? 'Month' : 'Agent',
              font: { size: 12, weight: 'bold' }
            }
          }
        }
      };
    } else {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: selectedReport === 'user' ? 'Number of Users' : 'Count',
              font: { size: 12, weight: 'bold' }
            },
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          }
        }
      };
    }
  }, [reports, selectedReport]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Render appropriate chart component
  const renderChart = () => {
    if (!reportData) {
      return null;
    }
    
    const chartData = getChartData();
    const options = getChartOptions();

    if (!chartData) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-2">No chart data available</p>
          <p className="text-sm text-gray-500 text-center">
            Check the summary section below for details.
          </p>
        </div>
      );
    }

    try {
      switch (selectedReport) {
        case 'commission-summary':
        case 'agent':
          return <BarChart data={chartData} options={options} />;
        case 'user':
          return <LineChart data={chartData} options={options} />;
        case 'hospital':
          return <DonutChart data={chartData} options={options} />;
        default:
          return (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2">Chart Preview Unavailable</p>
              <p className="text-sm text-gray-500 text-center">
                This report type is currently inactive.
              </p>
            </div>
          );
      }
    } catch (error) {
      console.error('Chart rendering error:', error);
      return (
        <div className="h-full flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-red-600 mb-2">Error rendering chart</p>
          <p className="text-sm text-red-500 text-center">{error.message}</p>
        </div>
      );
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and view comprehensive system reports</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="last-7-days">Last 7 Days</option>
            <option value="last-30-days">Last 30 Days</option>
            <option value="last-quarter">Last Quarter (90 Days)</option>
            <option value="last-year">Last Year</option>
            <option value="all-time">All Time</option>
          </select>

          <button
            onClick={() => exportReport('pdf')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={loading || !reports.find(r => r.id === selectedReport)?.active}
          >
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                selectedReport === report.id
                  ? report.active 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-gray-100 border-gray-300 shadow-sm'
                  : report.active
                    ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    : 'bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed'
              }`}
              disabled={!report.active}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    selectedReport === report.id 
                      ? report.active 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-200 text-gray-600'
                      : report.active
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {report.active ? 'View detailed analytics' : 'Currently inactive'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </p>
        </div>
      )}

      {/* Report Preview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {reports.find(r => r.id === selectedReport)?.name || 'Report'} Report
            {dateRange && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({dateRange.replace(/-/g, ' ')})
              </span>
            )}
          </h3>
          
          <div className="flex gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              loading 
                ? 'bg-yellow-100 text-yellow-800' 
                : reports.find(r => r.id === selectedReport)?.active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {loading ? 'Loading...' : reports.find(r => r.id === selectedReport)?.active ? 'Active Report' : 'Inactive Report'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Generating report...</p>
            </div>
          </div>
        ) : reportData ? (
          <div className="h-80">
            {renderChart()}
          </div>
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                {reports.find(r => r.id === selectedReport)?.active 
                  ? 'No report data available' 
                  : 'This report is currently inactive'}
              </p>
              <p className="text-sm text-gray-500">
                {reports.find(r => r.id === selectedReport)?.active 
                  ? 'Select an active report type to generate data' 
                  : 'Please select Commission Summary, User Growth, Agent Performance, or Hospital Network for active reports'}
              </p>
            </div>
          </div>
        )}

        {/* Report Summary - Enhanced for commission summary */}
        {reportData && reportData.summary && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Report Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className={`text-2xl font-bold ${
                    key.includes('commission') ? 'text-blue-600' : 
                    key.includes('paid') ? 'text-green-600' : 
                    key.includes('pending') ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                    {key.includes('commission') || key.includes('paid') || key.includes('pending') 
                      ? `$${typeof value === 'number' ? value.toLocaleString() : value}` 
                      : value}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Agents Section for Commission Summary */}
        {selectedReport === 'commission-summary' && reportData && reportData.topAgents && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Top Performing Agents</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Agent Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Commission</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Policies Sold</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topAgents.map((agent, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 text-sm">{agent.name}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-green-600">
                        ${agent.commission.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm">{agent.policies}</td>
                      <td className="px-4 py-2 text-sm">{agent.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        {reports.find(r => r.id === selectedReport)?.active && (
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>

            <button
              onClick={() => exportReport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-5 w-5" />
              Download PDF
            </button>

            <button
              onClick={() => exportReport('csv')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Table className="h-5 w-5" />
              Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Printer className="h-5 w-5" />
              Print Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;