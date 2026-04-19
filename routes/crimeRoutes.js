// routes/crimeRoutes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authMiddleware');
const pool = require('../db'); // ✅ Ensure this path is correct

/**
 * 🧩 REPORT A CRIME
 * Automatically attaches reporter_id from JWT payload
 * Stores location using PostGIS geography(Point, 4326)
 */
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const reporterId = req.user.id; // ✅ extracted from token
    const { title, description, category, severity, latitude, longitude } = req.body;

    // Basic validation
    if (!title || !description || !category || !severity || !latitude || !longitude) {
      return res.status(400).json({ error: 'All fields including location are required.' });
    }

    // ✅ Insert into crime_data (matches your schema)
    await pool.query(
      `INSERT INTO crime_data 
       (id, reporter_id, title, description, category, severity, location, status, created_at)
       VALUES (
         gen_random_uuid(),
         $1, $2, $3, $4, $5,
         ST_SetSRID(ST_MakePoint($6, $7), 4326),
         'reported',
         NOW()
       )`,
      [reporterId, title, description, category, severity, longitude, latitude]
    );

    res.status(201).json({ message: 'Crime reported successfully!' });
  } catch (err) {
    console.error('❌ Error reporting crime:', err);
    res.status(500).json({ error: 'Failed to register crime.' });
  }
});

/**
 * 🧭 GET NEARBY CRIMES (within 3km radius)
 */
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const result = await pool.query(
      `SELECT id, title, category, severity,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude
       FROM crime_data
       WHERE ST_DWithin(
         location::geography,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
         3000
       )
       ORDER BY reported_at DESC`,
      [lng, lat]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Nearby crimes fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch nearby crimes.' });
  }
});

/**
 * 🔥 GET HEATMAP DATA (all crimes)
 */
router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, category, severity,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude
       FROM crime_data
       ORDER BY reported_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Heatmap fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch heatmap data.' });
  }
});

module.exports = router;
