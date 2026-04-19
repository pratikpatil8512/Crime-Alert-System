import { getUserRole, getUserName } from '../utils/auth';
import { Menu } from 'lucide-react';

export default function Topbar({ userName, onLogout, onMenuToggle }) {
  const role = getUserRole();
  const name = getUserName() || userName;

  // 🛠️ Sticky & responsive layout
  return (
    <div className="sticky top-0 z-20 h-16 bg-white shadow-md flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onClick={() => onMenuToggle && onMenuToggle()}
        >
          <Menu size={20} />
        </button>

        <h1 className="text-base sm:text-xl font-semibold text-indigo-700">
          Welcome, {name || 'User'} 👋
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs sm:text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium capitalize">
          {role}
        </div>

        {/* Optional logout button if parent wants to use it */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="hidden sm:inline-flex text-xs sm:text-sm px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
