import { Link, useLocation } from 'react-router-dom';
import { getUserRole, getUserName, logoutUser } from '../utils/auth';
import {
  BarChart3,
  Map,
  LogOut,
  Home,
  Shield,
  AlertCircle,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const role = getUserRole();
  const name = getUserName();
  const location = useLocation();

  // 🎯 Base menu items
  const menu = [
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { to: '/map', label: 'Map', icon: <Map size={18} /> },
  ];

  if (role === 'admin' || role === 'police') {
    menu.push({
      to: '/statistics',
      label: 'Statistics',
      icon: <BarChart3 size={18} />,
    });
  }

  menu.push({
    to: '/report-tip',
    label: 'Report Tip',
    icon: <AlertCircle size={18} />,
  });

  // 👮 Police/Admin exclusive
  if (role === 'police' || role === 'admin') {
    menu.push({
      to: '/manage-crimes',
      label: 'Manage Crimes',
      icon: <Shield size={18} />,
    });
  }

  if (role === 'admin' || role === 'police') {
    menu.push({
      to: '/tip-moderation',
      label: 'Tip Moderation',
      icon: <Shield size={18} />,
    });
  }

  // 👑 Admin exclusive
  if (role === 'admin') {
    menu.push({
      to: '/admin-panel',
      label: 'Admin Panel',
      icon: <Settings size={18} />,
    });
  }

  // 👤 Citizen/Tourist menu
  if (role === 'admin' || role === 'police') {
    menu.push({
      to: '/report',
      label: 'Report Crime',
      icon: <AlertCircle />,
    });
  }

  return (
    <div className="w-full md:w-64 h-full md:h-screen bg-indigo-700 text-white flex flex-col justify-between shadow-xl">
      {/* Top Section */}
      <div>
        {/* 🚨 App Branding */}
        <div className="p-5 text-2xl font-bold border-b border-indigo-500 tracking-wide flex items-center space-x-2">
          <span>🚨</span>
          <span>Crime Alert</span>
        </div>

        {/* 👤 User Info */}
        <div className="p-5 border-b border-indigo-500 bg-indigo-800/60">
          <p className="text-lg font-semibold truncate">
            {name || 'Guest User'}
          </p>
          <p className="text-indigo-200 text-sm capitalize mt-1">
            {role || 'guest'}
          </p>
        </div>

        {/* 📋 Navigation Menu */}
        <nav className="mt-4 space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-3 py-2.5 px-6 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
                }`}
              >
                <span className="text-indigo-100">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section - Logout */}
      <div
        onClick={logoutUser}
        className="p-4 border-t border-indigo-500 flex items-center space-x-3 hover:bg-indigo-600 cursor-pointer transition-colors duration-200"
      >
        <LogOut size={18} /> <span>Logout</span>
      </div>
    </div>
  );
}
