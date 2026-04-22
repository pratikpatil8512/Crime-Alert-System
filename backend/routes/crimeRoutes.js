// routes/crimeRoutes.js
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');              // ✔ required
const authorizeRole = require('../middleware/authorizeRole');                  // ✔ role protection
const pool = require('../db');                                                 // ✔ db connection

// Import controller functions
const {
  createCrime,
  getNearbyCrimes,
  getHeatmap,
  listCrimes,
  getCrimeById,
  patchCrime,
  bulkPatchCrimes,
  addCrimeNote,
  bulkAddCrimeNote,
  archiveCrime,
  restoreCrime,
  bulkArchiveCrimes,
  bulkRestoreCrimes,
} = require('../controllers/crimeController'); // 📌 from crimeController.js

/**
 * 🧭 MANAGEMENT: List crimes (Police/Admin)
 * Supports filters + pagination.
 */
router.get(
  '/',
  authenticateToken,
  authorizeRole('admin', 'police'),
  listCrimes
);

/**
 * 👮 MANAGEMENT: List police users for assignment (Police/Admin)
 */
router.get(
  '/police-users',
  authenticateToken,
  authorizeRole('admin', 'police'),
  async (req, res) => {
    try {
      const q = `
        SELECT id, name, email, phone
        FROM users
        WHERE role = 'police'
        ORDER BY name ASC
        LIMIT 500;
      `;
      const { rows } = await pool.query(q);
      return res.json(rows);
    } catch (err) {
      console.error('❌ Error fetching police users:', err);
      return res.status(500).json({ error: 'Failed to fetch police users' });
    }
  }
);

/**
 * 🚔 CREATE CRIME REPORT (Restricted to Police/Admin)
 * Citizens/Tourists are NOT allowed to create crimes — they submit tips instead
 */
router.post(
  '/report',
  authenticateToken,
  authorizeRole('admin', 'police'), // ⛔ role restriction added
  createCrime
);

/**
 * 📍 GET NEARBY CRIMES (User View) - Available to all logged-in users
 * Radius default = 3000m unless overwritten by query param
 */
router.get('/nearby', authenticateToken, getNearbyCrimes);

/**
 * 🧺 MANAGEMENT: Bulk operations (Police/Admin)
 */
router.post(
  '/bulk',
  authenticateToken,
  authorizeRole('admin', 'police'),
  bulkPatchCrimes
);
router.post(
  '/bulk/notes',
  authenticateToken,
  authorizeRole('admin', 'police'),
  bulkAddCrimeNote
);
router.post(
  '/bulk/archive',
  authenticateToken,
  authorizeRole('admin', 'police'),
  bulkArchiveCrimes
);
router.post(
  '/bulk/restore',
  authenticateToken,
  authorizeRole('admin', 'police'),
  bulkRestoreCrimes
);

/**
 * 📊 GET CATEGORY-WISE CRIME COUNT WITHIN 5KM
 */
router.get('/nearby/stats', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const query = `
      SELECT category, COUNT(*) AS count
      FROM crime_data
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
        5000
      )
      GROUP BY category
      ORDER BY count DESC;
    `;

    const result = await pool.query(query, [lng, lat]);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching nearby crime stats:', err);
    res.status(500).json({ error: 'Failed to fetch nearby crime statistics.' });
  }
});

/**
 * 🔥 GET HEATMAP DATA - Used by dashboard map
 */
router.get('/heatmap', authenticateToken, getHeatmap);

/**
 * 🚨 RISK LEVEL CHECK (1 KM RADIUS ALERT SYSTEM)
 * Returns safety level message: safe | moderate | high
 */
router.get('/risk-level', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location required.' });
    }

    const query = `
      SELECT COUNT(*) AS count
      FROM crime_data
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
        1000 -- 1 KM radius
      );
    `;

    const result = await pool.query(query, [lng, lat]);
    const crimeCount = parseInt(result.rows[0].count);

    // Apply threshold logic
    let risk = 'safe';
    if (crimeCount >= 3 && crimeCount <= 6) risk = 'moderate';
    if (crimeCount >= 7) risk = 'high';

    res.json({ risk, crimeCount });
  } catch (err) {
    console.error('❌ Risk check error:', err);
    res.status(500).json({ error: 'Failed to calculate risk level.' });
  }
});

/**
 * 🧾 MANAGEMENT: Crime detail (Police/Admin)
 * Keep these routes AFTER static routes like /risk-level to avoid collisions.
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'police'),
  getCrimeById
);

/**
 * ✍️ MANAGEMENT: Patch crime fields (Police/Admin)
 */
router.patch(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'police'),
  patchCrime
);

/**
 * ✍️ MANAGEMENT: Add note to a crime (Police/Admin)
 */
router.post(
  '/:id/notes',
  authenticateToken,
  authorizeRole('admin', 'police'),
  addCrimeNote
);

/**
 * 🗃️ MANAGEMENT: Archive/Restore single crime (Police/Admin)
 */
router.post(
  '/:id/archive',
  authenticateToken,
  authorizeRole('admin', 'police'),
  archiveCrime
);
router.post(
  '/:id/restore',
  authenticateToken,
  authorizeRole('admin', 'police'),
  restoreCrime
);

module.exports = router;
