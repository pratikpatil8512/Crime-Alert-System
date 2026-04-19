// controllers/locationController.js
const pool = require('../db');

/**
 * Update current user location and record location log.
 * Body: { latitude, longitude, accuracy (optional), heading (optional) }
 * Auth required (req.user.id must exist)
 */
async function updateLocation(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { latitude, longitude, accuracy = null } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude and longitude numbers required' });
    }

    // Update current location on users table
    const updateSQL = `
      UPDATE users
      SET current_location = ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
          location_updated_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `;
    await pool.query(updateSQL, [longitude, latitude, userId]);

    // Insert into user_location_log for history and heatmap
    const insertSQL = `
      INSERT INTO user_location_log (user_id, location, recorded_at, accuracy)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2,$3),4326)::geography, NOW(), $4)
    `;
    await pool.query(insertSQL, [userId, longitude, latitude, accuracy]);

    return res.json({ ok: true });
  } catch (err) {
    console.error('updateLocation error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { updateLocation };
