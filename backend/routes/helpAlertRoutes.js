const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');
const {
  createHelpAlert,
  listActiveHelpAlerts,
  listMyHelpAlerts,
  claimHelpAlert,
  resolveHelpAlert,
} = require('../controllers/helpAlertController');

router.post('/help', authenticateToken, createHelpAlert);
router.get('/help/mine', authenticateToken, listMyHelpAlerts);
router.get('/help', authenticateToken, authorizeRole('admin', 'police'), listActiveHelpAlerts);
router.patch('/help/:id/claim', authenticateToken, authorizeRole('admin', 'police'), claimHelpAlert);
router.patch('/help/:id/resolve', authenticateToken, authorizeRole('admin', 'police'), resolveHelpAlert);

module.exports = router;
