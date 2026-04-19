export default function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-4">
      <div className={`p-3 rounded-full ${color} bg-opacity-10 text-2xl`}>{icon}</div>
      <div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
