import React, { useState} from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
// Icons from lucide-react
import { 
  Check, 
  Edit, 
  Eye
} from 'lucide-react';

// Register Chart.js plugins
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);



function AgentCommissions() {
  const [commissions, setCommissions] = useState([
    { agent: 'David Wilson', totalSales: 45000, commissionRate: '15%', commissionAmount: 6750, pending: 1200, paid: 5550, lastPayment: '2024-01-10' },
    { agent: 'Lisa Brown', totalSales: 32000, commissionRate: '12%', commissionAmount: 3840, pending: 800, paid: 3040, lastPayment: '2024-01-05' },
    { agent: 'Tom Harris', totalSales: 18000, commissionRate: '10%', commissionAmount: 1800, pending: 1800, paid: 0, lastPayment: '-' },
  ]);

  const [editingCommission, setEditingCommission] = useState(null);
  const [newRate, setNewRate] = useState('');

  const handleUpdateCommission = (agentName) => {
    if (newRate && !isNaN(parseFloat(newRate))) {
      setCommissions(prev => prev.map(c => 
        c.agent === agentName 
          ? { 
              ...c, 
              commissionRate: `${parseFloat(newRate)}%`,
              commissionAmount: (c.totalSales * parseFloat(newRate)) / 100
            } 
          : c
      ));
      setEditingCommission(null);
      setNewRate('');
    }
  };

  const handlePayCommission = (agentName) => {
    setCommissions(prev => prev.map(c => 
      c.agent === agentName 
        ? { 
            ...c, 
            paid: c.paid + c.pending,
            pending: 0,
            lastPayment: new Date().toISOString().split('T')[0]
          } 
        : c
    ));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Commissions</h1>
          <p className="text-gray-600">Review and manage agent commission payments</p>
        </div>
        <div className="text-right">
          <div className="text-gray-600 text-sm">Total Commission Due</div>
          <div className="text-2xl font-bold text-blue-600">
            ${commissions.reduce((sum, c) => sum + c.pending, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Commission Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Agent</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Total Sales</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Commission Rate</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Commission Amount</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Pending</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Paid</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Last Payment</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {commissions.map((commission) => (
              <tr key={commission.agent} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{commission.agent}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">${commission.totalSales.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  {editingCommission === commission.agent ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      <span>%</span>
                      <button 
                        onClick={() => handleUpdateCommission(commission.agent)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => {
                          setEditingCommission(null);
                          setNewRate('');
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{commission.commissionRate}</span>
                      <button 
                        onClick={() => {
                          setEditingCommission(commission.agent);
                          setNewRate(parseFloat(commission.commissionRate));
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-bold text-blue-600">
                  ${commission.commissionAmount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-yellow-600">${commission.pending.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-green-600">${commission.paid.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{commission.lastPayment}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {commission.pending > 0 && (
                      <button 
                        onClick={() => handlePayCommission(commission.agent)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        <Check className="h-3 w-3" />
                        Pay Commission
                      </button>
                    )}
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default AgentCommissions;