export default function InputField({ label, name, type, value, onChange, placeholder }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
