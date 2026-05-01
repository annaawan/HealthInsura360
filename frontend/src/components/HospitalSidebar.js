import React from 'react';
import Logo from "../assets/HealthInsura360.png";
import { LayoutDashboard, Search, FileText, File, LogOut, Menu, DollarSign, CreditCard } from 'lucide-react';

// Sidebar specifically for hospital portal with orange accent
function HospitalSidebar({ currentView, onViewChange, isOpen, onToggle }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims', label: 'Claims History', icon: FileText },
    { id: 'payment', label: 'Payment History', icon: DollarSign },      // Payment panel
  { id: 'account', label: 'Payment Account', icon: CreditCard },
  ];

  const handleLogout = () => {
    localStorage.removeItem('healthinsura360_token');
    localStorage.removeItem('user');
    localStorage.removeItem('accountType');
    window.location.href = '/login';
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-orange-500 to-orange-600 text-white transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-orange-700">
          <div className={`flex items-center gap-2 ${!isOpen && 'justify-center'}`}>
            <div className="w-8 h-8">
              <img src={Logo} alt="HealthInsura360 Logo" className="w-full h-full object-contain rounded-lg bg-white p-1" />
            </div>
            {isOpen && (
              <div>
                <span className="font-bold text-lg">HealthInsura360</span>
                <div className="text-xs text-orange-200">Hospital Portal</div>
              </div>
            )}
          </div>
          <button onClick={onToggle} className="text-white hover:bg-orange-700 p-2 rounded-lg transition-colors">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 py-6 overflow-y-auto">
          <ul className="space-y-2 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button onClick={() => onViewChange(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-orange-700 text-white shadow-sm' : 'text-orange-100 hover:bg-orange-600'} ${!isOpen && 'justify-center'}`}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-3 border-t border-orange-700">
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-orange-100 hover:bg-orange-600 transition-colors ${!isOpen && 'justify-center'}`}>
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default HospitalSidebar;