import { useState, useEffect } from 'react';
import API from '../utils/api';
import InputField from '../components/InputField';
import Button from '../components/Button';
import AlertBox from '../components/AlertBox';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('sessionExpired')) {
      setAlert({
        message: 'Your session expired. Please log in again.',
        type: 'warning',
      });
      localStorage.removeItem('sessionExpired');
    }
  }, []);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async () => {
    setAlert({ message: '', type: '' });
    setLoading(true);

    try {
      const res = await API.post('/auth/login', form);

      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }

      if (res.data?.user) {
        localStorage.setItem('userId', res.data.user.id || '');
        localStorage.setItem('role', res.data.user.role || 'citizen');
        localStorage.setItem('name', res.data.user.name || form.email.split('@')[0]);
      } else {
        localStorage.setItem('userId', '');
        localStorage.setItem('role', 'citizen');
        localStorage.setItem('name', form.email.split('@')[0]);
      }
      localStorage.setItem('userEmail', form.email);

      setAlert({ message: 'Login successful! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('Login error:', err);
      const message =
        err.response?.data?.error ||
        (err.response?.status === 401
          ? 'Invalid credentials. Please check your email or password.'
          : 'Login failed. Please try again later.');

      setAlert({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-indigo-600">Welcome Back</h1>
        <AlertBox message={alert.message} type={alert.type} />
        <InputField label="Email" type="email" name="email" value={form.email} onChange={handleChange} />
        <InputField label="Password" type="password" name="password" value={form.password} onChange={handleChange} />
        <Button text="Login" onClick={handleSubmit} loading={loading} />
        <p className="mt-4 text-sm text-center">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
