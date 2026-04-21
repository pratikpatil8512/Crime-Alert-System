const express = require('express');
const router = express.Router();
const { getStatistics } = require('../controllers/statisticsController');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

router.get(
  '/statistics',
  authenticateToken,
  authorizeRole('admin', 'police'),
  getStatistics
);

module.exports = router;
