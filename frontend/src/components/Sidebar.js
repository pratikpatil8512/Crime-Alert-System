import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUserRole, getUserName, logoutUser } from '../utils/auth';
import API from '../utils/api';
import {
  AlertCircle,
  BarChart3,
  FileText,
  Home,
  LifeBuoy,
  PhoneCall,
  LogOut,
  Map,
  Settings,
  Shield,
} from 'lucide-react';

export default function Sidebar() {
  const role = getUserRole();
  const name = getUserName();
  const location = useLocation();
  const [activeHelpCount, setActiveHelpCount] = useState(0);

  useEffect(() => {
    if (role !== 'admin' && role !== 'police') return undefined;

    let cancelled = false;

    const loadHelpCount = async () => {
      try {
        const res = await API.get('/alerts/help');
        if (cancelled) return;
        const count = (res.data || []).filter((item) => item.active).length;
        setActiveHelpCount(count);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load active help request count:', err);
        }
      }
    };

    loadHelpCount();
    const interval = window.setInterval(loadHelpCount, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [role]);

  const menu = [
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { to: '/map', label: 'Map', icon: <Map size={18} /> },
    { to: '/emergency', label: 'Emergency', icon: <PhoneCall size={18} /> },
    { to: '/report-tip', label: 'Report Tip', icon: <AlertCircle size={18} /> },
    { to: '/my-reports', label: 'My Reports', icon: <FileText size={18} /> },
  ];

  if (role === 'tourist' || role === 'citizen') {
    menu.push({
      to: '/need-help',
      label: 'Need Help',
      icon: <LifeBuoy size={18} />,
    });
  }

  if (role === 'admin' || role === 'police') {
    menu.push({
      to: '/statistics',
      label: 'Statistics',
      icon: <BarChart3 size={18} />,
    });
    menu.push({
      to: '/help-requests',
      label: 'Help Requests',
      icon: <LifeBuoy size={18} />,
      badge: activeHelpCount,
      urgent: activeHelpCount > 0,
    });
  }

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

  if (role === 'admin') {
    menu.push({
      to: '/admin-panel',
      label: 'Admin Panel',
      icon: <Settings size={18} />,
    });
  }

  if (role === 'admin' || role === 'police') {
    menu.push({
      to: '/report',
      label: 'Report Crime',
      icon: <AlertCircle size={18} />,
    });
  }

  return (
    <div className="w-full md:w-64 h-full md:h-screen bg-indigo-700 text-white flex flex-col justify-between shadow-xl">
      <div>
        <div className="p-5 text-2xl font-bold border-b border-indigo-500 tracking-wide flex items-center space-x-2">
          <span>Crime Alert</span>
        </div>

        <div className="p-5 border-b border-indigo-500 bg-indigo-800/60">
          <p className="text-lg font-semibold truncate">{name || 'Guest User'}</p>
          <p className="text-indigo-200 text-sm capitalize mt-1">{role || 'guest'}</p>
        </div>

        <nav className="mt-4 space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.to;
            const isUrgent = Boolean(item.urgent);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-3 py-2.5 px-6 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? isUrgent
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                      : 'bg-indigo-600 text-white'
                    : isUrgent
                    ? 'bg-red-500/15 text-white ring-1 ring-red-300/40 hover:bg-red-500/25'
                    : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
                }`}
              >
                <span className={isUrgent ? 'text-red-100' : 'text-indigo-100'}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span
                    className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      isUrgent
                        ? 'bg-white text-red-700 animate-pulse'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        onClick={logoutUser}
        className="p-4 border-t border-indigo-500 flex items-center space-x-3 hover:bg-indigo-600 cursor-pointer transition-colors duration-200"
      >
        <LogOut size={18} /> <span>Logout</span>
      </div>
    </div>
  );
}
