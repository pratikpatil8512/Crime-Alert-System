// controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  createUser,
  findUserByEmail,
  findUserByVerificationToken,
  verifyUserEmail,
  setResetOTP,
  verifyResetOTP,
  updatePassword,
  incrementOtpAttempts,
  deleteUser,
  deleteUnverifiedUserByEmailAndPhone,
  setOtpForUser
} = require('../models/user');
const sendOtpEmail = require('../utils/email');
require('dotenv').config();

// Helper: hash password using SHA-256
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// ------------------ Registration with OTP logic ------------------
const register = async (req, res) => {
  const { name, email, password, role = 'tourist', phone, dob } = req.body;

  if (!name || !email || !password || !phone || !dob) {
    return res.status(400).json({ error: 'name, email, password, phone and dob are required' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const phoneRegex = /^[0-9]{10}$/;
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dobRegex.test(dob)) {
    return res.status(400).json({ error: 'Invalid date of birth format. Use YYYY-MM-DD.' });
  }

  // Validate age >= 18
  const dobDate = new Date(dob);
  if (Number.isNaN(dobDate.getTime())) {
    return res.status(400).json({ error: 'Invalid dob value' });
  }
  const ageDifMs = Date.now() - dobDate.getTime();
  const ageDate = new Date(ageDifMs);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  if (age < 18) {
    return res.status(400).json({ error: 'You must be at least 18 years old to register.' });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
    });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Phone number must be 10 digits.' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password using SHA-256
    const hashedPassword = hashPassword(password);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Create user with hashed password and OTP
    const user = await createUser(name, email, hashedPassword, role, phone, otp, otpExpiry, dob);

    // Send OTP email
    sendOtpEmail(email, otp).catch(e => console.error('OTP email failed:', e));

    return res.status(201).json({
      message: 'User registered. Please verify your email using the OTP sent to your email address.'
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------- OTP Verification ----------------------
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.is_verified) return res.status(400).json({ error: 'Email already verified' });

    const storedOtp = user.otp;
    const otpExpiry = user.otp_expiry ? new Date(user.otp_expiry) : null;

    if (!storedOtp || !otpExpiry || new Date() > otpExpiry || storedOtp !== otp) {
      const attempts = (user.otp_attempts || 0) + 1;
      await incrementOtpAttempts(user.id, attempts);

      if (attempts >= 3) {
        await deleteUser(user.id);
        return res.status(400).json({ error: 'Maximum OTP attempts reached. Your registration has been cancelled.' });
      }

      return res.status(400).json({ error: `Invalid or expired OTP. Attempts left: ${3 - attempts}` });
    }

    await verifyUserEmail(user.id);
    return res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------- Login ----------------------
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    // Compare SHA-256 hashes
    const hashedPassword = hashPassword(password);
    if (hashedPassword !== user.password_hash) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
  token,
  message: 'Login successful',
  user: {
    id: user.id,
    name: user.name,
    role: user.role,
  }
});
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------- Resend verification OTP ----------------------
const resendVerificationOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.is_verified) return res.status(400).json({ error: 'User already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await setOtpForUser(user.id, otp, otpExpiry);
    await sendOtpEmail(email, otp);

    return res.json({ message: 'Verification OTP sent to your email' });
  } catch (err) {
    console.error('resendOTP error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------- Delete unverified user ----------------------
const deleteUnverifiedUser = async (req, res) => {
  const { email, phone } = req.body;
  try {
    if (!email || !phone) {
      return res.status(400).json({ error: 'Email and phone are required' });
    }

    const deleted = await deleteUnverifiedUserByEmailAndPhone(email, phone);
    if (deleted) {
      return res.json({ message: 'Unverified user deleted successfully' });
    } else {
      return res.status(404).json({ error: 'Unverified user not found' });
    }
  } catch (err) {
    console.error('deleteUnverifiedUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------- Forgot Password ----------------------
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await setResetOTP(email, otp, otpExpiry);
    await sendOtpEmail(email, otp);

    return res.json({ message: 'OTP sent! Please check your email.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Error sending OTP.' });
  }
};

// ---------------------- Reset Password ----------------------
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'email, otp and newPassword required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const isValid = await verifyResetOTP(email, otp);
    if (!isValid) return res.status(400).json({ error: 'Invalid or expired OTP.' });

    const hashedNewPassword = hashPassword(newPassword);
    await updatePassword(email, hashedNewPassword);

    return res.json({ message: 'Password reset successful! Please login with your new password.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
  deleteUnverifiedUser,
  resendVerificationOtp
};
