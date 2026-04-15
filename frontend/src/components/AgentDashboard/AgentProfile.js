// frontend/src/components/agent/AgentProfile.js
import { useState } from 'react';
import { Save, Mail, Phone, MapPin, Award, Briefcase, Calendar, DollarSign, Users, AlertCircle , TrendingUp} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from '../../config';

export function AgentProfile({ agent, onUpdate }) {
  const [formData, setFormData] = useState({
    first_name: agent?.firstName || agent?.first_name || '',
    last_name: agent?.lastName || agent?.last_name || '',
    phone: agent?.phone || '',
    street: agent?.street || '',
    city: agent?.city || '',
    zipcode: agent?.zipcode || ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

  // Validation functions
  const validateForm = () => {
    const newErrors = {};
    
    // First Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    } else if (formData.first_name.length > 50) {
      newErrors.first_name = 'First name must be less than 50 characters';
    }
    
    // Last Name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters';
    } else if (formData.last_name.length > 50) {
      newErrors.last_name = 'Last name must be less than 50 characters';
    }
    
    // Phone validation (optional but if provided, must be valid)
    if (formData.phone && !/^[\d\s\-+()]{10,20}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Street validation
    if (formData.street && formData.street.length > 100) {
      newErrors.street = 'Street address must be less than 100 characters';
    }
    
    // City validation
    if (formData.city && formData.city.length > 50) {
      newErrors.city = 'City name must be less than 50 characters';
    }
    
    // Zipcode validation (US format)
    if (formData.zipcode && !/^\d{5}(-\d{4})?$/.test(formData.zipcode)) {
      newErrors.zipcode = 'Please enter a valid zip code (5 digits or 5+4 format)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors before submitting.' });
      return;
    }
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const config = getAxiosConfig();
      const response = await axios.put(`${API_BASE_URL}/agent/profile`, formData, config);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        if (onUpdate) onUpdate();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Error updating profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error updating profile. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const firstName = agent?.firstName || agent?.first_name || '';
    const lastName = agent?.lastName || agent?.last_name || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return 'AG';
  };

  const getFullName = () => {
    const firstName = agent?.firstName || agent?.first_name || '';
    const lastName = agent?.lastName || agent?.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Agent';
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Profile</h1>
        <p className="text-gray-600">Manage your profile information and credentials</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Save className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <span className="text-3xl font-bold text-white">{getInitials()}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {getFullName()}
              </h3>
              <div className="text-gray-600 mb-1">{agent?.email}</div>
              <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Licensed Insurance Agent
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Performance
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Total Clients</span>
                </div>
                <span className="font-semibold text-gray-900">{agent?.totalSales || agent?.total_sales || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Commission Rate</span>
                </div>
                <span className="font-semibold text-gray-900">{agent?.commissionRate || agent?.commission_rate || 0}%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">License Number</span>
                </div>
                <span className="font-semibold text-gray-900 font-mono text-sm">{agent?.licenseNumber || agent?.license_number || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Member Since</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {agent?.createdAt || agent?.created_at ? new Date(agent.createdAt || agent.created_at).getFullYear() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors ${
                      errors.first_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors ${
                      errors.last_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={agent?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email address cannot be changed</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Office Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="Street Address"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors mb-4 ${
                      errors.street ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.street && (
                    <p className="text-red-500 text-xs mt-1">{errors.street}</p>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.city && (
                      <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value="NY"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500"
                      disabled
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleChange}
                      placeholder="ZIP Code"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors ${
                        errors.zipcode ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.zipcode && (
                      <p className="text-red-500 text-xs mt-1">{errors.zipcode}</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* License & Credentials */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">License & Credentials</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Insurance License</div>
                  <div className="text-gray-600 text-sm">License #: <span className="font-mono">{agent?.licenseNumber || agent?.license_number || 'N/A'}</span></div>
                  <div className="text-gray-600 text-sm">Status: <span className="text-green-600 font-medium">Active</span></div>
                  <div className="text-gray-600 text-sm">Issued: {formatDate(agent?.createdAt || agent?.created_at)}</div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Agent ID</div>
                  <div className="text-gray-600 text-sm">ID: <span className="font-mono">{agent?.id || agent?.agent_id || 'N/A'}</span></div>
                  <div className="text-gray-600 text-sm">
                    Member Since: {formatDate(agent?.createdAt || agent?.created_at)}
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Verified</span>
              </div>

              {/* Additional Info */}
              {agent?.dateOfBirth && (
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">Date of Birth</div>
                    <div className="text-gray-600 text-sm">{formatDate(agent.dateOfBirth)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}