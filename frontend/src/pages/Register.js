import { useState, useEffect } from 'react';
import API from '../utils/api';
import InputField from '../components/InputField';
import Button from '../components/Button';
import AlertBox from '../components/AlertBox';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
    role: 'tourist'
  });
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0); // 👈 tracking state
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validateForm = () => {
    const { name, email, phone, password, dob } = form;
    if (!name || !email || !phone || !password || !dob) {
      setAlert({ message: 'All fields are required', type: 'error' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlert({ message: 'Please enter a valid email address', type: 'error' });
      return false;
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      setAlert({ message: 'Phone number must be exactly 10 digits', type: 'error' });
      return false;
    }
    const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPassword.test(password)) {
      setAlert({
        message:
          'Password must be at least 8 characters, include one uppercase letter, one number, and one special character',
        type: 'error'
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setProgressStep(1); // ⏳ Start animation immediately

    try {
      const res = await API.post('/auth/register', form);

      // simulate slight delay to visualize steps
      setTimeout(() => setProgressStep(2), 1000);
      setTimeout(() => setProgressStep(3), 2000);

      setAlert({
        message:
          res.data.message || 'Registration successful! Check your email for OTP.',
        type: 'success'
      });

      setTimeout(() => navigate('/verify-email'), 3500);
    } catch (err) {
      setProgressStep(-1);
      setAlert({
        message: err.response?.data?.error || 'Registration failed. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Animate the icon symbol
  const [symbol, setSymbol] = useState('⏳');
  useEffect(() => {
    if (progressStep === 1) {
      const sequence = ['⏳', '📡', '🔄', '📤'];
      let i = 0;
      const interval = setInterval(() => {
        setSymbol(sequence[i % sequence.length]);
        i++;
      }, 400);
      return () => clearInterval(interval);
    }
    if (progressStep === 2) setSymbol('📬');
    if (progressStep === 3) setSymbol('✅');
    if (progressStep === -1) setSymbol('❌');
  }, [progressStep]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-indigo-600">Create Account</h1>
        <AlertBox message={alert.message} type={alert.type} />

        <InputField label="Full Name" name="name" type="text" value={form.name} onChange={handleChange} />
        <InputField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
        <InputField label="Phone Number" name="phone" type="text" value={form.phone} onChange={handleChange} />
        <InputField label="Date of Birth" name="dob" type="date" value={form.dob} onChange={handleChange} />
        <InputField label="Password" name="password" type="password" value={form.password} onChange={handleChange} />

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="tourist">Tourist</option>
            <option value="citizen">Citizen</option>
            <option value="police">Police</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <Button text="Register" onClick={handleSubmit} loading={loading} />

        <p className="mt-4 text-sm text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Login
          </Link>
        </p>

        {/* 🌟 Real-time tracking visible area */}
        {progressStep !== 0 && (
          <div className="mt-6 flex flex-col items-center transition-all duration-500 ease-in-out">
            <div
              className={`text-5xl ${
                progressStep === 3
                  ? 'text-green-500 animate-bounce'
                  : progressStep === -1
                  ? 'text-red-500 animate-pulse'
                  : 'text-indigo-500 animate-spin-slow'
              }`}
            >
              {symbol}
            </div>
            <p className="text-sm text-gray-700 mt-2">
              {progressStep === 1 && 'Registering your account...'}
              {progressStep === 2 && 'Sending verification email...'}
              {progressStep === 3 && 'Registration completed ✅'}
              {progressStep === -1 && 'Something went wrong ❌'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
