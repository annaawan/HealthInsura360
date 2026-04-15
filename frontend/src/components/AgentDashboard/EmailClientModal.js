// frontend/src/components/AgentDashboard/EmailClientModal.js
import { useState } from 'react';
import axios from 'axios';
import { X, Send, Mail } from 'lucide-react';
import { API_BASE_URL, getAxiosConfig } from '../../config';

export function EmailClientModal({ isOpen, onClose, client, onEmailSent }) {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    includePolicyDetails: false,
    includePaymentInfo: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const config = getAxiosConfig();
      const response = await axios.post(`${API_BASE_URL}/agent/clients/${client.client_id}/email`, formData, config);
      
      setSuccess({
        message: response.data.message,
        clientEmail: client.email
      });
      
      if (onEmailSent) onEmailSent();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(null);
        setFormData({
          subject: '',
          message: '',
          includePolicyDetails: false,
          includePaymentInfo: false
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error sending email:', error);
      setError(error.response?.data?.message || 'Error sending email. Please try again.');
      setLoading(false);
    }
  };

  const getEmailTemplates = () => {
    const templates = {
      policyReminder: {
        subject: `Policy Renewal Reminder - ${client.plan_name || 'Your Policy'}`,
        message: `Dear ${client.first_name},\n\nThis is a reminder that your insurance policy is due for renewal soon. Please contact us to discuss renewal options.\n\nBest regards,\nYour Agent`
      },
      paymentReminder: {
        subject: 'Payment Due Reminder',
        message: `Dear ${client.first_name},\n\nThis is a friendly reminder that your insurance premium payment is due. Please ensure timely payment to avoid policy lapse.\n\nBest regards,\nYour Agent`
      },
      welcomeMessage: {
        subject: 'Welcome to Our Insurance Family!',
        message: `Dear ${client.first_name},\n\nThank you for choosing us for your insurance needs. We're here to help you protect what matters most.\n\nBest regards,\nYour Agent`
      },
      claimUpdate: {
        subject: 'Claim Status Update',
        message: `Dear ${client.first_name},\n\nWe wanted to provide you with an update on your recent claim. Our team is processing it and we'll keep you informed.\n\nBest regards,\nYour Agent`
      }
    };
    return templates;
  };

  const applyTemplate = (templateKey) => {
    const templates = getEmailTemplates();
    const template = templates[templateKey];
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject,
        message: template.message
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Send Email to {client.first_name} {client.last_name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">{success.message}</p>
              <p className="text-sm text-green-700 mt-2">
                Email sent to {success.clientEmail}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Quick Templates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('policyReminder')}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                >
                  Policy Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('paymentReminder')}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                >
                  Payment Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('welcomeMessage')}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                >
                  Welcome Message
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('claimUpdate')}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                >
                  Claim Update
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                name="subject"
                required
                value={formData.subject}
                onChange={handleChange}
                placeholder="Email subject"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                name="message"
                required
                rows="8"
                value={formData.message}
                onChange={handleChange}
                placeholder="Type your message here..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 resize-none"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="includePolicyDetails"
                  checked={formData.includePolicyDetails}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                />
                <span className="text-sm text-gray-700">Include policy details (if applicable)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="includePaymentInfo"
                  checked={formData.includePaymentInfo}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                />
                <span className="text-sm text-gray-700">Include payment information</span>
              </label>
            </div>

            {/* Client Info Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-700 mb-1">Client Information:</p>
              <p className="text-gray-600">📧 {client.email}</p>
              <p className="text-gray-600">📞 {client.phone || 'No phone'}</p>
              <p className="text-gray-600">📋 {client.plan_name || 'No active policy'}</p>
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
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}