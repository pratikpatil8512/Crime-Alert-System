export default function AlertBox({ message, type = 'info' }) {
  if (!message) return null;

  const colors = {
    info: 'bg-blue-100 text-blue-700 border-blue-300',
    success: 'bg-green-100 text-green-700 border-green-300',
    error: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className={`p-3 mb-4 border rounded-lg ${colors[type]}`}>
      {message}
    </div>
  );
}
