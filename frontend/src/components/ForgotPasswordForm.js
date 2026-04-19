import { useState } from "react";
import { forgotPassword, resetPassword } from "../api/auth";
import GlassCard from "./GlassCard";

export default function ForgotPasswordForm({ onBack }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const startReset = async e => {
    e.preventDefault();
    setMsg("");
    try {
      const { data } = await forgotPassword({ email });
      setMsg(data.message);
      setStep(2);
    } catch (err) {
      setMsg(err?.response?.data?.error || "Error");
    }
  };

  const handleReset = async e => {
    e.preventDefault();
    try {
      const { data } = await resetPassword({ email, otp, newPassword });
      setMsg(data.message);
      setStep(1);
      setEmail("");
      setOtp("");
      setNewPassword("");
    } catch (err) {
      setMsg(err?.response?.data?.error || "Failed");
    }
  };

  return (
    <GlassCard className="max-w-sm w-full text-center">
      <h2 className="text-2xl font-bold mb-2">{step === 1 ? "Forgot Password" : "Reset Password"}</h2>
      {step === 1 && (
        <form className="space-y-3" onSubmit={startReset}>
          <input type="email" placeholder="Your Email" className="w-full rounded p-2 bg-white/100" value={email} required onChange={e => setEmail(e.target.value)} />
          <button className="w-full bg-gradient-to-r from-blue-900 to-red-800 text-white rounded p-2 font-semibold" type="submit">Send OTP</button>
        </form>
      )}
      {step === 2 && (
        <form className="space-y-3" onSubmit={handleReset}>
          <input className="w-full rounded p-2 bg-white/100" value={otp} onChange={e => setOtp(e.target.value)} placeholder="OTP" required />
          <input className="w-full rounded p-2 bg-white/100" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" type="password" required />
          <button className="w-full bg-gradient-to-r from-blue-900 to-red-800 text-white rounded p-2 font-semibold" type="submit">Reset Password</button>
        </form>
      )}
      <button className="w-full mt-3 text-sm text-blue-900 underline" onClick={onBack}>Back to Login</button>
      <div className="text-white/90 mt-2 text-sm">{msg}</div>
    </GlassCard>
  );
}
