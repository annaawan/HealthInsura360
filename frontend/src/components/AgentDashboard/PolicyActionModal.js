// frontend/src/components/AgentDashboard/PolicyActionModal.js
import { useState, useEffect } from 'react';
import { X, Shield, Calendar } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from '../../config';

export function PolicyActionModal({ isOpen, onClose, client, actionType, existingPolicy, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    policy_type: '',
    sum_insured: '',
    premium_amount: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (actionType === 'renew' && existingPolicy) {
        // Pre-fill form with existing policy data for renewal
        const today = new Date();
        const oneYearLater = new Date(today);
        oneYearLater.setFullYear(today.getFullYear() + 1);
        
        setFormData({
          policy_type: existingPolicy.policy_type,
          sum_insured: existingPolicy.sum_insured,
          premium_amount: existingPolicy.premium_amount,
          start_date: today.toISOString().split('T')[0],
          end_date: oneYearLater.toISOString().split('T')[0],
        });
      } else {
        // Reset form for add policy
        const today = new Date();
        const oneYearLater = new Date(today);
        oneYearLater.setFullYear(today.getFullYear() + 1);
        
        setFormData({
          policy_type: '',
          sum_insured: '',
          premium_amount: '',
          start_date: today.toISOString().split('T')[0],
          end_date: oneYearLater.toISOString().split('T')[0],
        });
      }
      setError('');
    }
  }, [isOpen, actionType, existingPolicy]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For number fields, validate input
    if (name === 'sum_insured' || name === 'premium_amount') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Auto-calculate end date when start date changes (for new policies)
    if (name === 'start_date' && actionType === 'add') {
      const startDate = new Date(value);
      const endDate = new Date(startDate);
      endDate.setFullYear(startDate.getFullYear() + 1);
      setFormData(prev => ({
        ...prev,
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
    
    setError('');
  };

  const validateForm = () => {
    if (!formData.policy_type.trim()) {
      setError('Policy type is required');
      return false;
    }
    
    const sumInsured = parseFloat(formData.sum_insured);
    if (isNaN(sumInsured) || sumInsured <= 0) {
      setError('Please enter a valid sum insured amount (greater than 0)');
      return false;
    }
    
    const premium = parseFloat(formData.premium_amount);
    if (isNaN(premium) || premium <= 0) {
      setError('Please enter a valid premium amount (greater than 0)');
      return false;
    }
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      setError('Start date cannot be in the past');
      return false;
    }
    
    if (endDate <= startDate) {
      setError('End date must be after start date');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const config = getAxiosConfig();
      let response;

      if (actionType === 'add') {
        response = await axios.post(`${API_BASE_URL}/agent/clients/${client.client_id}/policies`, formData, config);
      } else if (actionType === 'renew') {
        response = await axios.post(`${API_BASE_URL}/agent/policies/${existingPolicy.policy_id}/renew`, formData, config);
      }

      setSuccess({
        message: response.data.message,
      });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing policy action:', error);
      setError(error.response?.data?.message || 'Error processing request');
    } finally {
      setLoading(false);
    }
  };

  const getActionTitle = () => {
    return actionType === 'add' ? 'Add New Policy' : 'Renew Policy';
  };

  const getActionButtonText = () => {
    return actionType === 'add' ? 'Add Policy' : 'Renew Policy';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div>
            <h2 className="text-xl font-semibold">{getActionTitle()}</h2>
            <p className="text-purple-100 text-sm mt-1">
              {client?.first_name} {client?.last_name}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:text-purple-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">{success.message}</p>
              <p className="text-sm text-green-700 mt-2">Policy has been successfully processed.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Current Policy Info (for renew) */}
            {actionType === 'renew' && existingPolicy && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Current Policy Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700">Type:</span>
                    <span className="ml-2 text-blue-900">{existingPolicy.policy_type}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Premium:</span>
                    <span className="ml-2 text-blue-900">${existingPolicy.premium_amount}/mo</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Sum Insured:</span>
                    <span className="ml-2 text-blue-900">${existingPolicy.sum_insured?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Expiry Date:</span>
                    <span className="ml-2 text-blue-900">{new Date(existingPolicy.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Renew Info Box */}
            {actionType === 'renew' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">Policy Renewal</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Renewing this policy will extend the coverage for another year.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Policy Type *
              </label>
              <input
                type="text"
                name="policy_type"
                required
                value={formData.policy_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., Health Insurance"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sum Insured ($) *
                </label>
                <input
                  type="text"
                  name="sum_insured"
                  required
                  value={formData.sum_insured}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                  placeholder="e.g., 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Premium Amount ($/month) *
                </label>
                <input
                  type="text"
                  name="premium_amount"
                  required
                  value={formData.premium_amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                  placeholder="e.g., 299"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            {/* Policy Term Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p>📅 Policy term: {new Date(formData.start_date).toLocaleDateString()} to {new Date(formData.end_date).toLocaleDateString()}</p>
              <p className="mt-1">💰 Total annual premium: ${(parseFloat(formData.premium_amount) * 12).toLocaleString()}</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : getActionButtonText()}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}