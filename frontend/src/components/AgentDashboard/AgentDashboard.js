// frontend/src/components/AgentDashboard/AgentDashboard.js
import { useState, useEffect, useCallback } from 'react';
import { AgentSidebar } from './AgentSidebar';
import { ClientManagement } from './ClientManagement';
import { AgentProfile } from './AgentProfile';
import AgentPayments from './AgentPayments';
import PaymentReminders from './PaymentReminders';
import ClaimManagement from './ClaimManagement';
import { CommissionTracking } from './CommissionTracking';
import axios from 'axios';
import { API_BASE_URL, getAxiosConfig } from '../../config';

export const AgentView = {
  CLIENTS: 'clients',
  PAYMENTS: 'payments',
  CLAIMS: 'claims',
  REMINDERS: 'reminders',
  COMMISSION: 'commission',
  PROFILE: 'profile'
};

export function AgentDashboard({ onLogout, agentData }) {
  const [currentView, setCurrentView] = useState(AgentView.CLIENTS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [agent, setAgent] = useState(agentData);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('healthinsura360_token');
    const accountType = localStorage.getItem('accountType');
    
    if (!token || accountType !== 'agent') {
      window.location.href = '/login';
    }
  }, []);

  const fetchAgentProfile = useCallback(async () => {
    try {
      const config = getAxiosConfig();
      const response = await axios.get(`${API_BASE_URL}/agent/profile`, config);
      setAgent(response.data);
    } catch (error) {
      console.error('Error fetching agent profile:', error);
      if (error.response?.status === 401) {
        onLogout();
      }
    }
  }, [onLogout]);

  useEffect(() => {
    if (agentData) {
      setAgent(agentData);
    } else {
      fetchAgentProfile();
    }
  }, [agentData, fetchAgentProfile]);

  const renderView = () => {
    switch (currentView) {
      case AgentView.CLIENTS:
        return <ClientManagement agentId={agent?.id || agent?.agent_id} />;
      case AgentView.PAYMENTS:
        return <AgentPayments agent={agent} />;
      case AgentView.CLAIMS:
        return <ClaimManagement agent={agent} />;
      case AgentView.REMINDERS:
        return <PaymentReminders agent={agent} />;
      case AgentView.COMMISSION:
        return <CommissionTracking agentId={agent?.id || agent?.agent_id} />;
      case AgentView.PROFILE:
        return <AgentProfile agent={agent} onUpdate={fetchAgentProfile} />;
      default:
        return <ClientManagement agentId={agent?.id || agent?.agent_id} />;
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      <AgentSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={onLogout}
        agent={agent}
      />
      
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {renderView()}
      </div>
    </div>
  );
}