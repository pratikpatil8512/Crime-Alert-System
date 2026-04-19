export default function Button({ text, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition ${
        loading ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      {loading ? 'Please wait...' : text}
    </button>
  );
}
