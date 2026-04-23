const pool = require('../db');

const ADMIN_MANAGED_ROLES = new Set(['tourist', 'citizen', 'police', 'admin']);
const SELF_SIGNUP_ROLES = new Set(['tourist', 'citizen']);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(String(phone || '').trim());
}

function isValidDob(dob) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dob || '').trim());
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(String(password || ''));
}

async function listUsers(req, res) {
  try {
    const q = `
      SELECT id, name, email, role, phone, dob, is_verified, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 500;
    `;
    const { rows } = await pool.query(q);
    return res.json(rows);
  } catch (err) {
    console.error('listUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

async function createUserByAdmin(req, res) {
  try {
    const {
      name,
      email,
      password,
      role = 'citizen',
      phone,
      dob,
      is_verified = true,
    } = req.body || {};

    if (!name || !email || !password || !phone || !dob) {
      return res.status(400).json({ error: 'name, email, password, phone and dob are required' });
    }
    if (!ADMIN_MANAGED_ROLES.has(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Phone number must be 10 digits.' });
    }
    if (!isValidDob(dob)) {
      return res.status(400).json({ error: 'Invalid date of birth format. Use YYYY-MM-DD.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }

    const existing = await pool.query(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [email]);
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const q = `
      INSERT INTO users
        (name, email, password_hash, role, phone, dob, is_verified, otp, otp_expiry, otp_attempts, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, 0, NOW(), NOW())
      RETURNING id, name, email, role, phone, dob, is_verified, created_at, updated_at;
    `;
    const values = [name, email.trim(), password, role, phone.trim(), dob, Boolean(is_verified)];
    const { rows } = await pool.query(q, values);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createUserByAdmin error:', err);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
}

async function updateUserByAdmin(req, res) {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    const fields = [];
    const values = [];
    const set = (column, value) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (patch.name !== undefined) set('name', String(patch.name || '').trim());
    if (patch.email !== undefined) {
      if (!isValidEmail(patch.email)) return res.status(400).json({ error: 'Invalid email address.' });
      set('email', String(patch.email).trim());
    }
    if (patch.phone !== undefined) {
      if (!isValidPhone(patch.phone)) return res.status(400).json({ error: 'Phone number must be 10 digits.' });
      set('phone', String(patch.phone).trim());
    }
    if (patch.dob !== undefined) {
      if (!isValidDob(patch.dob)) return res.status(400).json({ error: 'Invalid date of birth format. Use YYYY-MM-DD.' });
      set('dob', patch.dob);
    }
    if (patch.role !== undefined) {
      if (!ADMIN_MANAGED_ROLES.has(patch.role)) return res.status(400).json({ error: 'Invalid role.' });
      if (req.user?.id === id && patch.role !== 'admin') {
        return res.status(400).json({ error: 'Admins cannot remove their own admin role here.' });
      }
      set('role', patch.role);
    }
    if (patch.is_verified !== undefined) {
      set('is_verified', Boolean(patch.is_verified));
    }
    if (patch.password !== undefined && String(patch.password).trim()) {
      if (!isStrongPassword(patch.password)) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
        });
      }
      set('password_hash', patch.password);
      set('otp', null);
      set('otp_expiry', null);
      set('otp_attempts', 0);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    values.push(id);
    const q = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, name, email, role, phone, dob, is_verified, created_at, updated_at;
    `;
    const { rows } = await pool.query(q, values);
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    console.error('updateUserByAdmin error:', err);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
}

async function deleteUserByAdmin(req, res) {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Admins cannot delete their own account here.' });
    }

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, name, email, role`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ ok: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('deleteUserByAdmin error:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
}

module.exports = {
  ADMIN_MANAGED_ROLES,
  SELF_SIGNUP_ROLES,
  listUsers,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
};
