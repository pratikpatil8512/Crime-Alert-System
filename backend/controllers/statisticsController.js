// controllers/statisticsController.js
const pool = require('../db');

async function getStatistics(req, res) {
  try {
    // --- 1️⃣ Overview Counters ---
    const totalCrimes = await pool.query(
      'SELECT COUNT(*)::int AS count FROM crime_data WHERE archived_at IS NULL'
    );
    const totalAlerts = await pool.query('SELECT COUNT(*)::int AS count FROM alert');
    const resolvedCases = await pool.query(
      "SELECT COUNT(*)::int AS count FROM crime_data WHERE archived_at IS NULL AND status = 'resolved'"
    );
    const totalUsers = await pool.query('SELECT COUNT(*)::int AS count FROM users');

    // --- 2️⃣ Crimes by Category (Pie Chart) ---
    const crimesByCategory = await pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM crime_data
      WHERE archived_at IS NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10;
    `);

    // --- 3️⃣ Crimes by Severity (Bar Chart) ---
    const crimesBySeverity = await pool.query(`
      SELECT severity, COUNT(*)::int AS count
      FROM crime_data
      WHERE archived_at IS NULL
      GROUP BY severity
      ORDER BY severity;
    `);

    // --- 4️⃣ Crimes in Last 7 Days (Line Chart / Trend) ---
    const crimesLast7Days = await pool.query(`
      SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
      FROM crime_data
      WHERE archived_at IS NULL
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY created_at::date
      ORDER BY date ASC;
    `);

    // --- 5️⃣ Crimes by City (Map summary) ---
    const crimesByCity = await pool.query(`
      SELECT city, COUNT(*)::int AS count
      FROM crime_data
      WHERE archived_at IS NULL
        AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC;
    `);

    // --- 6️⃣ Crime trend — daily (last 90 days) ---
    const crimesTrendDaily = await pool.query(`
      SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS period, COUNT(*)::int AS count
      FROM crime_data
      WHERE archived_at IS NULL
        AND created_at >= NOW() - INTERVAL '90 days'
      GROUP BY created_at::date
      ORDER BY period ASC;
    `);

    // --- 7️⃣ Weekly counts (last ~12 weeks) ---
    const crimesTrendWeekly = await pool.query(`
      SELECT
        TO_CHAR(date_trunc('week', created_at)::date, 'YYYY-MM-DD') AS period,
        COUNT(*)::int AS count
      FROM crime_data
      WHERE archived_at IS NULL
        AND created_at >= NOW() - INTERVAL '84 days'
      GROUP BY date_trunc('week', created_at)
      ORDER BY date_trunc('week', created_at) ASC;
    `);

    // --- 8️⃣ Monthly counts (last 24 months) ---
    const crimesTrendMonthly = await pool.query(`
      SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS period,
             COUNT(*)::int AS count
      FROM crime_data
      WHERE archived_at IS NULL
        AND created_at >= NOW() - INTERVAL '24 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC;
    `);

    // --- 9️⃣ Points for density / heat-style map (cap for payload size) ---
    const heatmapPoints = await pool.query(`
      SELECT
        ST_Y(location::geometry)::double precision AS latitude,
        ST_X(location::geometry)::double precision AS longitude,
        severity::text AS severity,
        category,
        TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date
      FROM crime_data
      WHERE archived_at IS NULL
        AND location IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1200;
    `);

    // --- Response Object ---
    const stats = {
      overview: {
        totalCrimes: totalCrimes.rows[0].count,
        activeAlerts: totalAlerts.rows[0].count,
        resolvedCases: resolvedCases.rows[0].count,
        totalUsers: totalUsers.rows[0].count
      },
      crimesByCategory: crimesByCategory.rows,
      crimesBySeverity: crimesBySeverity.rows,
      crimesLast7Days: crimesLast7Days.rows,
      crimesByCity: crimesByCity.rows,
      crimesTrendDaily: crimesTrendDaily.rows,
      crimesTrendWeekly: crimesTrendWeekly.rows,
      crimesTrendMonthly: crimesTrendMonthly.rows,
      heatmapPoints: heatmapPoints.rows
    };

    return res.json(stats);
  } catch (err) {
    console.error('getStatistics error:', err);
    return res.status(500).json({ error: 'Unable to fetch statistics' });
  }
}

module.exports = { getStatistics };
