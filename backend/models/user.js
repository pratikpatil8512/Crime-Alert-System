// models/user.js
const pool = require('../db');

// createUser: stores already-hashed password and OTP fields
async function createUser(name, email, hashedPassword, role, phone, otp, otpExpiry, dob) {
  const result = await pool.query(
    `INSERT INTO users
      (name, email, password_hash, role, phone, otp, otp_expiry, dob, is_verified, otp_attempts, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,0,NOW())
     RETURNING id, name, email, role, is_verified`,
    [name, email, hashedPassword, role, phone, otp, otpExpiry, dob]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, is_verified, otp, otp_expiry, otp_attempts, fcm_token
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

async function verifyUserEmail(userId) {
  await pool.query(
    `UPDATE users SET is_verified = TRUE, otp = NULL, otp_expiry = NULL, otp_attempts = 0, updated_at = NOW() WHERE id = $1`,
    [userId]
  );
  return true;
}

async function incrementOtpAttempts(userId, attempts) {
  await pool.query(
    `UPDATE users SET otp_attempts = $1, updated_at = NOW() WHERE id = $2`,
    [attempts, userId]
  );
}

async function deleteUser(userId) {
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

async function setResetOTP(email, otp, otpExpiry) {
  await pool.query(
    `UPDATE users SET otp = $1, otp_expiry = $2, updated_at = NOW() WHERE email = $3`,
    [otp, otpExpiry, email]
  );
}

async function verifyResetOTP(email, otp) {
  const result = await pool.query(
    `SELECT otp, otp_expiry FROM users WHERE email = $1`,
    [email]
  );
  if (result.rowCount === 0) return false;
  const user = result.rows[0];
  if (!user.otp || !user.otp_expiry) return false;
  if (user.otp !== otp) return false;
  if (new Date() > new Date(user.otp_expiry)) return false;
  return true;
}

async function updatePassword(email, hashedPassword) {
  await pool.query(
    `UPDATE users SET password_hash = $1, otp = NULL, otp_expiry = NULL, updated_at = NOW() WHERE email = $2`,
    [hashedPassword, email]
  );
}

async function deleteUnverifiedUserByEmailAndPhone(email, phone) {
  const result = await pool.query(
    `DELETE FROM users WHERE email = $1 AND phone = $2 AND is_verified = false RETURNING id`,
    [email, phone]
  );
  return result.rowCount > 0;
}

async function setOtpForUser(userId, otp, otpExpiry) {
  await pool.query(
    `UPDATE users SET otp = $1, otp_expiry = $2, otp_attempts = 0, updated_at = NOW() WHERE id = $3`,
    [otp, otpExpiry, userId]
  );
}

module.exports = {
  createUser,
  findUserByEmail,
  verifyUserEmail,
  setResetOTP,
  verifyResetOTP,
  updatePassword,
  incrementOtpAttempts,
  deleteUnverifiedUserByEmailAndPhone,
  deleteUser,
  setOtpForUser
};
