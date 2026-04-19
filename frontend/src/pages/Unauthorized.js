import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
      <h2 className="text-2xl font-semibold mb-2 text-gray-800">Access Denied</h2>
      <p className="text-gray-600 mb-6">You don’t have permission to view this page.</p>
      <Link
        to="/dashboard"
        className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition"
      >
        Go Back to Dashboard
      </Link>
    </div>
  );
}
