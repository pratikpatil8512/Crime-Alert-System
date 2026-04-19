// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
  try {
    // 🔹 Check for Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    // 🔹 Validate header format ("Bearer <token>")
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Authorization header malformed' });
    }

    const token = parts[1];
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    // 🔹 Ensure JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // 🔹 Verify and decode token
    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) {
        console.warn('⚠️ Token verification failed:', err.message);
        return res.status(403).json({ message: 'Token invalid or expired' });
      }

      // ✅ Attach decoded payload to req.user
      // Example payload: { id, role, email, iat, exp }
      req.user = payload;

      // Optional: Quick log for debugging
      // console.log('Authenticated user:', req.user);

      next();
    });
  } catch (err) {
    console.error('Error in authenticateToken:', err);
    res.status(500).json({ message: 'Internal authentication error' });
  }
}

module.exports = authenticateToken;
