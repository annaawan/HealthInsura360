import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Package, 
  Settings, 
  LogOut,
  Shield,
  Menu,
  Bell,
  DollarSign,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Mail,
  Phone,
  Edit,
  Trash2,
  User,
  Lock,
  CreditCard,
  Save
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Dashboard Overview Component
function DashboardOverview() {
  const stats = [
    {
      label: 'Total Members',
      value: '524,892',
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
  ];

  const monthlyData = [
    { month: 'Jan', members: 480000, revenue: 2100000 },
    { month: 'Feb', members: 485000, revenue: 2150000 },
    { month: 'Mar', members: 492000, revenue: 2200000 },
    { month: 'Apr', members: 498000, revenue: 2250000 },
    { month: 'May', members: 510000, revenue: 2300000 },
    { month: 'Jun', members: 524892, revenue: 2400000 }
  ];

  const claimsData = [
    { status: 'Approved', value: 856, color: '#10b981' },
    { status: 'Pending', value: 247, color: '#f59e0b' },
    { status: 'Rejected', value: 144, color: '#ef4444' }
  ];

  const planDistribution = [
    { name: 'Basic', members: 210000 },
    { name: 'Standard', members: 245000 },
    { name: 'Premium', members: 69892 }
  ];

  const recentActivities = [
    { id: 1, action: 'New member registered', user: 'John Smith', time: '5 minutes ago' },
    { id: 2, action: 'Claim approved', user: 'Sarah Johnson', time: '12 minutes ago' },
    { id: 3, action: 'Plan upgraded', user: 'Mike Chen', time: '28 minutes ago' },
    { id: 4, action: 'Payment received', user: 'Emily Davis', time: '1 hour ago' },
    { id: 5, action: 'New claim submitted', user: 'Robert Wilson', time: '2 hours ago' }
  ];

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
        {/* Member Growth Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="members" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Members"
              />
            </LineChart>
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
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claims Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={claimsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, value }) => `${status}: ${value}`}
                outerRadius={80}
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

        {/* Plan Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          <div className="space-y-4">
            {planDistribution.map((plan, index) => {
              const total = planDistribution.reduce((sum, p) => sum + p.members, 0);
              const percentage = ((plan.members / total) * 100).toFixed(1);
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700">{plan.name}</span>
                    <span className="text-gray-900 font-semibold">{plan.members.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-gray-600 text-sm mt-1">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
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

// Members Management Component
function MembersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const mockMembers = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      plan: 'Premium',
      status: 'Active',
      joinDate: '2024-01-15',
      nextPayment: '2024-12-15'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 234-5678',
      plan: 'Standard',
      status: 'Active',
      joinDate: '2024-02-20',
      nextPayment: '2024-12-20'
    },
    {
      id: '3',
      name: 'Michael Chen',
      email: 'mchen@email.com',
      phone: '(555) 345-6789',
      plan: 'Basic',
      status: 'Active',
      joinDate: '2024-03-10',
      nextPayment: '2024-12-10'
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@email.com',
      phone: '(555) 456-7890',
      plan: 'Premium',
      status: 'Pending',
      joinDate: '2024-11-28',
      nextPayment: '2024-12-28'
    },
    {
      id: '5',
      name: 'Robert Wilson',
      email: 'r.wilson@email.com',
      phone: '(555) 567-8901',
      plan: 'Standard',
      status: 'Inactive',
      joinDate: '2023-06-15',
      nextPayment: '-'
    }
  ];

  const filteredMembers = mockMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || member.status.toLowerCase() === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Members Management</h1>
          <p className="text-gray-600">Manage and view all members</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          Add Member
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-5 w-5 text-gray-600" />
            <span className="text-gray-700">Export</span>
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Member</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Contact</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Plan</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Join Date</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Next Payment</th>
                <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="text-gray-900 font-medium">{member.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{member.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{member.plan}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(member.joinDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {member.nextPayment !== '-' ? new Date(member.nextPayment).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="text-gray-600">
            Showing {filteredMembers.length} of {mockMembers.length} members
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
              Previous
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              1
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
              2
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Plans Management Component
function PlansManagement() {
  const plans = [
    {
      id: 1,
      name: 'Basic',
      price: 99,
      subscribers: 210000,
      description: 'Essential coverage for individuals',
      features: ['Primary care visits', 'Emergency services', 'Preventive care', 'Generic prescriptions', 'Telemedicine access']
    },
    {
      id: 2,
      name: 'Standard',
      price: 199,
      subscribers: 245000,
      description: 'Comprehensive coverage for families',
      features: ['All Basic features', 'Specialist visits', 'Dental & vision care', 'Mental health services', 'Brand prescriptions', 'Maternity care']
    },
    {
      id: 3,
      name: 'Premium',
      price: 299,
      subscribers: 69892,
      description: 'Complete protection with extras',
      features: ['All Standard features', 'No deductibles', 'International coverage', 'Alternative medicine', 'Premium hospital rooms', 'Wellness programs']
    }
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plans Management</h1>
          <p className="text-gray-600">Manage insurance plans and pricing</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          Add New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Plan Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-blue-100 mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-blue-100">/month</span>
              </div>
            </div>

            {/* Plan Content */}
            <div className="p-6">
              {/* Subscribers */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">Subscribers:</span>
                <span className="text-gray-900 font-semibold">{plan.subscribers.toLocaleString()}</span>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <div className="text-gray-700 font-medium">Features:</div>
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  View Details
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Analytics
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 mb-2">Total Subscribers</div>
          <div className="text-2xl font-bold text-gray-900">
            {plans.reduce((sum, plan) => sum + plan.subscribers, 0).toLocaleString()}
          </div>
          <div className="text-green-600 text-sm mt-2">+12.5% from last month</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 mb-2">Monthly Revenue</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(plans.reduce((sum, plan) => sum + (plan.price * plan.subscribers), 0) / 1000000).toFixed(1)}M
          </div>
          <div className="text-green-600 text-sm mt-2">+8.2% from last month</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 mb-2">Active Plans</div>
          <div className="text-2xl font-bold text-gray-900">{plans.length}</div>
          <div className="text-gray-600 text-sm mt-2">All plans active</div>
        </div>
      </div>
    </div>
  );
}

// Claims Management Component (Placeholder)
function ClaimsManagement() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Claims Management</h1>
          <p className="text-gray-600">Review and manage insurance claims</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5" />
          New Claim
        </button>
      </div>
      
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Claims Management</h3>
        <p className="text-gray-600">Claims management interface will be implemented here</p>
      </div>
    </div>
  );
}

// Settings Panel Component
function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ];

  const ProfileSettings = () => (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              defaultValue="Admin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              defaultValue="User"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Email Address</label>
          <input
            type="email"
            defaultValue="admin@healthinsura360.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            defaultValue="(555) 123-4567"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Role</label>
          <input
            type="text"
            defaultValue="System Administrator"
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>

        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="h-5 w-5" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const NotificationSettings = () => (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-gray-900 font-medium mb-4">Email Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">New member registrations</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">New claims submitted</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Payment confirmations</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">System alerts</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-gray-900 font-medium mb-4">Push Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Urgent claims requiring attention</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Daily summary reports</span>
            </label>
          </div>
        </div>

        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="h-5 w-5" />
          Save Preferences
        </button>
      </div>
    </div>
  );

  const SecuritySettings = () => (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-gray-900 font-medium mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-gray-900 font-medium mb-4">Two-Factor Authentication</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-gray-900">Enable 2FA</div>
              <div className="text-gray-600">Add an extra layer of security to your account</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="h-5 w-5" />
          Update Security
        </button>
      </div>
    </div>
  );

  const BillingSettings = () => (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing Information</h2>
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-900 mb-1">Current Plan</div>
          <div className="text-blue-600">Enterprise - $499/month</div>
        </div>

        <div>
          <h3 className="text-gray-900 font-medium mb-4">Payment Method</h3>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white">
                  VISA
                </div>
                <div>
                  <div className="text-gray-900">•••• •••• •••• 4242</div>
                  <div className="text-gray-600">Expires 12/25</div>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700">Edit</button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-gray-900 font-medium mb-4">Billing Address</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                defaultValue="123 Healthcare Blvd"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  defaultValue="New York"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  defaultValue="10001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="h-5 w-5" />
          Save Billing Info
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'billing' && <BillingSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Sidebar Component
function DashboardSidebar({ 
  currentView, 
  onViewChange, 
  isOpen, 
  onToggle,
  onLogout 
}) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'claims', label: 'Claims', icon: FileText },
    { id: 'plans', label: 'Plans', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-blue-900 text-white transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-800">
          <div className={`flex items-center gap-2 ${!isOpen && 'justify-center'}`}>
            <Shield className="h-8 w-8 text-white flex-shrink-0" />
            {isOpen && <span className="font-semibold">HealthInsura360</span>}
          </div>
          <button
            onClick={onToggle}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-800'
                    } ${!isOpen && 'justify-center'}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-blue-800">
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 transition-colors ${
              !isOpen && 'justify-center'
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

// Main Admin Dashboard Component
export function AdminDashboard({ onLogout }) {
  const [currentView, setCurrentView] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview />;
      case 'members':
        return <MembersManagement />;
      case 'claims':
        return <ClaimsManagement />;
      case 'plans':
        return <PlansManagement />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={onLogout}
      />
      
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {renderView()}
      </div>
    </div>
  );
}

export default AdminDashboard;