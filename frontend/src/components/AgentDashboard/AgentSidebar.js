// frontend/src/components/AgentDashboard/AgentSidebar.js
import { 
  Users, 
  TrendingUp, 
  DollarSign,
  User,
  LogOut,
  Briefcase,
  Menu
} from 'lucide-react';

const menuItems = [
  { id: 'clients', label: 'My Clients', icon: Users },
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'commission', label: 'Commission', icon: DollarSign },
  { id: 'profile', label: 'Profile', icon: User },
];

export function AgentSidebar({ 
  currentView, 
  onViewChange, 
  isOpen, 
  onToggle,
  onLogout,
  agent 
}) {
  // Debug: Log the agent data to see what's being received
  console.log('Agent data in sidebar:', agent);

  const getInitials = () => {
    // Check both camelCase and snake_case property names
    if (agent?.firstName && agent?.lastName) {
      return `${agent.firstName[0]}${agent.lastName[0]}`;
    }
    if (agent?.first_name && agent?.last_name) {
      return `${agent.first_name[0]}${agent.last_name[0]}`;
    }
    return 'AG';
  };

  const getFullName = () => {
    if (agent?.firstName && agent?.lastName) {
      return `${agent.firstName} ${agent.lastName}`;
    }
    if (agent?.first_name && agent?.last_name) {
      return `${agent.first_name} ${agent.last_name}`;
    }
    return 'Agent';
  };

  const getLicenseNumber = () => {
    return agent?.licenseNumber || agent?.license_number || 'N/A';
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-purple-900 text-white transition-all duration-300 ${
      isOpen ? 'w-64' : 'w-20'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-800">
          <div className={`flex items-center gap-2 ${!isOpen && 'justify-center'}`}>
            <Briefcase className="h-8 w-8 text-white flex-shrink-0" />
            {isOpen && <span className="font-semibold">Agent Portal</span>}
          </div>
          <button
            onClick={onToggle}
            className="text-white hover:bg-purple-800 p-2 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Agent Info */}
        {isOpen && agent && (
          <div className="p-4 border-b border-purple-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-700 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium">{getInitials()}</span>
              </div>
              <div>
                <div className="font-medium">{getFullName()}</div>
                <div className="text-sm text-purple-200">ID: {getLicenseNumber()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-700 text-white'
                        : 'text-purple-100 hover:bg-purple-800'
                    } ${!isOpen && 'justify-center'}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-purple-800">
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-purple-100 hover:bg-purple-800 transition-colors ${
              !isOpen && 'justify-center'
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}