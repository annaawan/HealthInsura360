import React, { useState, useEffect } from 'react';
import DashboardSidebar from './DashboardSidebar';
import AccountsManagement from './AccountsManagement';
import PoliciesManagement from './PoliciesManagement';
import Reports from './Reports';
import AnalyticsDashboard from './AnalyticsDashboard';
import AuditLogs from './AuditLogs';
import PaymentTransactions from './PaymentTransactions';
import AgentCommissions from './AgentCommissions';
import HospitalNetwork from './HospitalNetwork';

export function AdminDashboard() {
  const [currentView, setCurrentView] = useState('accounts');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('healthinsura360_token');
    if (!token) {
      window.location.href = '/login';
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      // case 'overview':
      //   return <DashboardOverview />;
      case 'accounts':
        return <AccountsManagement />;
      case 'policies':
        return <PoliciesManagement />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'audit':
        return <AuditLogs />;
      case 'payments':
        return <PaymentTransactions />;
      case 'commissions':
        return <AgentCommissions />;
      case 'hospitals':
        return <HospitalNetwork />;
      default:
        return <AccountsManagement />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {renderView()}
      </div>
    </div>
  );
}

export default AdminDashboard;
