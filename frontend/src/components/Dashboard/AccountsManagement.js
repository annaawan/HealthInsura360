import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, User, Briefcase, Building, Mail, Edit, Trash2, 
  AlertCircle, Search, RefreshCw, XCircle, Save, Eye,
  CheckCircle, Clock, ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import auditLogger from '../../utils/auditLogger';

function AccountsManagement() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'customer',
    status: 'active'
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/users');
      setAccounts(response.data.users || []);
      setError(null);
    } catch (err) {
      setError('Failed to load accounts: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userName, userRole) => {
    if (!window.confirm(`Are you sure you want to delete ${userName || 'this account'}?`)) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}`);
      setAccounts(accounts.filter(acc => acc.id !== userId));
      
      if (auditLogger && typeof auditLogger.log === 'function') {
        await auditLogger.log('DELETE', userRole?.toUpperCase() || 'USER', userId, { 
          name: userName,
          email: accounts.find(acc => acc.id === userId)?.email 
        });
      } else {
        console.log('Audit log skipped: Account deleted', { userId, userName });
      }
    } catch (err) {
      setError('Failed to delete account: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const handleAddEdit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/users/${editingId}`, formData);
        
        if (auditLogger && typeof auditLogger.log === 'function') {
          await auditLogger.log('UPDATE', formData.role?.toUpperCase() || 'USER', editingId, formData);
        } else {
          console.log('Audit log skipped: Account updated', { editingId, formData });
        }
      } else {
        const response = await axios.post('http://localhost:5000/api/users', formData);
        const newUserId = response.data.user?.id || response.data.id;
        
        if (auditLogger && typeof auditLogger.log === 'function') {
          await auditLogger.log('CREATE', formData.role?.toUpperCase() || 'USER', newUserId, formData);
        } else {
          console.log('Audit log skipped: Account created', { formData });
        }
      }
      setShowModal(false);
      setFormData({ name: '', email: '', role: 'customer', status: 'active' });
      setEditingId(null);
      fetchAccounts();
    } catch (err) {
      setError('Failed to save account: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const handleEdit = (account) => {
    setFormData({
      name: account.name || '',
      email: account.email || '',
      role: account.role || 'customer',
      status: account.status || 'active'
    });
    setEditingId(account.id);
    setShowModal(true);
  };

  const navigateToAppropriateTab = (account) => {
    if (account.role === 'hospital') {
      navigate('/admin/hospitals');
    } else if (account.role === 'agent') {
      navigate('/admin/agents');
    } else if (account.role === 'customer') {
      navigate('/admin/customers');
    }
  };

  // Apply filters
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          account.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || account.role === filterRole;
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Briefcase size={18} className="text-purple-400 mr-2" />;
      case 'agent': return <User size={18} className="text-blue-400 mr-2" />;
      case 'hospital': return <Building size={18} className="text-green-400 mr-2" />;
      default: return <User size={18} className="text-gray-400 mr-2" />;
    }
  };

  const getStatusBadge = (status, role) => {
    if (status === 'pending' && (role === 'hospital' || role === 'agent')) {
      return (
        <div className="flex items-center gap-2">
          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
          <span className="text-xs text-yellow-600 flex items-center">
            <Clock size={12} className="mr-1" />
            Awaiting verification
          </span>
        </div>
      );
    }
    
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
        status === 'active' ? 'bg-green-100 text-green-800' : 
        status === 'inactive' ? 'bg-gray-100 text-gray-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {status || 'active'}
      </span>
    );
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Accounts Management</h2>
          <p className="text-gray-600 mt-1">View all accounts in the system</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', email: '', role: 'customer', status: 'active' });
            setShowModal(true);
          }}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" /> Add Account
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Verification Notice</p>
            <p className="text-blue-600 text-sm">
              Account verification is handled in dedicated tabs. Use the buttons below to navigate:
            </p>
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => navigate('/admin/hospitals')}
                className="text-sm bg-white px-3 py-1 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Hospital Network →
              </button>
              <button 
                onClick={() => navigate('/admin/agents')}
                className="text-sm bg-white px-3 py-1 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Agents →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertCircle size={20} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={20} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="customer">Customer</option>
            <option value="hospital">Hospital</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={fetchAccounts}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <User size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No accounts found</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={`${account.role}-${account.id}`} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getRoleIcon(account.role)}
                        <span className="font-medium">{account.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Mail size={16} className="text-gray-400 mr-2" />
                        <a href={`mailto:${account.email}`} className="text-blue-600 hover:text-blue-800">
                          {account.email}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        account.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        account.role === 'agent' ? 'bg-blue-100 text-blue-800' :
                        account.role === 'hospital' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {account.role || 'customer'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(account.status, account.role)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-3">
                        {/* View Details Button - shows for all */}
                        <button
                          onClick={() => navigateToAppropriateTab(account)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                          title={`View in ${account.role} section`}
                        >
                          <Eye size={18} />
                        </button>
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(account)}
                          className="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-50 transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(account.id, account.name, account.role)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>

                        {/* Quick approve button - only for pending hospitals/agents */}
                        {account.status === 'pending' && (account.role === 'hospital' || account.role === 'agent') && (
                          <button
                            onClick={() => navigateToAppropriateTab(account)}
                            className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50 transition-colors"
                            title={`Go to ${account.role} section to approve`}
                          >
                            <ArrowRight size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Table Footer with Count */}
            <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
              Showing {filteredAccounts.length} of {accounts.length} accounts
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Edit Account' : 'Add New Account'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleAddEdit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="customer">Customer</option>
                  <option value="agent">Agent</option>
                  <option value="hospital">Hospital</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={18} className="mr-2" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsManagement;