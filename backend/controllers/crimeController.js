// controllers/crimeController.js
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');


/**
 * Create a new crime report.
 * Body: { title, description, category, severity, city, latitude, longitude, incident_time }
 */
async function createCrime(req, res) {
  try {
    const reporterId = req.user ? req.user.id : null; // allow anonymous if you want (change if required)
    const {
      title, description = null, category = 'other', severity = 'minor',
      city = null, latitude, longitude, incident_time = null
    } = req.body;

    if (!title || !category || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'title, category, latitude and longitude are required' });
    }

    const id = uuidv4();
    const insertSQL = `
      INSERT INTO crime_data (
        id, reporter_id, title, description, category, severity, city,
        location, incident_time, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,
        ST_SetSRID(ST_MakePoint($8,$9),4326)::geography,
        COALESCE($10, NOW()), NOW(), NOW())
      RETURNING id;
    `;

    const values = [id, reporterId, title, description, category, severity, city, longitude, latitude, incident_time];
    const result = await pool.query(insertSQL, values);
    // optional: create alert & notify nearby users (sendAlertToNearby)
    return res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('createCrime error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET nearby crimes using lat, lng, radius (meters)
 * Query params: lat, lng, radius (optional, default 3000)
 */
async function getNearbyCrimes(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius || '3000', 10);

    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const q = `
      SELECT id, title, description, category, severity,
             ST_X(location::geometry) AS longitude,
             ST_Y(location::geometry) AS latitude,
             incident_time, created_at
      FROM crime_data
      WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
      ORDER BY incident_time DESC
      LIMIT 1000;
    `;
    const { rows } = await pool.query(q, [lng, lat, radius]);
    return res.json(rows);
  } catch (err) {
    console.error('getNearbyCrimes error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET heatmap points within radius
 * Returns points with intensity (count aggregated by rounded grid), optional time window.
 * Query params: lat, lng, radius (m), window_hours (optional)
 */
async function getHeatmap(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius || '3000', 10);
    const windowHours = parseInt(req.query.window_hours || '168', 10); // default 7 days

    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    // Grid size in degrees — using 0.005 ~ approx 500m (approximate; better to use ST_SnapToGrid or ST_ClusterDBSCAN for production)
    // Using ST_ClusterDBSCAN could be heavier; we use ST_SnapToGrid for aggregated heat points.
    const q = `
      SELECT
        ST_X(ST_Centroid(geom)) AS longitude,
        ST_Y(ST_Centroid(geom)) AS latitude,
        SUM(cnt) AS intensity
      FROM (
        SELECT ST_SnapToGrid(location::geometry, 0.002, 0.002) AS geom, COUNT(*) AS cnt
        FROM crime_data
        WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
          AND created_at >= NOW() - ($4 || ' hours')::interval
        GROUP BY ST_SnapToGrid(location::geometry, 0.002, 0.002)
      ) grid
      GROUP BY geom
      ORDER BY intensity DESC
      LIMIT 1000;
    `;
    const { rows } = await pool.query(q, [lng, lat, radius, windowHours]);
    // rows: [{ longitude, latitude, intensity }]
    return res.json(rows);
  } catch (err) {
    console.error('getHeatmap error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createCrime, getNearbyCrimes, getHeatmap };
