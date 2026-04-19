// middleware/authorizeRole.js
module.exports = function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) return res.status(401).json({ error: 'Unauthorized' });
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
      }
      next();
    } catch (err) {
      console.error('authorizeRole error', err);
      res.status(500).json({ error: 'Server error' });
    }
  };
};
