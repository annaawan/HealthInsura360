import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Activity, DollarSign, FileBarChart, TrendingUp, Users as UsersIcon, Building, BarChart3, AlertCircle, Download, FileText, Table, Printer, RefreshCw, Calendar } from 'lucide-react';
import { Line as LineChart, Doughnut as DonutChart } from 'react-chartjs-2';
import { API_BASE_URL, getAxiosConfig } from '../../config';
function Reports() {
  const [selectedReport, setSelectedReport] = useState('user');
  const [dateRange, setDateRange] = useState('last-30-days');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reports = useMemo(() => [
    { id: 'monthly', name: 'Monthly Performance', icon: Activity, chartType: 'line', active: false },
    { id: 'financial', name: 'Financial Summary', icon: DollarSign, chartType: 'bar', active: false },
    { id: 'claims', name: 'Claims Analysis', icon: FileBarChart, chartType: 'pie', active: false },
    { id: 'user', name: 'User Growth', icon: TrendingUp, chartType: 'line', active: true },
    { id: 'agent', name: 'Agent Performance', icon: UsersIcon, chartType: 'bar', active: false },
    { id: 'hospital', name: 'Hospital Network', icon: Building, chartType: 'doughnut', active: true },
  ], []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    const currentReport = reports.find(r => r.id === selectedReport);
    
    // Only fetch for active reports
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
    } catch (err) {
      console.error("Error loading report:", err);
      setError(err.response?.data?.message || err.message || 'Failed to load report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange, reports]);

  // Export report
  const exportReport = async (format = 'pdf') => {
    const currentReport = reports.find(r => r.id === selectedReport);
    
    if (!currentReport?.active) {
      alert(`${currentReport?.name} report export is currently inactive`);
      return;
    }

    try {
      const config = getAxiosConfig();
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

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = `${currentReport?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert(`Report exported successfully as ${fileName}`);
    } catch (err) {
      console.error("Error exporting report:", err);
      alert(err.response?.data?.message || 'Failed to export report');
    }
  };

  // Generate chart data from API response - updated with better error handling
  const getChartData = useCallback(() => {
    if (!reportData) return null;
    
    switch (selectedReport) {
      case 'user':
        // Ensure we have valid data arrays
        const userLabels = reportData.labels || [];
        const userData = reportData.data || [];
        const cumulativeData = reportData.cumulativeData || [];
        
        // If no data, return null
        if (userLabels.length === 0 || userData.length === 0) {
          console.log('⚠️ No user growth data available');
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
        // Ensure we have valid data arrays
        const hospitalLabels = reportData.labels || [];
        const hospitalData = reportData.data || [];
        
        // If no data, return null
        if (hospitalLabels.length === 0 || hospitalData.length === 0) {
          console.log('⚠️ No hospital network data available');
          return null;
        }
        
        const backgroundColors = [
          'rgba(34, 197, 94, 0.8)',    // Green for verified
          'rgba(59, 130, 246, 0.8)',   // Blue for active
          'rgba(234, 179, 8, 0.8)',    // Yellow for pending
          'rgba(239, 68, 68, 0.8)',    // Red for inactive
          'rgba(168, 85, 247, 0.8)',   // Purple for others
        ];
        
        return {
          labels: hospitalLabels,
          datasets: [
            {
              label: 'Hospital Count',
              data: hospitalData,
              backgroundColor: backgroundColors.slice(0, hospitalLabels.length),
              borderColor: backgroundColors.slice(0, hospitalLabels.length).map(color => 
                color.replace('0.8', '1')
              ),
              borderWidth: 2,
              hoverOffset: 15,
            }
          ]
        };
        
      default:
        return null;
    }
  }, [reportData, selectedReport]);

  // Get chart options - updated with better styling
  const getChartOptions = useCallback(() => {
    const currentReport = reports.find(r => r.id === selectedReport);
    
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 12
            },
            padding: 20,
            usePointStyle: true,
          }
        },
        title: {
          display: true,
          text: currentReport?.name || 'Report',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 30
          }
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
          boxPadding: 6,
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
    };

    if (selectedReport === 'hospital') {
      // Doughnut chart options
      return {
        ...baseOptions,
        cutout: '60%',
        plugins: {
          ...baseOptions.plugins,
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 11
              },
              padding: 10,
              usePointStyle: true,
            }
          },
        }
      };
    } else {
      // Line chart options (for user growth)
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: selectedReport === 'user' ? 'Number of Users' : 'Count',
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              },
              font: {
                size: 11
              }
            }
          },
          x: {
            title: {
              display: true,
              text: selectedReport === 'user' ? 'Time Period' : 'Categories',
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              font: {
                size: 11
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

  // Render appropriate chart component - updated with fallback
  const renderChart = () => {
    if (!reportData) {
      console.log('❌ No report data available');
      return null;
    }
    
    const chartData = getChartData();
    const options = getChartOptions();

    if (!chartData) {
      console.log('❌ Chart data generation failed');
      return (
        <div className="h-full flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-2">No chart data available</p>
          <p className="text-sm text-gray-500 text-center">
            The report data exists but cannot be displayed as a chart.<br />
            Check the summary section for details.
          </p>
        </div>
      );
    }

    console.log('📊 Rendering chart for:', selectedReport);
    console.log('📊 Chart data structure:', chartData);

    try {
      switch (selectedReport) {
        case 'user':
          return <LineChart data={chartData} options={options} />;
        case 'hospital':
          return <DonutChart data={chartData} options={options} />;
        default:
          // For inactive reports, show placeholder
          return (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2">Chart Preview Unavailable</p>
              <p className="text-sm text-gray-500 text-center">
                This report type is currently inactive.<br />
                Only User Growth and Hospital Network reports are active.
              </p>
            </div>
          );
      }
    } catch (error) {
      console.error('❌ Chart rendering error:', error);
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

  // Add debug logging to see what data we're receiving
  useEffect(() => {
    if (reportData) {
      console.log('📊 Report Data Structure:', {
        hasData: !!reportData,
        labels: reportData.labels,
        data: reportData.data,
        cumulativeData: reportData.cumulativeData,
        summary: reportData.summary,
        reportType: selectedReport
      });
    }
  }, [reportData, selectedReport]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and view comprehensive system reports</p>
          <p className="text-sm text-yellow-600 mt-1">⚠️ Only User Growth and Hospital Network reports are active</p>
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
                  : 'Please select User Growth or Hospital Network for active reports'}
              </p>
            </div>
          </div>
        )}

        {/* Report Summary */}
        {reportData && reportData.summary && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Report Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{value}</div>
                  <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                </div>
              ))}
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

      {/* Debug button - only shows in development */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            // Test with sample data to verify charts work
            const sampleData = selectedReport === 'user' ? {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              data: [65, 59, 80, 81, 56, 55],
              cumulativeData: [65, 124, 204, 285, 341, 396],
              summary: {
                total_customers: 396,
                new_last_30_days: 55,
                active_customers: 350,
                male_customers: 210,
                female_customers: 186,
                senior_customers: 45,
                top_city: 'New York'
              }
            } : {
              labels: ['Verified', 'Active', 'Pending', 'Inactive'],
              data: [45, 38, 12, 5],
              summary: {
                total_hospitals: 100,
                verified_hospitals: 45,
                active_hospitals: 38,
                new_last_30_days: 8,
                cities_covered: 25,
                states_covered: 12,
                top_city: 'New York'
              }
            };
            setReportData(sampleData);
            console.log('✅ Test data loaded for:', selectedReport);
          }}
          className="fixed bottom-4 right-4 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg shadow-lg z-50 hover:bg-purple-700"
        >
          Load Test Data
        </button>
      )}
    </div>
  );
}

export default Reports;
