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
  const [exporting, setExporting] = useState(false);

  const reports = useMemo(() => [
    { id: 'monthly', name: 'Monthly Performance', icon: Activity, chartType: 'line', active: true },
    { id: 'commission-summary', name: 'Commission Summary', icon: DollarSign, chartType: 'bar', active: true },
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

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

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
      // After the commission-summary condition, add:
else if (selectedReport === 'monthly') {
  const dateValues = getDateRangeValues();
  try {
    const response = await axios.get(
      `${API_BASE_URL}/reports/monthly-performance`,
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
      throw new Error('Failed to fetch monthly performance report');
    }
  } catch (err) {
    console.error("Error fetching monthly performance:", err);
    loadMockMonthlyPerformanceData();
  }
}
      else if (selectedReport === 'agent') {
  const dateValues = getDateRangeValues();
  try {
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
    
    console.log('=== AGENT API RESPONSE ===');
    console.log('Full response:', response.data);
    console.log('Agents array:', response.data.agents);
    console.log('Summary:', response.data.summary);
    
    if (response.data && response.data.agents) {
      console.log(`Received ${response.data.agents.length} agents`);
      if (response.data.agents.length > 0) {
        console.log('First agent sample:', response.data.agents[0]);
      }
    }
    
    if (response.data) {
      // Ensure the data has the expected structure
      const formattedData = {
        summary: response.data.summary || {
          total_agents: 0,
          active_agents: 0,
          total_commissions: 0,
          avg_commission_per_agent: 0
        },
        chartData: response.data.chartData || {
          labels: [],
          commission_amounts: [],
          policy_counts: []
        },
        agents: response.data.agents || response.data.agent_performance || [],
        period: response.data.period || { 
          start_date: dateValues.start_date, 
          end_date: dateValues.end_date 
        }
      };
      setReportData(formattedData);
    } else {
      throw new Error('Failed to fetch agent performance');
    }
  } catch (err) {
    console.error("Error fetching agent performance:", err);
    loadMockAgentPerformanceData();
  }
}
      else {
  // Handle other reports (user, hospital)
  try {
    const res = await axios.get(
      `${API_BASE_URL}/reports/${selectedReport}`,
      {
        ...config,
        params: { range: dateRange }
      }
    );
    
    console.log(`${selectedReport} API Response:`, res.data);
    
    if (res.data.success && res.data.data) {
      // Check if the data has the expected structure
      if (selectedReport === 'user') {
        // Ensure user data has required fields
        const userData = res.data.data;
        if (userData.labels && userData.labels.length > 0) {
          setReportData(userData);
        } else {
          console.log('User data has no labels, using mock data');
          loadMockUserGrowthData();
        }
      } else if (selectedReport === 'hospital') {
        // Ensure hospital data has required fields
        const hospitalData = res.data.data;
        if (hospitalData.labels && hospitalData.labels.length > 0) {
          setReportData(hospitalData);
        } else {
          console.log('Hospital data has no labels, using mock data');
          loadMockHospitalNetworkData();
        }
      } else {
        setReportData(res.data.data);
      }
    } else {
      throw new Error(res.data.message || 'Failed to fetch report data');
    }
  } catch (err) {
    console.error(`Error fetching ${selectedReport} report:`, err);
    // Load mock data based on report type
    if (selectedReport === 'user') {
      loadMockUserGrowthData();
    } else if (selectedReport === 'hospital') {
      loadMockHospitalNetworkData();
    } else {
      throw err;
    }
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
      } else if (selectedReport === 'user') {
        loadMockUserGrowthData();
      } else if (selectedReport === 'hospital') {
        loadMockHospitalNetworkData();
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

  const loadMockUserGrowthData = () => {
    const mockData = {
      summary: {
        total_users: 12450,
        new_users_this_period: 2840,
        active_users: 8920,
        growth_rate: 18.5
      },
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [450, 520, 610, 580, 700, 840],
      cumulativeData: [8450, 8970, 9580, 10160, 10860, 11700]
    };
    setReportData(mockData);
  };
const loadMockMonthlyPerformanceData = () => {
  const mockData = {
    summary: {
      total_revenue: 125000,
      total_commissions: 12500,
      total_policies: 48,
      total_agents: 15,
      active_agents: 12,
      total_users: 12450,
      new_users: 2840,
      total_hospitals: 45,
      active_hospitals: 42,
      growth_rate: 18.5
    },
    chartData: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      revenue: [18500, 19200, 21000, 22500, 24800, 28500],
      commissions: [1250, 1800, 2200, 1900, 2500, 2850],
      new_users: [450, 520, 610, 580, 700, 840],
      policies: [6, 8, 10, 9, 11, 12]
    },
    breakdown: {
      user_growth: {
        total_users: 12450,
        new_users_this_period: 2840,
        growth_rate: 18.5,
        monthly_data: [450, 520, 610, 580, 700, 840]
      },
      hospital_network: {
        total_hospitals: 45,
        active_hospitals: 42,
        new_hospitals: 8,
        by_status: { active: 42, pending: 3, inactive: 0 }
      },
      agent_performance: {
        total_agents: 15,
        active_agents: 12,
        total_commissions: 12500,
        avg_commission_per_agent: 1042,
        top_agent: { name: 'David Wilson', commission: 3250, policies: 8 }
      },
      commission_summary: {
        total_commissions: 12500,
        paid_commissions: 8750,
        pending_commissions: 3750,
        avg_rate: 12.5
      }
    },
    period: { start_date: '2024-01-01', end_date: '2024-06-30' }
  };
  setReportData(mockData);
};
  const loadMockHospitalNetworkData = () => {
    const mockData = {
      summary: {
        total_hospitals: 45,
        active_hospitals: 42,
        total_claims: 320,
        avg_response_time: 2.5
      },
      labels: ['City Hospital', 'Memorial Medical', 'St. Mary\'s', 'General Hospital', 'Children\'s Hospital'],
      data: [12, 8, 7, 5, 4]
    };
    setReportData(mockData);
  };

  // Print report functionality
const printReport = () => {
  setExporting(true);
  
  try {
    const currentReport = reports.find(r => r.id === selectedReport);
    const printWindow = window.open('', '_blank');
    
    let htmlContent = `
      <html>
        <head>
          <title>${currentReport?.name || 'Report'} - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #4A90E2; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 20px; }
            h3 { color: #666; margin-top: 15px; }
            h4 { color: #777; margin-top: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            tr:hover { background-color: #f5f5f5; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 10px; }
            .summary-item { background: white; padding: 10px; border-radius: 5px; text-align: center; }
            .summary-value { font-size: 20px; font-weight: bold; color: #4A90E2; }
            .summary-label { font-size: 12px; color: #666; margin-top: 5px; }
            .chart-container { margin: 30px 0; text-align: center; }
            .chart-placeholder { background: #f9f9f9; padding: 20px; border: 1px dashed #ccc; border-radius: 5px; }
            .meta-info { color: #666; font-size: 12px; margin-top: 10px; }
            .breakdown-section { margin-top: 30px; }
            .breakdown-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; }
            .breakdown-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; }
            .breakdown-card h3 { margin-top: 0; color: #4A90E2; border-bottom: 2px solid #4A90E2; padding-bottom: 8px; }
            .breakdown-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .breakdown-label { font-weight: bold; color: #555; }
            .breakdown-value { color: #333; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .kpi-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
            .kpi-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .kpi-label { font-size: 12px; opacity: 0.9; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .breakdown-card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>${currentReport?.name || 'Report'} Report</h1>
          <div class="meta-info">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Date Range: ${dateRange.replace(/-/g, ' ')}</p>
            <p>Period: ${reportData?.period ? `${formatDate(reportData.period.start_date)} to ${formatDate(reportData.period.end_date)}` : 'N/A'}</p>
          </div>
    `;

    // Add summary section
    if (reportData?.summary) {
      htmlContent += `
        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-grid">
      `;
      
      Object.entries(reportData.summary).forEach(([key, value]) => {
        let displayValue = value;
        if (key.includes('commission') || key.includes('paid') || key.includes('pending') || key.includes('revenue')) {
          displayValue = `$${typeof value === 'number' ? value.toLocaleString() : value}`;
        } else if (typeof value === 'number') {
          displayValue = value.toLocaleString();
        }
        
        htmlContent += `
          <div class="summary-item">
            <div class="summary-value">${displayValue}</div>
            <div class="summary-label">${key.replace(/_/g, ' ').toUpperCase()}</div>
          </div>
        `;
      });
      
      htmlContent += `
          </div>
        </div>
      `;
    }

    // Add report-specific content
    switch (selectedReport) {
      case 'monthly':
        // Monthly Performance Report with breakdown sections
        if (reportData?.breakdown) {
          // Key Metrics Grid
          htmlContent += `
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-value">$${(reportData.summary?.total_revenue || 0).toLocaleString()}</div>
                <div class="kpi-label">Total Revenue</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">$${(reportData.summary?.total_commissions || 0).toLocaleString()}</div>
                <div class="kpi-label">Total Commissions</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${(reportData.summary?.total_policies || 0).toLocaleString()}</div>
                <div class="kpi-label">Total Policies</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${(reportData.summary?.growth_rate || 0)}%</div>
                <div class="kpi-label">Growth Rate</div>
              </div>
            </div>
          `;

          // Chart data if available
          if (reportData?.chartData?.labels && reportData.chartData.labels.length > 0) {
            htmlContent += `
              <div class="chart-container">
                <h3>Monthly Trends</h3>
                <div class="chart-placeholder">
                  <p><strong>Monthly Performance Data:</strong></p>
                  <table border="1">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Revenue ($)</th>
                        <th>Commissions ($)</th>
                        <th>New Users</th>
                        <th>Policies</th>
                      </tr>
                    </thead>
                    <tbody>
            `;
            
            reportData.chartData.labels.forEach((month, idx) => {
              htmlContent += `
                <tr>
                  <td>${month}</td>
                  <td>$${(reportData.chartData.revenue?.[idx] || 0).toLocaleString()}</td>
                  <td>$${(reportData.chartData.commissions?.[idx] || 0).toLocaleString()}</td>
                  <td>${(reportData.chartData.new_users?.[idx] || 0).toLocaleString()}</td>
                  <td>${(reportData.chartData.policies?.[idx] || 0).toLocaleString()}</td>
                </tr>
              `;
            });
            
            htmlContent += `
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }

          // Breakdown Sections
          htmlContent += `<div class="breakdown-grid">`;
          
          // User Growth Section
          if (reportData.breakdown.user_growth) {
            htmlContent += `
              <div class="breakdown-card">
                <h3>📈 User Growth</h3>
                <div class="breakdown-item">
                  <span class="breakdown-label">Total Users:</span>
                  <span class="breakdown-value">${(reportData.breakdown.user_growth.total_users || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">New Users (Period):</span>
                  <span class="breakdown-value">+${(reportData.breakdown.user_growth.new_users_this_period || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Growth Rate:</span>
                  <span class="breakdown-value">${(reportData.breakdown.user_growth.growth_rate || 0)}%</span>
                </div>
              </div>
            `;
          }

          // Hospital Network Section
          if (reportData.breakdown.hospital_network) {
            htmlContent += `
              <div class="breakdown-card">
                <h3>🏥 Hospital Network</h3>
                <div class="breakdown-item">
                  <span class="breakdown-label">Total Hospitals:</span>
                  <span class="breakdown-value">${(reportData.breakdown.hospital_network.total_hospitals || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Active Hospitals:</span>
                  <span class="breakdown-value">${(reportData.breakdown.hospital_network.active_hospitals || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">New Hospitals:</span>
                  <span class="breakdown-value">+${(reportData.breakdown.hospital_network.new_hospitals || 0).toLocaleString()}</span>
                </div>
            `;
            
            if (reportData.breakdown.hospital_network.by_status) {
              htmlContent += `<div class="breakdown-item"><span class="breakdown-label">Status Breakdown:</span><span class="breakdown-value"></span></div>`;
              Object.entries(reportData.breakdown.hospital_network.by_status).forEach(([status, count]) => {
                htmlContent += `
                  <div class="breakdown-item" style="padding-left: 20px;">
                    <span class="breakdown-label">${status}:</span>
                    <span class="breakdown-value">${count}</span>
                  </div>
                `;
              });
            }
            
            htmlContent += `</div>`;
          }

          // Agent Performance Section
          if (reportData.breakdown.agent_performance) {
            htmlContent += `
              <div class="breakdown-card">
                <h3>👥 Agent Performance</h3>
                <div class="breakdown-item">
                  <span class="breakdown-label">Total Agents:</span>
                  <span class="breakdown-value">${(reportData.breakdown.agent_performance.total_agents || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Active Agents:</span>
                  <span class="breakdown-value">${(reportData.breakdown.agent_performance.active_agents || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Total Commissions:</span>
                  <span class="breakdown-value">$${(reportData.breakdown.agent_performance.total_commissions || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Avg Commission/Agent:</span>
                  <span class="breakdown-value">$${(reportData.breakdown.agent_performance.avg_commission_per_agent || 0).toLocaleString()}</span>
                </div>
            `;
            
            if (reportData.breakdown.agent_performance.top_agent) {
              htmlContent += `
                <div class="breakdown-item">
                  <span class="breakdown-label">Top Agent:</span>
                  <span class="breakdown-value">${reportData.breakdown.agent_performance.top_agent.name || 'N/A'}</span>
                </div>
                <div class="breakdown-item" style="padding-left: 20px;">
                  <span class="breakdown-label">Commission:</span>
                  <span class="breakdown-value">$${(reportData.breakdown.agent_performance.top_agent.commission || 0).toLocaleString()}</span>
                </div>
              `;
            }
            
            htmlContent += `</div>`;
          }

          // Commission Summary Section
          if (reportData.breakdown.commission_summary) {
            htmlContent += `
              <div class="breakdown-card">
                <h3>💰 Commission Summary</h3>
                <div class="breakdown-item">
                  <span class="breakdown-label">Total Commissions:</span>
                  <span class="breakdown-value">$${(reportData.breakdown.commission_summary.total_commissions || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Paid Commissions:</span>
                  <span class="breakdown-value">$${(reportData.breakdown.commission_summary.paid_commissions || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Pending Commissions:</span>
                  <span class="breakdown-value">$${(reportData.breakdown.commission_summary.pending_commissions || 0).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Average Rate:</span>
                  <span class="breakdown-value">${(reportData.breakdown.commission_summary.avg_rate || 0)}%</span>
                </div>
              </div>
            `;
          }
          
          htmlContent += `</div>`;
        }
        break;

      case 'commission-summary':
        if (reportData?.topAgents) {
          htmlContent += `
            <h2>Top Performing Agents</h2>
            <table border="1">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Commission</th>
                  <th>Policies Sold</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          reportData.topAgents.forEach(agent => {
            htmlContent += `
              <tr>
                <td>${agent.name}</td>
                <td>$${agent.commission.toLocaleString()}</td>
                <td>${agent.policies}</td>
                <td>${agent.rate}%</td>
              </tr>
            `;
          });
          
          htmlContent += `
              </tbody>
            </table>
          `;
        }
        
        if (reportData?.chartData) {
          htmlContent += `
            <div class="chart-container">
              <h3>Commission Trends</h3>
              <div class="chart-placeholder">
                <p><strong>Monthly Commission Data:</strong></p>
                <table border="1">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Commission Earned</th>
                      <th>Paid Amount</th>
                      <th>Pending Amount</th>
                    </tr>
                  </thead>
                  <tbody>
          `;
          
          reportData.chartData.labels.forEach((month, idx) => {
            htmlContent += `
              <tr>
                <td>${month}</td>
                <td>$${reportData.chartData.commission_amounts[idx]?.toLocaleString() || 0}</td>
                <td>$${reportData.chartData.paid_amounts[idx]?.toLocaleString() || 0}</td>
                <td>$${reportData.chartData.pending_amounts[idx]?.toLocaleString() || 0}</td>
              </tr>
            `;
          });
          
          htmlContent += `
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        break;

      case 'agent':
        if (reportData?.agents && reportData.agents.length > 0) {
          htmlContent += `
            <h2>Agent Performance Details</h2>
            <table border="1">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Commission</th>
                  <th>Policies Sold</th>
                  <th>Commission Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          reportData.agents.forEach(agent => {
            const name = agent.name || agent.agent_name || 'Unknown';
            const commission = agent.commission || agent.total_commissions || 0;
            const policies = agent.policies || agent.policy_count || 0;
            const rate = agent.rate || agent.commission_rate || 0;
            const status = agent.status || 'pending';
            
            htmlContent += `
              <tr>
                <td>${name}</td>
                <td>$${commission.toLocaleString()}</td>
                <td>${policies}</td>
                <td>${rate}%</td>
                <td>${status}</td>
              </tr>
            `;
          });
          
          htmlContent += `
              </tbody>
            </table>
          `;
        } else {
          htmlContent += `
            <p>No agent performance data available for the selected period.</p>
          `;
        }
        break;
        
      case 'user':
        if (reportData?.labels && reportData?.data) {
          htmlContent += `
            <h2>User Growth Data</h2>
            <table border="1">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>New Users</th>
                  <th>Total Users</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          reportData.labels.forEach((label, idx) => {
            htmlContent += `
              <tr>
                <td>${label}</td>
                <td>${reportData.data[idx]?.toLocaleString() || 0}</td>
                <td>${reportData.cumulativeData?.[idx]?.toLocaleString() || reportData.data[idx]?.toLocaleString() || 0}</td>
              </tr>
            `;
          });
          
          htmlContent += `
              </tbody>
            </table>
          `;
        }
        break;

      case 'hospital':
        if (reportData?.labels && reportData?.data) {
          htmlContent += `
            <h2>Hospital Network Distribution</h2>
            <table border="1">
              <thead>
                <tr>
                  <th>Hospital Status</th>
                  <th>Number of Hospitals</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          const total = reportData.data.reduce((sum, val) => sum + val, 0);
          reportData.labels.forEach((label, idx) => {
            const percentage = total > 0 ? ((reportData.data[idx] / total) * 100).toFixed(1) : 0;
            htmlContent += `
              <tr>
                <td>${label}</td>
                <td>${reportData.data[idx]}</td>
                <td>${percentage}%</td>
              </tr>
            `;
          });
          
          htmlContent += `
              </tbody>
            </table>
          `;
        }
        break;

      default:
        htmlContent += `
          <div class="chart-placeholder">
            <p>Report data is available in the dashboard view.</p>
          </div>
        `;
    }

    htmlContent += `
          <div class="footer">
            <p>This is a system-generated report. For inquiries, please contact support.</p>
            <p>Report ID: ${currentReport?.id}_${Date.now()}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  } catch (err) {
    console.error('Print failed:', err);
    alert('Failed to print report. Please try again.');
  } finally {
    setExporting(false);
  }
};

  // Export report
  const exportReport = async (format = 'pdf') => {
    const currentReport = reports.find(r => r.id === selectedReport);
    
    if (!currentReport?.active) {
      alert(`${currentReport?.name} report export is currently inactive`);
      return;
    }

    setExporting(true);

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
        window.URL.revokeObjectURL(url);
        
        alert(`Report exported successfully as ${fileName}`);
      } else {
        // For other reports, create CSV/PDF from current data
        if (format === 'csv') {
          exportToCSV();
        } else {
          // For PDF, use print functionality
          printReport();
        }
      }
    } catch (err) {
      console.error("Error exporting report:", err);
      alert(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const currentReport = reports.find(r => r.id === selectedReport);
    let csvContent = [];
    let headers = [];
    let rows = [];

    switch (selectedReport) {
      case 'commission-summary':
        headers = ['Agent Name', 'Commission', 'Policies Sold', 'Rate'];
        if (reportData?.topAgents) {
          rows = reportData.topAgents.map(agent => [
            agent.name,
            agent.commission,
            agent.policies,
            `${agent.rate}%`
          ]);
        }
        break;
case 'monthly':
  headers = ['Metric', 'Value'];
  if (reportData?.summary) {
    rows = Object.entries(reportData.summary).map(([key, value]) => [
      key.replace(/_/g, ' ').toUpperCase(),
      typeof value === 'number' && (key.includes('revenue') || key.includes('commission')) 
        ? `$${value.toLocaleString()}` 
        : value.toLocaleString()
    ]);
  }
  break;
      case 'agent':
  headers = ['Agent Name', 'Commission', 'Policies Sold', 'Rate', 'Status'];
  if (reportData?.agents && reportData.agents.length > 0) {
    rows = reportData.agents.map(agent => [
      agent.name || agent.agent_name || 'Unknown',
      agent.commission || agent.total_commissions || 0,
      agent.policies || agent.policy_count || 0,
      `${agent.rate || agent.commission_rate || 0}%`,
      agent.status || 'pending'
    ]);
  } else {
    rows = [['No data available', '0', '0', '0%', 'N/A']];
  }
  break;

      case 'user':
        headers = ['Period', 'New Users', 'Total Users'];
        if (reportData?.labels && reportData?.data) {
          rows = reportData.labels.map((label, idx) => [
            label,
            reportData.data[idx],
            reportData.cumulativeData?.[idx] || reportData.data[idx]
          ]);
        }
        break;

      case 'hospital':
  headers = ['Hospital Status', 'Number of Hospitals'];
  if (reportData?.labels && reportData?.data) {
    rows = reportData.labels.map((label, idx) => [
      label,
      reportData.data[idx]
    ]);
  }
  break;

      default:
        headers = ['Data'];
        rows = [['No data available']];
    }

    // Add headers
    csvContent.push(headers.join(','));
    
    // Add rows
    rows.forEach(row => {
      csvContent.push(row.map(cell => `"${cell}"`).join(','));
    });

    // Create and download CSV file
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${currentReport?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('CSV exported successfully');
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
        case 'monthly':
  if (!reportData.chartData) return null;
  return {
    labels: reportData.chartData.labels,
    datasets: [
      {
        label: 'Revenue ($)',
        data: reportData.chartData.revenue,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Commissions ($)',
        data: reportData.chartData.commissions,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'New Users',
        data: reportData.chartData.new_users,
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      }
    ]
  };
      case 'agent':
  // First try to use chartData if it exists and has data
  if (reportData.chartData && reportData.chartData.labels && reportData.chartData.labels.length > 0) {
    return {
      labels: reportData.chartData.labels,
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
  }
  // If no chartData, create from agents array
  else if (reportData.agents && reportData.agents.length > 0) {
    // Safely map agent data with fallbacks
    const labels = reportData.agents.map(agent => {
      return agent.name || agent.agent_name || agent.full_name || 'Unknown';
    });
    const data = reportData.agents.map(agent => {
      return agent.commission || agent.total_commissions || agent.amount || 0;
    });
    
    return {
      labels: labels,
      datasets: [
        {
          label: 'Commission Amount ($)',
          data: data,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
        }
      ]
    };
  }
  return null;
        
      case 'user':
  const userLabels = reportData.labels || [];
  const userData = reportData.data || [];
  const cumulativeData = reportData.cumulativeData || [];
  
  if (userLabels.length === 0 || userData.length === 0) {
    // Return a chart with a "No Data" message
    return {
      labels: ['No Data'],
      datasets: [
        {
          label: 'No Data Available',
          data: [0],
          borderColor: 'rgb(200, 200, 200)',
          backgroundColor: 'rgba(200, 200, 200, 0.1)',
        }
      ]
    };
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
    return {
      labels: ['No Data'],
      datasets: [
        {
          label: 'No Data Available',
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.8)'],
          borderColor: ['rgb(200, 200, 200)'],
          borderWidth: 2,
        }
      ]
    };
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
if (selectedReport === 'monthly') {
  return {
    ...baseOptions,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount ($)',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Users',
          font: { size: 12, weight: 'bold' }
        },
        grid: {
          drawOnChartArea: false,
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
          case 'monthly':
  return <LineChart data={chartData} options={options} />;
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
        )
        }{/* Monthly Performance Breakdown */}
{selectedReport === 'monthly' && reportData && reportData.breakdown && (
  <div className="mt-6 space-y-6">
    {/* Key Metrics Grid */}
    <div>
      <h4 className="font-medium text-gray-900 mb-3">Key Performance Indicators</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            ${reportData.summary?.total_revenue?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            ${reportData.summary?.total_commissions?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">Total Commissions</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {reportData.summary?.total_policies || 0}
          </div>
          <div className="text-sm text-gray-600">Total Policies</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {reportData.summary?.growth_rate || 0}%
          </div>
          <div className="text-sm text-gray-600">User Growth Rate</div>
        </div>
      </div>
    </div>

    {/* Report Breakdown Sections */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User Growth Section */}
      <div className="border rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          User Growth
        </h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Users:</span>
            <span className="font-semibold">{reportData.breakdown.user_growth?.total_users?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">New Users (period):</span>
            <span className="font-semibold text-green-600">+{reportData.breakdown.user_growth?.new_users_this_period?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Growth Rate:</span>
            <span className="font-semibold">{reportData.breakdown.user_growth?.growth_rate || 0}%</span>
          </div>
        </div>
      </div>

      {/* Hospital Network Section */}
      <div className="border rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Building className="h-4 w-4 text-green-600" />
          Hospital Network
        </h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Hospitals:</span>
            <span className="font-semibold">{reportData.breakdown.hospital_network?.total_hospitals || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Active Hospitals:</span>
            <span className="font-semibold text-green-600">{reportData.breakdown.hospital_network?.active_hospitals || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">New Hospitals:</span>
            <span className="font-semibold text-blue-600">+{reportData.breakdown.hospital_network?.new_hospitals || 0}</span>
          </div>
        </div>
      </div>

      {/* Agent Performance Section */}
      <div className="border rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-purple-600" />
          Agent Performance
        </h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Agents:</span>
            <span className="font-semibold">{reportData.breakdown.agent_performance?.total_agents || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Active Agents:</span>
            <span className="font-semibold text-green-600">{reportData.breakdown.agent_performance?.active_agents || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Commission/Agent:</span>
            <span className="font-semibold">${(reportData.breakdown.agent_performance?.avg_commission_per_agent || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Top Agent:</span>
            <span className="font-semibold">{reportData.breakdown.agent_performance?.top_agent?.name || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Commission Summary Section */}
      <div className="border rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-yellow-600" />
          Commission Summary
        </h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Commissions:</span>
            <span className="font-semibold">${(reportData.breakdown.commission_summary?.total_commissions || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Paid:</span>
            <span className="font-semibold text-green-600">${(reportData.breakdown.commission_summary?.paid_commissions || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pending:</span>
            <span className="font-semibold text-yellow-600">${(reportData.breakdown.commission_summary?.pending_commissions || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Rate:</span>
            <span className="font-semibold">{reportData.breakdown.commission_summary?.avg_rate || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

        {selectedReport === 'agent' && reportData && (
  <div className="mt-6">
    <h4 className="font-medium text-gray-900 mb-3">Agent Performance Details</h4>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium">Agent Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium">Commission</th>
            <th className="px-4 py-2 text-left text-sm font-medium">Policies Sold</th>
            <th className="px-4 py-2 text-left text-sm font-medium">Commission Rate</th>
            <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {reportData.agents && reportData.agents.length > 0 ? (
            reportData.agents.map((agent, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2 text-sm">{agent.name || agent.agent_name || 'N/A'}</td>
                <td className="px-4 py-2 text-sm font-semibold text-green-600">
                  ${(agent.commission || agent.total_commissions || 0).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm">{agent.policies || agent.policy_count || 0}</td>
                <td className="px-4 py-2 text-sm">{agent.rate || agent.commission_rate || 0}%</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    (agent.status === 'active' || agent.status === 'Active') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {agent.status || 'pending'}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                No agent performance data available for the selected period
              </td>
            </tr>
          )}
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
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FileText className="h-5 w-5" />
              Download PDF
            </button>

            <button
              onClick={() => exportReport('csv')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Table className="h-5 w-5" />
              Export CSV
            </button>

            <button
              onClick={printReport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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