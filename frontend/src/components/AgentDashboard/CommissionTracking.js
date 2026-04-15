// frontend/src/components/AgentDashboard/CommissionTracking.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Eye, FileText, Calendar, DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL, getAxiosConfig } from '../../config';

// Fix: Import jspdf and autotable correctly
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function CommissionTracking({ agentId }) {
  const [activeTab, setActiveTab] = useState('list'); // list, upcoming, monthly
  const [summary, setSummary] = useState({ 
    total_earned: 0, 
    pending_commission: 0,
    this_month_earned: 0,
    pending_count: 0,
    paid_count: 0,
    last_payment_date: null,
    last_payment_amount: 0
  });
  const [commissions, setCommissions] = useState([]);
  const [upcomingCommissions, setUpcomingCommissions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const fetchCommissionData = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      
      // Fetch summary
      const summaryRes = await axios.get(`${API_BASE_URL}/agent/commissions/summary`, config);
      setSummary(summaryRes.data.summary);

      // Fetch commission list
      const listRes = await axios.get(`${API_BASE_URL}/agent/commissions/list`, config);
      setCommissions(listRes.data.commissions);

      // Fetch upcoming commissions
      const upcomingRes = await axios.get(`${API_BASE_URL}/agent/commissions/upcoming`, config);
      setUpcomingCommissions(upcomingRes.data.upcoming);

      // Fetch monthly breakdown
      const monthlyRes = await axios.get(`${API_BASE_URL}/agent/commissions/monthly`, config);
      setMonthlyData(monthlyRes.data.monthlyData);

    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" /> Paid</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Pending</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> Cancelled</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const exportToPDF = () => {
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Commission Report', 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
      doc.text(`Total Earned: $${summary.total_earned?.toLocaleString() || 0}`, 14, 42);
      doc.text(`Pending Commission: $${summary.pending_commission?.toLocaleString() || 0}`, 14, 50);
      
      // Prepare table data
      const tableData = commissions.map(comm => [
        comm.commission_id || 'N/A',
        comm.policy_type || 'N/A',
        `$${comm.premium_amount || 0}`,
        `${comm.rate || 0}%`,
        `$${comm.amount || 0}`,
        comm.status || 'N/A',
        comm.created_at ? new Date(comm.created_at).toLocaleDateString() : 'N/A',
        comm.paid_at ? new Date(comm.paid_at).toLocaleDateString() : '-',
        comm.payment_reference || '-'
      ]);
      
      // Add table using autoTable
      autoTable(doc, {
        startY: 60,
        head: [['ID', 'Policy Type', 'Premium', 'Rate', 'Commission', 'Status', 'Created', 'Paid Date', 'Reference']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 30 }
        }
      });
      
      // Save PDF
      doc.save(`commission_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const ViewDetailsModal = ({ commission, onClose }) => {
    if (!commission) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <h2 className="text-xl font-semibold">Commission Details</h2>
            <button onClick={onClose} className="text-white hover:text-purple-200">✕</button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Commission ID</label>
                <p className="font-semibold text-gray-900">#{commission.commission_id}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Status</label>
                <div>{getStatusBadge(commission.status)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Policy Type</label>
                <p className="font-semibold text-gray-900">{commission.policy_type || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Policy ID</label>
                <p className="font-semibold text-gray-900">#{commission.policy_id}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Premium Amount</label>
                <p className="font-semibold text-gray-900">${commission.premium_amount}/month</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Commission Rate</label>
                <p className="font-semibold text-gray-900">{commission.rate}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Commission Amount</label>
                <p className="font-semibold text-green-600 text-lg">${commission.amount}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 uppercase">Created Date</label>
                <p className="text-gray-900">{new Date(commission.created_at).toLocaleDateString()}</p>
              </div>
              {commission.paid_at && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs text-gray-500 uppercase">Paid Date</label>
                    <p className="text-gray-900">{new Date(commission.paid_at).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs text-gray-500 uppercase">Payment Reference</label>
                    <p className="text-gray-900 font-mono text-sm">{commission.payment_reference || 'N/A'}</p>
                  </div>
                </>
              )}
              {commission.is_renewal && (
                <div className="bg-blue-50 rounded-lg p-3 col-span-2">
                  <label className="text-xs text-blue-600 uppercase">Renewal Commission</label>
                  <p className="text-blue-800">This is a renewal commission for year {commission.renewal_year}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading commission data...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Commission Tracking</h1>
        <p className="text-gray-600">Monitor your earnings and commission structure</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Total Earned</span>
          </div>
          <div className="text-2xl font-bold text-green-600">${summary.total_earned?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-600">Pending Commission</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">${summary.pending_commission?.toLocaleString() || 0}</div>
          <div className="text-xs text-gray-500 mt-1">{summary.pending_count || 0} pending payments</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">This Month</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">${summary.this_month_earned?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Last Payment</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {summary.last_payment_date ? new Date(summary.last_payment_date).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">${summary.last_payment_amount?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Commission List
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Upcoming Commissions
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Monthly Breakdown
        </button>
      </div>

      {/* Tab Content: Commission List */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Commission History</h2>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Policy ID / Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Premium Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Commission Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Commission Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Paid Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Ref</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      No commission records found
                    </td>
                  </tr>
                ) : (
                  commissions.map((comm) => (
                    <tr key={comm.commission_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">#{comm.policy_id}</div>
                        <div className="text-sm text-gray-500">{comm.policy_type || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">${comm.premium_amount}</td>
                      <td className="px-6 py-4 text-gray-900">{comm.rate}%</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">${comm.amount}</td>
                      <td className="px-6 py-4">{getStatusBadge(comm.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(comm.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {comm.paid_at ? new Date(comm.paid_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {comm.payment_reference || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedCommission(comm);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Upcoming Commissions */}
      {activeTab === 'upcoming' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Commissions</h2>
            <p className="text-sm text-gray-500 mt-1">Commissions pending approval and payment</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Policy Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Premium Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Commission Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Commission Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Expected Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {upcomingCommissions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No pending commissions
                    </td>
                  </tr>
                ) : (
                  upcomingCommissions.map((comm) => (
                    <tr key={comm.commission_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900">{comm.policy_type || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-900">${comm.premium_amount}</td>
                      <td className="px-6 py-4 text-gray-900">{comm.rate}%</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">${comm.amount}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(comm.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-yellow-600">Pending Approval</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedCommission(comm);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Monthly Breakdown */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Commission Breakdown</h2>
            <p className="text-sm text-gray-500 mt-1">Commission earned per month</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Policies Sold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Paid Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pending Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No monthly data available
                    </td>
                  </tr>
                ) : (
                  monthlyData.map((month, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{month.month_name || month.month}</td>
                      <td className="px-6 py-4 text-gray-900">{month.policies_count || 0}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">${month.total_commission?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 text-green-600">${month.paid_commission?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 text-yellow-600">${month.pending_commission?.toLocaleString() || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && (
        <ViewDetailsModal commission={selectedCommission} onClose={() => setShowDetailsModal(false)} />
      )}
    </div>
  );
}