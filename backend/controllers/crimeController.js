// controllers/crimeController.js
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

const CRIME_STATUS = new Set(['reported', 'verified', 'in_progress', 'resolved', 'dismissed']);
const CRIME_SEVERITY = new Set(['minor', 'moderate', 'critical']);
const RISK_RADIUS_THRESHOLDS = {
  5000: { lowMax: 20, moderateMax: 50 },
  10000: { lowMax: 40, moderateMax: 100 },
  20000: { lowMax: 80, moderateMax: 200 },
};

function normalizeRiskRadius(rawRadius) {
  const parsed = parseInt(rawRadius || '5000', 10);
  if (parsed === 10000 || parsed === 20000) return parsed;
  return 5000;
}

function formatCategoryLabel(category) {
  return String(category || 'other')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRiskBand(score, radius) {
  const thresholds = RISK_RADIUS_THRESHOLDS[radius] || RISK_RADIUS_THRESHOLDS[5000];
  if (score <= thresholds.lowMax) return 'safe';
  if (score <= thresholds.moderateMax) return 'moderate';
  return 'high';
}

function buildRiskMessage({ risk, dominantCategory, dominantCategoryShare, dominantCategoryScore }) {
  const hasDominantCategory =
    risk !== 'safe' &&
    dominantCategory &&
    dominantCategoryScore > 0 &&
    dominantCategoryShare > 0.4;

  if (risk === 'high') {
    if (hasDominantCategory) {
      return `High Risk Zone due to ${formatCategoryLabel(dominantCategory)} \uD83D\uDEA8`;
    }
    return 'High Risk Area \uD83D\uDEA8';
  }

  if (risk === 'moderate') {
    if (hasDominantCategory) {
      return `Moderate Risk due to ${formatCategoryLabel(dominantCategory)} \u26A0\uFE0F`;
    }
    return 'Moderate Risk Area \u26A0\uFE0F';
  }

  return 'Low Risk Area \uD83D\uDFE2';
}

async function logActivity(client, { crimeId, actorId, action, details }) {
  await client.query(
    `INSERT INTO crime_activity (crime_id, actor_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [crimeId, actorId || null, action, details ? JSON.stringify(details) : null]
  );
}

function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize || '20', 10)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}


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
 * GET /api/crimes
 * Management list for police/admin with filters + pagination.
 */
async function listCrimes(req, res) {
  try {
    const { page, pageSize, offset } = parsePagination(req);
    const {
      q,
      city,
      status,
      severity,
      category,
      assigned_to,
      archived // 'only' | 'include' | 'false'
    } = req.query;

    const where = [];
    const params = [];
    const add = (sql, value) => {
      params.push(value);
      where.push(sql.replace('$?', `$${params.length}`));
    };
    const addMany = (sql, values) => {
      let rendered = sql;
      for (const v of values) {
        params.push(v);
        rendered = rendered.replace('$?', `$${params.length}`);
      }
      where.push(rendered);
    };

    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`;
      addMany(`(c.title ILIKE $? OR c.description ILIKE $? OR c.id::text ILIKE $?)`, [term, term, term]);
    }
    if (city) add(`(c.city ILIKE $?)`, `%${String(city).trim()}%`);
    if (status && CRIME_STATUS.has(status)) add(`c.status = $?`, status);
    if (severity && CRIME_SEVERITY.has(severity)) add(`c.severity = $?`, severity);
    if (category) add(`c.category = $?`, category);
    if (assigned_to) add(`c.assigned_to = $?`, assigned_to);

    if (archived === 'only') {
      where.push(`c.archived_at IS NOT NULL`);
    } else if (archived === 'include') {
      // no-op
    } else {
      where.push(`c.archived_at IS NULL`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countQ = `
      SELECT COUNT(*)::int AS total
      FROM crime_data c
      ${whereSql};
    `;
    const listQ = `
      SELECT
        c.id,
        c.title,
        c.description,
        c.category,
        c.severity,
        c.status,
        c.city,
        c.address,
        c.incident_time,
        c.created_at,
        c.updated_at,
        c.reporter_id,
        c.verified_by,
        c.assigned_to,
        c.priority,
        c.archived_at,
        c.archived_by,
        c.archived_reason,
        ST_X(c.location::geometry) AS longitude,
        ST_Y(c.location::geometry) AS latitude
      FROM crime_data c
      ${whereSql}
      ORDER BY c.incident_time DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2};
    `;

    const [{ rows: countRows }, { rows }] = await Promise.all([
      pool.query(countQ, params),
      pool.query(listQ, [...params, pageSize, offset]),
    ]);

    return res.json({
      page,
      pageSize,
      total: countRows[0]?.total ?? 0,
      rows,
    });
  } catch (err) {
    console.error('listCrimes error', err);
    if (err?.code === '42703' || err?.code === '42P01') {
      return res.status(500).json({
        error: 'Database schema is missing Manage Crimes workflow fields.',
        hint: 'Run backend/migrations/001_manage_crimes_workflow.sql on your database, then restart the backend.',
      });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/crimes/:id
 * Returns full details + notes + activity timeline.
 */
async function getCrimeById(req, res) {
  try {
    const { id } = req.params;
    const crimeQ = `
      SELECT
        c.*,
        ST_X(c.location::geometry) AS longitude,
        ST_Y(c.location::geometry) AS latitude
      FROM crime_data c
      WHERE c.id = $1
      LIMIT 1;
    `;
    const notesQ = `
      SELECT n.id, n.note, n.created_at, n.author_id,
             u.name AS author_name, u.email AS author_email
      FROM crime_notes n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE n.crime_id = $1
      ORDER BY n.created_at DESC
      LIMIT 200;
    `;
    const activityQ = `
      SELECT a.id, a.action, a.details, a.created_at, a.actor_id,
             u.name AS actor_name, u.email AS actor_email
      FROM crime_activity a
      LEFT JOIN users u ON u.id = a.actor_id
      WHERE a.crime_id = $1
      ORDER BY a.created_at DESC
      LIMIT 200;
    `;

    const crimePromise = pool.query(crimeQ, [id]);
    const notesPromise = pool.query(notesQ, [id]).catch((e) => {
      if (e?.code === '42P01') return { rows: [] };
      throw e;
    });
    const activityPromise = pool.query(activityQ, [id]).catch((e) => {
      if (e?.code === '42P01') return { rows: [] };
      throw e;
    });

    const [{ rows: crimeRows }, { rows: notes }, { rows: activity }] = await Promise.all([
      crimePromise,
      notesPromise,
      activityPromise,
    ]);

    if (!crimeRows[0]) return res.status(404).json({ error: 'Crime not found' });
    return res.json({ crime: crimeRows[0], notes, activity });
  } catch (err) {
    console.error('getCrimeById error', err);
    if (err?.code === '42P01') {
      return res.status(500).json({
        error: 'Database schema is missing Manage Crimes workflow tables.',
        hint: 'Run backend/migrations/001_manage_crimes_workflow.sql on your database, then restart the backend.',
      });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * PATCH /api/crimes/:id
 * Body: { status?, category?, severity?, assigned_to?, priority?, evidence_url? }
 */
async function patchCrime(req, res) {
  const actorId = req.user?.id;
  const { id } = req.params;
  const patch = req.body || {};

  const fields = [];
  const values = [];
  const set = (col, val) => {
    values.push(val);
    fields.push(`${col} = $${values.length}`);
  };

  if (patch.status !== undefined) {
    if (!CRIME_STATUS.has(patch.status)) return res.status(400).json({ error: 'Invalid status' });
    set('status', patch.status);
  }
  if (patch.category !== undefined) set('category', patch.category);
  if (patch.severity !== undefined) {
    if (!CRIME_SEVERITY.has(patch.severity)) return res.status(400).json({ error: 'Invalid severity' });
    set('severity', patch.severity);
  }
  if (patch.assigned_to !== undefined) set('assigned_to', patch.assigned_to || null);
  if (patch.priority !== undefined) set('priority', patch.priority);
  if (patch.evidence_url !== undefined) set('evidence_url', patch.evidence_url);

  if (!fields.length) return res.status(400).json({ error: 'No valid fields to update' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    values.push(id);
    const updateQ = `
      UPDATE crime_data
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id;
    `;
    const { rows } = await client.query(updateQ, values);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Crime not found' });
    }

    await logActivity(client, {
      crimeId: id,
      actorId,
      action: 'crime_patch',
      details: { patch },
    });

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('patchCrime error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/crimes/bulk
 * Body: { ids: uuid[], patch: { status?, category?, severity?, assigned_to?, priority? } }
 */
async function bulkPatchCrimes(req, res) {
  const actorId = req.user?.id;
  const { ids, patch } = req.body || {};

  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array' });
  if (!patch || typeof patch !== 'object') return res.status(400).json({ error: 'patch is required' });

  const allowed = {};
  if (patch.status !== undefined) {
    if (!CRIME_STATUS.has(patch.status)) return res.status(400).json({ error: 'Invalid status' });
    allowed.status = patch.status;
  }
  if (patch.category !== undefined) allowed.category = patch.category;
  if (patch.severity !== undefined) {
    if (!CRIME_SEVERITY.has(patch.severity)) return res.status(400).json({ error: 'Invalid severity' });
    allowed.severity = patch.severity;
  }
  if (patch.assigned_to !== undefined) allowed.assigned_to = patch.assigned_to || null;
  if (patch.priority !== undefined) allowed.priority = patch.priority;
  if (!Object.keys(allowed).length) return res.status(400).json({ error: 'No valid fields in patch' });

  const sets = [];
  const params = [];
  Object.entries(allowed).forEach(([k, v]) => {
    params.push(v);
    sets.push(`${k} = $${params.length}`);
  });

  params.push(ids);
  const idsParam = `$${params.length}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updateQ = `
      UPDATE crime_data
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = ANY(${idsParam}::uuid[])
      RETURNING id;
    `;
    const { rows } = await client.query(updateQ, params);

    for (const r of rows) {
      await logActivity(client, {
        crimeId: r.id,
        actorId,
        action: 'crime_bulk_patch',
        details: { patch: allowed },
      });
    }

    await client.query('COMMIT');
    return res.json({ ok: true, updated: rows.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('bulkPatchCrimes error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/crimes/:id/notes
 * Body: { note: string }
 */
async function addCrimeNote(req, res) {
  const actorId = req.user?.id;
  const { id } = req.params;
  const { note } = req.body || {};
  if (!note || !String(note).trim()) return res.status(400).json({ error: 'note is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const crimeExists = await client.query(`SELECT 1 FROM crime_data WHERE id=$1`, [id]);
    if (!crimeExists.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Crime not found' });
    }

    await client.query(
      `INSERT INTO crime_notes (crime_id, author_id, note) VALUES ($1, $2, $3)`,
      [id, actorId || null, String(note).trim()]
    );
    await logActivity(client, { crimeId: id, actorId, action: 'note_added', details: { note: String(note).trim() } });

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('addCrimeNote error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/crimes/bulk/notes
 * Body: { ids: uuid[], note: string }
 */
async function bulkAddCrimeNote(req, res) {
  const actorId = req.user?.id;
  const { ids, note } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array' });
  if (!note || !String(note).trim()) return res.status(400).json({ error: 'note is required' });

  const cleanNote = String(note).trim();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const crimeId of ids) {
      await client.query(
        `INSERT INTO crime_notes (crime_id, author_id, note) VALUES ($1, $2, $3)`,
        [crimeId, actorId || null, cleanNote]
      );
      await logActivity(client, { crimeId, actorId, action: 'bulk_note_added', details: { note: cleanNote } });
    }
    await client.query('COMMIT');
    return res.json({ ok: true, created: ids.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('bulkAddCrimeNote error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/crimes/:id/archive
 * Body: { reason?: string }
 */
async function archiveCrime(req, res) {
  const actorId = req.user?.id;
  const { id } = req.params;
  const { reason } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE crime_data
       SET archived_at = NOW(), archived_by = $2, archived_reason = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, actorId || null, reason || null]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Crime not found' });
    }
    await logActivity(client, { crimeId: id, actorId, action: 'archived', details: { reason: reason || null } });
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('archiveCrime error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/crimes/:id/restore
 */
async function restoreCrime(req, res) {
  const actorId = req.user?.id;
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE crime_data
       SET archived_at = NULL, archived_by = NULL, archived_reason = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Crime not found' });
    }
    await logActivity(client, { crimeId: id, actorId, action: 'restored', details: null });
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('restoreCrime error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/crimes/bulk/archive
 * Body: { ids: uuid[], reason?: string }
 */
async function bulkArchiveCrimes(req, res) {
  const actorId = req.user?.id;
  const { ids, reason } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE crime_data
       SET archived_at = NOW(), archived_by = $2, archived_reason = $3, updated_at = NOW()
       WHERE id = ANY($1::uuid[])
       RETURNING id`,
      [ids, actorId || null, reason || null]
    );
    for (const r of rows) {
      await logActivity(client, { crimeId: r.id, actorId, action: 'bulk_archived', details: { reason: reason || null } });
    }
    await client.query('COMMIT');
    return res.json({ ok: true, updated: rows.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('bulkArchiveCrimes error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/crimes/bulk/restore
 * Body: { ids: uuid[] }
 */
async function bulkRestoreCrimes(req, res) {
  const actorId = req.user?.id;
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE crime_data
       SET archived_at = NULL, archived_by = NULL, archived_reason = NULL, updated_at = NOW()
       WHERE id = ANY($1::uuid[])
       RETURNING id`,
      [ids]
    );
    for (const r of rows) {
      await logActivity(client, { crimeId: r.id, actorId, action: 'bulk_restored', details: null });
    }
    await client.query('COMMIT');
    return res.json({ ok: true, updated: rows.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('bulkRestoreCrimes error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
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
      WHERE archived_at IS NULL
        AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
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
        WHERE archived_at IS NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
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

/**
 * GET /api/crimes/risk-level
 * Returns weighted risk within a supported radius for the last 7 days.
 * Query params: lat, lng, radius (5000 | 10000 | 20000)
 */
async function getRiskLevel(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = normalizeRiskRadius(req.query.radius);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const q = `
      WITH filtered AS (
        SELECT
          category,
          severity,
          CASE
            WHEN severity = 'minor' THEN 1
            WHEN severity = 'moderate' THEN 2
            WHEN severity = 'critical' THEN 3
            ELSE 0
          END AS severity_weight
        FROM crime_data
        WHERE archived_at IS NULL
          AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
          $3
        )
          AND created_at >= NOW() - INTERVAL '7 days'
      ),
      totals AS (
        SELECT
          COUNT(*)::int AS crime_count,
          COALESCE(SUM(severity_weight), 0)::int AS overall_score
        FROM filtered
      ),
      category_scores AS (
        SELECT
          COALESCE(NULLIF(TRIM(category), ''), 'other') AS category,
          COUNT(*)::int AS total_cases,
          COALESCE(SUM(severity_weight), 0)::int AS category_score
        FROM filtered
        GROUP BY COALESCE(NULLIF(TRIM(category), ''), 'other')
      )
      SELECT
        t.crime_count,
        t.overall_score,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'category', c.category,
              'totalCases', c.total_cases,
              'categoryScore', c.category_score
            )
            ORDER BY c.category_score DESC, c.total_cases DESC, c.category ASC
          ) FILTER (WHERE c.category IS NOT NULL),
          '[]'::json
        ) AS category_breakdown
      FROM totals t
      LEFT JOIN category_scores c ON TRUE
      GROUP BY t.crime_count, t.overall_score;
    `;

    const { rows } = await pool.query(q, [lng, lat, radius]);
    const result = rows[0] || {
      crime_count: 0,
      overall_score: 0,
      category_breakdown: [],
    };

    const crimeCount = Number(result.crime_count || 0);
    const overallScore = Number(result.overall_score || 0);
    const categoryBreakdown = Array.isArray(result.category_breakdown)
      ? result.category_breakdown.map((item) => ({
          category: item.category,
          totalCases: Number(item.totalCases || item.totalcases || 0),
          categoryScore: Number(item.categoryScore || item.categoryscore || 0),
        }))
      : [];

    const dominantCategoryEntry = categoryBreakdown[0] || null;
    const dominantCategory = dominantCategoryEntry?.category || null;
    const dominantCategoryScore = dominantCategoryEntry?.categoryScore || 0;
    const dominantCategoryShare = overallScore > 0 ? dominantCategoryScore / overallScore : 0;
    const risk = getRiskBand(overallScore, radius);
    const alertMessage = buildRiskMessage({
      risk,
      dominantCategory,
      dominantCategoryShare,
      dominantCategoryScore,
    });

    return res.json({
      risk,
      radius,
      radiusKm: radius / 1000,
      timeWindowDays: 7,
      crimeCount,
      overallScore,
      alertMessage,
      dominantCategory,
      dominantCategoryLabel: dominantCategory ? formatCategoryLabel(dominantCategory) : null,
      dominantCategoryScore,
      dominantCategoryShare,
      categoryBreakdown,
    });
  } catch (err) {
    console.error('getRiskLevel error', err);
    return res.status(500).json({ error: 'Failed to calculate risk level.' });
  }
}

module.exports = {
  createCrime,
  getNearbyCrimes,
  getHeatmap,
  getRiskLevel,
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
};
