import React, { useState } from 'react';
import { Users, DollarSign, FileText, TrendingUp, ArrowUp, ArrowDown, Bell, ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell } from 'lucide-react';

// Currency formatter
const formatCurrency = (amount) => {
  if (!amount) return 'Rs. 0';
  return `Rs. ${Math.floor(amount).toLocaleString('en-PK')}`;
};

function DashboardOverview() {
  const [stats] = useState([
    { label: 'Total Members', value: '45,892', change: '+12.5%', isPositive: true, icon: Users, color: 'bg-blue-500' },
    { label: 'Monthly Revenue', value: 'Rs. 2.4M', change: '+8.2%', isPositive: true, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Active Claims', value: '1,247', change: '-3.1%', isPositive: false, icon: FileText, color: 'bg-orange-500' },
    { label: 'Growth Rate', value: '18.3%', change: '+2.4%', isPositive: true, icon: TrendingUp, color: 'bg-purple-500' }
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
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className={`text-sm mt-2 ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.isPositive ? <ArrowUp className="inline mr-1" size={16} /> : <ArrowDown className="inline mr-1" size={16} />}
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg text-white`}>
                  <IconComponent size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Data Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">Month</th>
                  <th className="px-4 py-2 text-left text-gray-600">Users</th>
                  <th className="px-4 py-2 text-left text-gray-600">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 text-gray-700">{data.month}</td>
                    <td className="px-4 py-2 text-gray-700">{data.users.toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-700">Rs. {(data.revenue / 1000000).toFixed(1)}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Claims Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Claims Status</h3>
          <div className="space-y-4">
            {claimsData.map((claim, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3" 
                    style={{ backgroundColor: claim.color }}
                  ></div>
                  <span className="text-gray-700 text-sm">{claim.status}</span>
                </div>
                <span className="font-semibold text-gray-800">{claim.value}</span>
              </div>
            ))}
            <div className="pt-4 border-t">
              <p className="text-gray-600 text-sm">Total Claims: {claimsData.reduce((sum, c) => sum + c.value, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activities</h3>
          <Bell size={20} className="text-gray-500" />
        </div>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start p-3 bg-gray-50 rounded">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-gray-800 text-sm"><span className="font-semibold">{activity.action}</span></p>
                <p className="text-gray-500 text-xs mt-1">{activity.user} • {activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;
