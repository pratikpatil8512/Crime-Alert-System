// controllers/statisticsController.js
const pool = require('../db');

async function getStatistics(req, res) {
  try {
    // --- 1️⃣ Overview Counters ---
    const totalCrimes = await pool.query('SELECT COUNT(*)::int AS count FROM crime_data');
    const totalAlerts = await pool.query('SELECT COUNT(*)::int AS count FROM alert');
    const unresolvedComplaints = await pool.query(
      "SELECT COUNT(*)::int AS count FROM complaint WHERE status IS DISTINCT FROM 'resolved'"
    );
    const totalUsers = await pool.query('SELECT COUNT(*)::int AS count FROM users');

    // --- 2️⃣ Crimes by Category (Pie Chart) ---
    const crimesByCategory = await pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM crime_data
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10;
    `);

    // --- 3️⃣ Crimes by Severity (Bar Chart) ---
    const crimesBySeverity = await pool.query(`
      SELECT severity, COUNT(*)::int AS count
      FROM crime_data
      GROUP BY severity
      ORDER BY severity;
    `);

    // --- 4️⃣ Crimes in Last 7 Days (Line Chart / Trend) ---
    const crimesLast7Days = await pool.query(`
      SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
      FROM crime_data
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY created_at::date
      ORDER BY date ASC;
    `);

    // --- 5️⃣ Crimes by City (Map summary) ---
    const crimesByCity = await pool.query(`
      SELECT city, COUNT(*)::int AS count
      FROM crime_data
      WHERE city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC;
    `);

    // --- 6️⃣ Response Object ---
    const stats = {
      overview: {
        totalCrimes: totalCrimes.rows[0].count,
        activeAlerts: totalAlerts.rows[0].count,
        unresolvedComplaints: unresolvedComplaints.rows[0].count,
        totalUsers: totalUsers.rows[0].count
      },
      crimesByCategory: crimesByCategory.rows,
      crimesBySeverity: crimesBySeverity.rows,
      crimesLast7Days: crimesLast7Days.rows,
      crimesByCity: crimesByCity.rows
    };

    return res.json(stats);
  } catch (err) {
    console.error('getStatistics error:', err);
    return res.status(500).json({ error: 'Unable to fetch statistics' });
  }
}

module.exports = { getStatistics };
