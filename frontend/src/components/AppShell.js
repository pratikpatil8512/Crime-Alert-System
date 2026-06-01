import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useSocket } from '../context/SocketContext';

export default function AppShell({ children, userName = 'User', contentClassName = '' }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isConnected } = useSocket();

  return (
    <div className="flex h-screen bg-[#f8fafc] relative">
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <Sidebar />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[1100] flex md:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setIsSidebarOpen(false)} />
          <div className="w-72 max-w-[85vw] bg-indigo-700 h-full shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
        <Topbar userName={userName} onMenuToggle={() => setIsSidebarOpen((prev) => !prev)} />
        <div className="pointer-events-none absolute right-4 top-[4.5rem] z-[1050]">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {isConnected ? 'Live updates on' : 'Live updates reconnecting'}
          </div>
        </div>
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 pt-24 ${contentClassName}`}>{children}</main>
      </div>
    </div>
  );
}
