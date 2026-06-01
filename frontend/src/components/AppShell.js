import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell({ children, userName = 'User', contentClassName = '' }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 pt-24 ${contentClassName}`}>{children}</main>
      </div>
    </div>
  );
}
