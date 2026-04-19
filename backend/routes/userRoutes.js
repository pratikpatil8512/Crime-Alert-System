import express from 'express';
import pool from '../db.js'; // or wherever your pool is defined
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔹 Update user's current location
router.put('/update-location', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // from JWT
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude)
      return res.status(400).json({ error: 'Latitude and longitude are required.' });

    await pool.query(
      `UPDATE users
       SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           location_updated_at = NOW()
       WHERE id = $3`,
      [longitude, latitude, userId]
    );

    res.json({ message: 'Location updated successfully' });
  } catch (err) {
    console.error('Location update error:', err);
    res.status(500).json({ error: 'Failed to update user location' });
  }
});

export default router;
