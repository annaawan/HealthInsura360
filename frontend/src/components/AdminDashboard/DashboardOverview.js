import React, { useState} from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
// Icons from lucide-react
import { 
 
  Users, 
  FileText, 
  Bell,
  DollarSign,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  
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


// Dashboard Overview Component
function DashboardOverview() {
  const [stats] = useState([
    {
      label: 'Total Members',
      value: '45,892',
      change: '+12.5%',
      isPositive: true,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      label: 'Monthly Revenue',
      value: '$2.4M',
      change: '+8.2%',
      isPositive: true,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      label: 'Active Claims',
      value: '1,247',
      change: '-3.1%',
      isPositive: false,
      icon: FileText,
      color: 'bg-orange-500'
    },
    {
      label: 'Growth Rate',
      value: '18.3%',
      change: '+2.4%',
      isPositive: true,
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ]);

  const [monthlyData] = useState([
    { month: 'Jan', users: 40000, revenue: 2100000 },
    { month: 'Feb', users: 42000, revenue: 2150000 },
    { month: 'Mar', users: 43500, revenue: 2200000 },
    { month: 'Apr', users: 45000, revenue: 2250000 },
    { month: 'May', users: 46000, revenue: 2300000 },
    { month: 'Jun', users: 45892, revenue: 2400000 }
  ]);

  const [claimsData] = useState([
    { status: 'Approved', value: 856, color: '#10b981' },
    { status: 'Pending', value: 247, color: '#f59e0b' },
    { status: 'Rejected', value: 144, color: '#ef4444' }
  ]);

  const [recentActivities] = useState([
    { id: 1, action: 'New user registered', user: 'John Smith', time: '5 minutes ago' },
    { id: 2, action: 'Claim approved', user: 'Sarah Johnson', time: '12 minutes ago' },
    { id: 3, action: 'Agent commission paid', user: 'David Wilson', time: '28 minutes ago' },
    { id: 4, action: 'Hospital verified', user: 'City General', time: '1 hour ago' },
    { id: 5, action: 'New complaint received', user: 'Mike Chen', time: '2 hours ago' }
  ]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back, Admin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="text-gray-700">Notifications</span>
          <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">5</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.isPositive ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                  <span className="text-sm">{stat.change}</span>
                </div>
              </div>
              <div className="text-gray-600 text-sm mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claims Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims Status</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={claimsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, value }) => `${status}: ${value}`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {claimsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">{activity.action}</p>
                  <p className="text-gray-600 text-sm">{activity.user}</p>
                  <p className="text-gray-500 text-xs">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default DashboardOverview;
