// routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { updateLocation } = require('../controllers/locationController');

router.post('/update', authenticateToken, updateLocation);

module.exports = router;
