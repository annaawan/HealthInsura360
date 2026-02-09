import React, { useState } from 'react';
import { Download, CreditCard as CreditCardIcon, Eye, Check } from 'lucide-react';
// 7. Payment Transactions Component
function PaymentTransactions() {
  const [transactions] = useState([
    { id: 'TXN001', user: 'John Smith', amount: 199, type: 'Premium Payment', status: 'Completed', date: '2024-01-15', method: 'Credit Card' },
    { id: 'TXN002', user: 'Sarah Johnson', amount: 99, type: 'Basic Payment', status: 'Completed', date: '2024-01-14', method: 'Bank Transfer' },
    { id: 'TXN003', user: 'Mike Chen', amount: 299, type: 'Premium Payment', status: 'Pending', date: '2024-01-14', method: 'Credit Card' },
    { id: 'TXN004', user: 'David Wilson', amount: 45000, type: 'Commission Payment', status: 'Completed', date: '2024-01-13', method: 'Bank Transfer' },
    { id: 'TXN005', user: 'City General', amount: 120000, type: 'Hospital Payment', status: 'Failed', date: '2024-01-12', method: 'Wire Transfer' },
  ]);

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = transactions
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Transactions</h1>
          <p className="text-gray-600">Manage and monitor payment activities</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-gray-600 text-sm">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-5 w-5" />
            Export Transactions
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Total Transactions</div>
          <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Successful</div>
          <div className="text-2xl font-bold text-green-600">
            {transactions.filter(t => t.status === 'Completed').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {transactions.filter(t => t.status === 'Pending').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-gray-600 text-sm mb-2">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {transactions.filter(t => t.status === 'Failed').length}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Transaction ID</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">User</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Type</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Amount</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Payment Method</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Status</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Date</th>
              <th className="px-6 py-3 text-left text-gray-700 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-gray-600">{transaction.id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{transaction.user}</td>
                <td className="px-6 py-4 text-gray-700">{transaction.type}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">${transaction.amount.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="h-4 w-4 text-gray-400" />
                    {transaction.method}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{transaction.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                    {transaction.status === 'Pending' && (
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
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


export default PaymentTransactions;
