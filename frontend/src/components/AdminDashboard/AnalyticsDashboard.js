import React, { useState, useEffect, useCallback, useMemo} from 'react';
import { fetchAnalyticsData } from '../../services/analyticsServices.js';
import DateRangePicker from '../analytics/DateRangePicker.jsx';
import MetricsGrid from '../charts/MetricsGrid.jsx';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
// Icons from lucide-react
import { 
  Users, 
  FileText, 
  Shield,
  DollarSign,
  Percent,
  Clock,
} from 'lucide-react';

// Chart components from recharts
import {
  PieChart,
  BarChart,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Pie
} from 'recharts';

// Register Chart.js plugins
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);



function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('monthly');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    endDate: new Date()
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize date params
  const dateParams = useMemo(() => ({
    timeRange,
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString()
  }), [timeRange, dateRange]);

 const loadAnalyticsData = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  console.log('🟢 Loading analytics data...');
  console.log('🟢 Date params:', dateParams);
  
  try {
    const response = await fetchAnalyticsData(dateParams);
    
    console.log('🟢 Response from service:', response);
    
    if (response.success && response.data) {
      console.log('🟢 Data received:', response.data);
      console.log('🟢 Metrics:', response.data.metrics);
      setAnalyticsData(response.data);
      setError(null);
    } else {
      console.log('🔴 Response not successful:', response.error);
      setError(response.error || 'Failed to load analytics data');
      setAnalyticsData(null);
    }
  } catch (err) {
    console.error('🔴 Exception in loadAnalyticsData:', err);
    setError(err.message);
    setAnalyticsData(null);
  } finally {
    setLoading(false);
  }
}, [dateParams]);
// Demo data fallback function
const getDemoData = () => ({
  metrics: {
    total_customers: 45892,
    total_revenue: 2400000,
    active_claims: 1247,
    avg_claim_time: 2.4,
    total_policies: 32845,
    total_commission: 456200,
    total_agents: 150,
    total_admins: 10
  },
  trends: {
    userGrowth: [
      { period: 'Jan', count: 4000 },
      { period: 'Feb', count: 3000 },
      { period: 'Mar', count: 2000 },
      { period: 'Apr', count: 2780 },
      { period: 'May', count: 1890 },
      { period: 'Jun', count: 2390 },
    ],
    revenueData: [
      { period: 'Jan', revenue: 2400 },
      { period: 'Feb', revenue: 1398 },
      { period: 'Mar', revenue: 9800 },
      { period: 'Apr', revenue: 3908 },
      { period: 'May', revenue: 4800 },
      { period: 'Jun', revenue: 3800 },
    ]
  },
  distribution: [
    { name: 'Basic Health Guard', value: 400 },
    { name: 'Premium Family Shield', value: 300 },
    { name: 'Senior Care Plus', value: 200 },
    { name: 'Critical Illness Protect', value: 100 },
  ],
  activity: [
    { description: 'New customer registration', user_name: 'John Smith', entity_type: 'customer', created_at: new Date().toISOString() },
    { description: 'Policy purchased', user_name: 'Sarah Johnson', entity_type: 'policy', created_at: new Date(Date.now() - 900000).toISOString() },
    { description: 'Claim submitted', user_name: 'Mike Chen', entity_type: 'claim', created_at: new Date(Date.now() - 1800000).toISOString() },
    { description: 'Agent commission paid', user_name: 'David Wilson', entity_type: 'agent', created_at: new Date(Date.now() - 2700000).toISOString() },
    { description: 'Payment received', user_name: 'Emma Brown', entity_type: 'payment', created_at: new Date(Date.now() - 3600000).toISOString() },
  ]
});


  // Fetch analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Memoized handleDateRangeChange
  const handleDateRangeChange = useCallback((newRange) => {
    setTimeRange(newRange.timeRange);
    setDateRange({
      startDate: new Date(newRange.startDate),
      endDate: new Date(newRange.endDate)
    });
  }, []);

  // Memoized formatting functions
  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '$0';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount >= 1000000) return `$${(numAmount / 1000000).toFixed(1)}M`;
    if (numAmount >= 1000) return `$${(numAmount / 1000).toFixed(1)}K`;
    return `$${numAmount.toFixed(0)}`;
  }, []);

  const formatNumber = useCallback((num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  }, []);

  // Prepare metrics for display
  const getMetrics = useCallback(() => {
    if (!analyticsData?.metrics) return [];
    
    const { metrics } = analyticsData;
    
    // Calculate percentage changes (for demo, you can replace with real calculations)
    const calculateChange = (value) => {
      const base = 1000; // Demo base value
      const change = ((value - base) / base * 100).toFixed(1);
      return {
        value: `${change > 0 ? '+' : ''}${change}%`,
        isPositive: change >= 0
      };
    };
    
    const custChange = calculateChange(metrics.total_customers || 0);
    const revChange = calculateChange(metrics.total_revenue || 0);
    const claimChange = calculateChange(metrics.active_claims || 0);
    const timeChange = { value: '-0.5%', isPositive: true }; // Static for demo
    const policyChange = calculateChange(metrics.total_policies || 0);
    const commChange = calculateChange(metrics.total_commission || 0);
    
    return [
      { 
        label: 'Total Customers', 
        value: formatNumber(metrics.total_customers || 0),
        change: custChange.value, 
        isPositive: custChange.isPositive, 
        icon: Users,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        description: 'Registered customers'
      },
      { 
        label: 'Total Revenue', 
        value: formatCurrency(metrics.total_revenue || 0), 
        change: revChange.value, 
        isPositive: revChange.isPositive, 
        icon: DollarSign,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        description: 'Total payments received'
      },
      { 
        label: 'Active Claims', 
        value: formatNumber(metrics.active_claims || 0), 
        change: claimChange.value, 
        isPositive: claimChange.isPositive, 
        icon: FileText,
        bgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        description: 'Pending claims'
      },
      { 
        label: 'Avg Claim Time', 
        value: `${(metrics.avg_claim_time || 0).toFixed(1)} days`, 
        change: timeChange.value, 
        isPositive: timeChange.isPositive, 
        icon: Clock,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
        description: 'Average processing time'
      },
      { 
        label: 'Total Policies', 
        value: formatNumber(metrics.total_policies || 0), 
        change: policyChange.value, 
        isPositive: policyChange.isPositive, 
        icon: Shield,
        bgColor: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        description: 'Active policies'
      },
      { 
        label: 'Total Commission', 
        value: formatCurrency(metrics.total_commission || 0), 
        change: commChange.value, 
        isPositive: commChange.isPositive, 
        icon: Percent,
        bgColor: 'bg-pink-100',
        iconColor: 'text-pink-600',
        description: 'Paid to agents'
      },
    ];
  }, [analyticsData, formatNumber, formatCurrency]);

  // Memoized loading state JSX
  const loadingContent = useMemo(() => (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics dashboard...</p>
        <p className="text-gray-500 text-sm mt-2">Fetching data from database...</p>
      </div>
    </div>
  ), []);

  // Memoized error state JSX - Only show when there's an error AND no data
const errorContent = useMemo(() => {
  // Don't show error if we have data
  if (analyticsData) return null;
  
  return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <p className="text-red-700 font-medium">Error Loading Analytics</p>
        </div>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <button 
          onClick={loadAnalyticsData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Retry Loading
        </button>
      </div>
    </div>
  );
}, [error, loadAnalyticsData, analyticsData]);
  // Add colors for pie chart
    const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

  // Main content
  const mainContent = useMemo(() => {

    if (loading) return loadingContent;
    
    return (
      <div className="p-4 md:p-8">
        {/* Header */}
<div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
    <p className="text-gray-600">Insurance platform performance metrics</p>
  </div>
  
  {/* Only show error if there's an error AND no data */}
  {error && !analyticsData && (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
      <p className="text-yellow-700 text-sm">⚠️ {error}</p>
    </div>
  )}
</div>

        {/* Date Range Picker */}
        <div className="mb-6">
          <DateRangePicker 
            onDateChange={handleDateRangeChange}
            defaultRange={timeRange}
          />
        </div>

        {/* Metrics Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
            <span className="text-sm text-gray-500">
              {analyticsData ? 'Real-time data' : 'Sample data'}
            </span>
          </div>
          <MetricsGrid metrics={getMetrics()} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Growth</h3>
            {analyticsData?.trends?.userGrowth && analyticsData.trends.userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.trends.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    formatter={(value) => [value, 'Customers']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.2}
                    name="Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No customer growth data available
              </div>
            )}
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
            {analyticsData?.trends?.revenueData && analyticsData.trends.revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.trends.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Plan Distribution</h3>
              <span className="text-sm text-gray-500">
                {analyticsData?.distribution?.length || 0} plans
              </span>
            </div>
            {analyticsData?.distribution && analyticsData.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analyticsData.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Policies']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <p>No policy distribution data</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <span className="text-sm text-gray-500">
                Last {analyticsData?.activity?.length || 0} activities
              </span>
            </div>
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
              {analyticsData?.activity && analyticsData.activity.length > 0 ? (
                analyticsData.activity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.entity_type === 'customer' ? 'bg-blue-500' :
                      activity.entity_type === 'policy' ? 'bg-green-500' :
                      activity.entity_type === 'claim' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 truncate">{activity.user_name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 capitalize">{activity.entity_type}</span>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {new Date(activity.created_at).toLocaleDateString()} •{' '}
                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p>No recent activity</p>
                  <p className="text-sm mt-1">Activities will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Last Updated & Status */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm">
          <div>
            Data last updated: {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real data: {analyticsData ? '✓' : '✗'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Time range: {timeRange}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    loading, error, loadingContent, 
    handleDateRangeChange, timeRange, getMetrics, errorContent,
    analyticsData, COLORS,formatCurrency,
  ]);

  return mainContent;
  
}

export default AnalyticsDashboard;