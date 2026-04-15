import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { Check, Download, CreditCard as CreditCardIcon, Eye, AlertCircle, RefreshCw, FileText, FileSpreadsheet, X } from 'lucide-react';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);

function PaymentTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingDummyData, setUsingDummyData] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // Dummy data as fallback
  const dummyTransactions = [
    { 
      transaction_id: 'TXN001', 
      related_payment_id: 'PAY001',
      related_claim_id: 'CLM001',
      related_commission_id: null,
      amount: 199, 
      type: 'Premium Payment', 
      status: 'Completed', 
      created_at: '2024-01-15T10:30:00Z',
      customer_name: 'John Smith',
      payment_method: 'Credit Card',
      agent_name: null,
      hospital_name: null
    },
    { 
      transaction_id: 'TXN002', 
      related_payment_id: 'PAY002',
      related_claim_id: null,
      related_commission_id: 'COMM001',
      amount: 99, 
      type: 'Basic Payment', 
      status: 'Completed', 
      created_at: '2024-01-14T14:20:00Z',
      customer_name: 'Sarah Johnson',
      payment_method: 'Bank Transfer',
      agent_name: 'Agent Smith',
      hospital_name: null
    },
    { 
      transaction_id: 'TXN003', 
      related_payment_id: 'PAY003',
      related_claim_id: 'CLM002',
      related_commission_id: null,
      amount: 299, 
      type: 'Premium Payment', 
      status: 'Pending', 
      created_at: '2024-01-14T09:15:00Z',
      customer_name: 'Mike Chen',
      payment_method: 'Credit Card',
      agent_name: null,
      hospital_name: null
    },
    { 
      transaction_id: 'TXN004', 
      related_payment_id: null,
      related_claim_id: null,
      related_commission_id: 'COMM002',
      amount: 45000, 
      type: 'Commission Payment', 
      status: 'Completed', 
      created_at: '2024-01-13T16:45:00Z',
      customer_name: null,
      payment_method: 'Bank Transfer',
      agent_name: 'David Wilson',
      hospital_name: null
    },
    { 
      transaction_id: 'TXN005', 
      related_payment_id: 'PAY004',
      related_claim_id: 'CLM003',
      related_commission_id: null,
      amount: 120000, 
      type: 'Hospital Payment', 
      status: 'Failed', 
      created_at: '2024-01-12T11:00:00Z',
      customer_name: null,
      payment_method: 'Wire Transfer',
      agent_name: null,
      hospital_name: 'City General Hospital'
    },
  ];

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    setUsingDummyData(false);
    
    try {
      const response = await axios.get('http://localhost:5000/api/payments/transactions');
      
      console.log('Response:', response.data);
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const formattedTransactions = response.data.data.map(txn => {
          // Determine the user name based on transaction type
          let userName = 'Unknown';
          if (txn.customer?.name) {
            userName = txn.customer.name;
          } else if (txn.agent_name) {
            userName = txn.agent_name;
          } else if (txn.hospital_name) {
            userName = txn.hospital_name;
          }
          
          // Get payment method
          let paymentMethod = txn.payment?.method || 'Unknown';
          
          return {
            id: txn.transaction_id,
            user: userName,
            amount: txn.amount,
            type: txn.type,
            status: txn.status,
            date: formatDate(txn.created_at),
            method: paymentMethod,
            transaction_id: txn.transaction_id,
            related_payment_id: txn.related_payment_id,
            related_claim_id: txn.related_claim_id,
            related_commission_id: txn.related_commission_id,
            created_at: txn.created_at,
            customer: txn.customer,
            payment: txn.payment,
            agent_name: txn.agent_name,
            hospital_name: txn.hospital_name
          };
        });
        
        setTransactions(formattedTransactions);
        setError(null);
      } else if (response.data.scenario === 'no_data') {
        setTransactions([]);
        setError('No transactions found in the database');
      } else if (response.data.scenario === 'mock_data') {
        const mockFormatted = response.data.data.map(txn => ({
          id: txn.transaction_id,
          user: txn.customer?.name || txn.agent_name || txn.hospital_name || 'Unknown',
          amount: txn.amount,
          type: txn.type,
          status: txn.status,
          date: formatDate(txn.created_at),
          method: txn.payment?.method || 'Unknown'
        }));
        setTransactions(mockFormatted);
        setError(`⚠️ ${response.data.message}`);
        setUsingDummyData(true);
      } else {
        setTransactions([]);
        setError('No transactions found');
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(`Error: ${err.message}`);
      
      const formattedDummy = dummyTransactions.map(txn => ({
        id: txn.transaction_id,
        user: txn.customer_name || txn.agent_name || txn.hospital_name || 'Unknown',
        amount: txn.amount,
        type: txn.type,
        status: txn.status,
        date: formatDate(txn.created_at),
        method: txn.payment_method || 'Unknown',
        transaction_id: txn.transaction_id,
        related_payment_id: txn.related_payment_id,
        related_claim_id: txn.related_claim_id,
        related_commission_id: txn.related_commission_id,
        created_at: txn.created_at,
        agent_name: txn.agent_name,
        hospital_name: txn.hospital_name,
        customer_name: txn.customer_name
      }));
      setTransactions(formattedDummy);
      setUsingDummyData(true);
    } finally {
      setLoading(false);
    }
  };

  // Update transaction status function
  const updateTransactionStatus = async (transactionId, newStatus) => {
    const action = newStatus === 'Completed' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${action} transaction ${transactionId}?`)) {
      return;
    }
    
    setUpdatingStatus(transactionId);
    
    try {
      const response = await axios.put(`http://localhost:5000/api/payments/transactions/${transactionId}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        alert(`Transaction ${transactionId} has been ${newStatus.toLowerCase()} successfully!`);
        await fetchTransactions();
      } else {
        alert(`Failed to update transaction: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true);
    
    try {
      const headers = [
        'Transaction ID',
        'User/Payee',
        'Type',
        'Amount',
        'Payment Method',
        'Status',
        'Date',
        'Time',
        'Related Payment ID',
        'Related Claim ID',
        'Related Commission ID'
      ];
      
      const rows = transactions.map(txn => [
        txn.id,
        txn.user,
        txn.type,
        txn.amount,
        txn.method,
        txn.status,
        formatDate(txn.datetime || txn.created_at),
        formatDateTime(txn.datetime || txn.created_at).split(',')[1]?.trim() || '',
        txn.related_payment_id || 'N/A',
        txn.related_claim_id || 'N/A',
        txn.related_commission_id || 'N/A'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(','))
      ].join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${transactions.length} transactions to CSV`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };
  
  // Export to Excel
  const exportToExcel = () => {
    setExporting(true);
    
    try {
      const headers = [
        'Transaction ID', 'User/Payee', 'Type', 'Amount', 'Payment Method', 
        'Status', 'Date', 'Time', 'Related Payment ID', 'Related Claim ID', 'Related Commission ID'
      ];
      
      const rows = transactions.map(txn => [
        txn.id, txn.user, txn.type, txn.amount, txn.method,
        txn.status, formatDate(txn.datetime || txn.created_at),
        formatDateTime(txn.datetime || txn.created_at).split(',')[1]?.trim() || '',
        txn.related_payment_id || 'N/A',
        txn.related_claim_id || 'N/A',
        txn.related_commission_id || 'N/A'
      ]);
      
      let excelHTML = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Payment Transactions Export</title>
          </head>
          <body>
            <table border="1">
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr>
                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      
      const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${timestamp}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${transactions.length} transactions to Excel`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };
  
  // Export to JSON
  const exportToJSON = () => {
    setExporting(true);
    
    try {
      const exportData = transactions.map(txn => ({
        transaction_id: txn.id,
        user: txn.user,
        type: txn.type,
        amount: txn.amount,
        payment_method: txn.method,
        status: txn.status,
        date: formatDate(txn.datetime || txn.created_at),
        datetime: formatDateTime(txn.datetime || txn.created_at),
        related_payment_id: txn.related_payment_id,
        related_claim_id: txn.related_claim_id,
        related_commission_id: txn.related_commission_id,
        export_timestamp: new Date().toISOString()
      }));
      
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${timestamp}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${transactions.length} transactions to JSON`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };
  
  // Print transactions
  const printTransactions = () => {
    setExporting(true);
    
    try {
      const printWindow = window.open('', '_blank');
      const headers = ['Transaction ID', 'User/Payee', 'Type', 'Amount', 'Payment Method', 'Status', 'Date'];
      
      const rows = transactions.map(txn => [
        txn.id, txn.user, txn.type, `$${txn.amount.toLocaleString()}`, txn.method, txn.status, formatDate(txn.datetime || txn.created_at)
      ]);
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Payment Transactions Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:hover { background-color: #f5f5f5; }
              .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
              .summary { margin-top: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Payment Transactions Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <div class="summary">
              <strong>Summary:</strong> Total Transactions: ${transactions.length} | 
              Total Revenue: $${totalRevenue.toLocaleString()} | 
              Successful: ${transactions.filter(t => t.status === 'Completed').length} |
              Pending: ${transactions.filter(t => t.status === 'Pending').length} |
              Failed: ${transactions.filter(t => t.status === 'Failed').length}
            </div>
            <table border="1">
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr>
                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">
              This is a system-generated report. For inquiries, please contact support.
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      console.error('Print failed:', err);
      alert('Failed to print transactions. Please try again.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = transactions
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const handleRetry = () => {
    fetchTransactions();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {error && (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${usingDummyData ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`h-5 w-5 ${usingDummyData ? 'text-yellow-600' : 'text-red-600'}`} />
            <span className={usingDummyData ? 'text-yellow-800' : 'text-red-800'}>{error}</span>
          </div>
          <button 
            onClick={handleRetry}
            className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm hover:shadow transition-shadow"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {usingDummyData && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Currently showing sample data. Real data will appear when database connection is established.
          </p>
        </div>
      )}

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
          
          <div className="relative export-menu-container">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting || transactions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Export
                </>
              )}
            </button>
            
            {showExportMenu && !exporting && transactions.length > 0 && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                <button onClick={exportToCSV} className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                  <FileText className="h-4 w-4" /> Export as CSV
                </button>
                <button onClick={exportToExcel} className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                  <FileSpreadsheet className="h-4 w-4" /> Export as Excel
                </button>
                <button onClick={exportToJSON} className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                  <Download className="h-4 w-4" /> Export as JSON
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button onClick={printTransactions} className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                  <Download className="h-4 w-4" /> Print Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Transactions Table - No Tabs, Just the Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <CreditCardIcon className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
            <p className="text-gray-500">No payment transactions have been recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-medium">User/Payee</th>
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'Premium Payment' ? 'bg-blue-100 text-blue-800' :
                        transaction.type === 'Commission Payment' ? 'bg-green-100 text-green-800' :
                        transaction.type === 'Hospital Payment' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">${(transaction.amount || 0).toLocaleString()}</div>
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
                        <button 
                          onClick={() => {
                            let details = `Transaction Details:\n`;
                            details += `ID: ${transaction.id}\n`;
                            details += `Amount: $${transaction.amount}\n`;
                            details += `Status: ${transaction.status}\n`;
                            details += `Method: ${transaction.method}\n`;
                            details += `User/Payee: ${transaction.user}\n`;
                            details += `Type: ${transaction.type}\n`;
                            details += `Date: ${transaction.date}\n`;
                            if (transaction.agent_name) details += `Agent: ${transaction.agent_name}\n`;
                            if (transaction.hospital_name) details += `Hospital: ${transaction.hospital_name}\n`;
                            alert(details);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {transaction.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => updateTransactionStatus(transaction.id, 'Completed')}
                              disabled={updatingStatus === transaction.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve Transaction"
                            >
                              {updatingStatus === transaction.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button 
                              onClick={() => updateTransactionStatus(transaction.id, 'Failed')}
                              disabled={updatingStatus === transaction.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Mark as Failed"
                            >
                              {updatingStatus === transaction.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentTransactions;