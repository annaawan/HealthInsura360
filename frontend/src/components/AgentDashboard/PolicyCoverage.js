// frontend/src/components/AgentDashboard/PolicyCoverage.js
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';

function PolicyCoverage({ agent }) {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);

    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${localStorage.getItem('healthinsura360_token')}`,
        'Content-Type': 'application/json'
    });

    const fetchCoverageSummary = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/payments/agent/claims/summary', {
                headers: getAuthHeaders()
            });
            if (response.data.success) {
                setClients(response.data.data);
                
                // Calculate overall summary
                const total = response.data.data.reduce((acc, client) => ({
                    total_coverage: acc.total_coverage + (client.total_coverage || 0),
                    total_remaining: acc.total_remaining + (client.total_remaining_coverage || 0),
                    total_used: acc.total_used + (client.total_used_coverage || 0),
                    total_claims: acc.total_claims + (client.total_claims || 0)
                }), { total_coverage: 0, total_remaining: 0, total_used: 0, total_claims: 0 });
                
                setSummary(total);
            }
        } catch (error) {
            console.error('Error fetching coverage summary:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoverageSummary();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const getCoverageStatus = (percentage) => {
        if (percentage >= 80) return { color: 'text-red-600', bg: 'bg-red-100', text: 'Critical' };
        if (percentage >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Moderate' };
        return { color: 'text-green-600', bg: 'bg-green-100', text: 'Good' };
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading coverage data...</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Policy Coverage Dashboard</h1>
                <p className="text-gray-600">Monitor client coverage usage and remaining benefits</p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Coverage</p>
                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_coverage)}</p>
                            </div>
                            <Shield className="h-8 w-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Remaining Coverage</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_remaining)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Used Coverage</p>
                                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_used)}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-orange-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Claims</p>
                                <p className="text-2xl font-bold text-purple-600">{summary.total_claims}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-purple-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Clients Table with Coverage */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-700 font-medium">Client Name</th>
                                <th className="px-6 py-3 text-left text-gray-700 font-medium">Total Coverage</th>
                                <th className="px-6 py-3 text-left text-gray-700 font-medium">Remaining</th>
                                <th className="px-6 py-3 text-left text-gray-700 font-medium">Used</th>
                                <th className="px-6 py-3 text-left text-gray-700 font-medium">Usage</th>
                                <th className="px-6 py-3 text-left text-gray-700 font-medium">Claims</th>
                                <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {clients.map((client) => {
                                const usagePercentage = client.total_coverage > 0 
                                    ? (client.total_used_coverage / client.total_coverage * 100).toFixed(1)
                                    : 0;
                                const status = getCoverageStatus(usagePercentage);
                                
                                return (
                                    <tr key={client.customer_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {client.first_name} {client.last_name}
                                        </td>
                                        <td className="px-6 py-4 font-bold">{formatCurrency(client.total_coverage)}</td>
                                        <td className="px-6 py-4 text-green-600 font-semibold">{formatCurrency(client.total_remaining_coverage)}</td>
                                        <td className="px-6 py-4 text-orange-600">{formatCurrency(client.total_used_coverage)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className={`h-2 rounded-full ${status.bg.replace('bg-', 'bg-')}`}
                                                        style={{ width: `${usagePercentage}%`, backgroundColor: status.color === 'text-red-600' ? '#dc2626' : status.color === 'text-yellow-600' ? '#eab308' : '#22c55e' }}
                                                    ></div>
                                                </div>
                                                <span className={`text-sm ${status.color}`}>{usagePercentage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{client.total_claims || 0}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                                {status.text}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No clients found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <button
                onClick={fetchCoverageSummary}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
                <RefreshCw className="h-4 w-4" /> Refresh Data
            </button>
        </div>
    );
}

export default PolicyCoverage;