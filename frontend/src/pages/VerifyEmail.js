import { useState } from 'react';
import API from '../utils/api';
import InputField from '../components/InputField';
import Button from '../components/Button';
import AlertBox from '../components/AlertBox';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await API.post('/auth/verify-otp', { email, otp });
      setAlert({ message: res.data.message, type: 'success' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setAlert({ message: err.response?.data?.error || 'Verification failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-indigo-600">Verify Your Email</h1>
        <AlertBox message={alert.message} type={alert.type} />
        <InputField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <InputField label="OTP" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} />
        <Button text="Verify Email" onClick={handleVerify} loading={loading} />
      </div>
    </div>
  );
}
