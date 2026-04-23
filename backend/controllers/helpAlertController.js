const pool = require('../db');

function normalizeHelpMessage(rawMessage) {
  const text = String(rawMessage || '').trim();
  if (!text) return 'Need help at my current location. Please respond urgently.';
  return text.slice(0, 1000);
}

function toHelpStatus(row) {
  if (!row?.active) return 'resolved';
  if (row?.acknowledged_at) return 'claimed';
  return 'new';
}

async function createHelpAlert(req, res) {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { latitude, longitude, message, city = null } = req.body || {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const userRes = await pool.query(
      `SELECT id, name, email, role, phone
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [user.id]
    );
    const actor = userRes.rows[0];
    if (!actor) return res.status(404).json({ error: 'User not found' });

    const title = `Help Request from ${actor.name || actor.email || 'User'}`;
    const normalizedMessage = normalizeHelpMessage(message);

    const q = `
      INSERT INTO alert (
        title,
        message,
        city,
        location,
        radius_m,
        alert_type,
        active,
        created_by,
        starts_at,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
        1000,
        'help',
        TRUE,
        $6,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        title,
        message,
        city,
        alert_type,
        active,
        acknowledged_by,
        acknowledged_at,
        created_by,
        starts_at,
        created_at,
        ST_X(location::geometry) AS longitude,
        ST_Y(location::geometry) AS latitude;
    `;

    const { rows } = await pool.query(q, [
      title,
      normalizedMessage,
      city,
      longitude,
      latitude,
      user.id,
    ]);

    const payload = {
      ...rows[0],
      status: toHelpStatus(rows[0]),
      reporter: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        phone: actor.phone,
        role: actor.role,
      },
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('help-request:new', payload);
    }

    return res.status(201).json(payload);
  } catch (err) {
    console.error('createHelpAlert error:', err);
    return res.status(500).json({ error: 'Failed to send help request.' });
  }
}

async function listActiveHelpAlerts(req, res) {
  try {
    const q = `
      SELECT
        a.id,
        a.title,
        a.message,
        a.city,
        a.alert_type,
        a.active,
        a.acknowledged_by,
        a.acknowledged_at,
        a.created_by,
        a.starts_at,
        a.expires_at,
        a.created_at,
        ST_X(a.location::geometry) AS longitude,
        ST_Y(a.location::geometry) AS latitude,
        u.name AS reporter_name,
        u.email AS reporter_email,
        u.phone AS reporter_phone,
        u.role AS reporter_role,
        ack.name AS acknowledged_by_name,
        ack.email AS acknowledged_by_email,
        ack.role AS acknowledged_by_role
      FROM alert a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN users ack ON ack.id = a.acknowledged_by
      WHERE a.alert_type = 'help'
      ORDER BY a.created_at DESC
      LIMIT 200;
    `;

    const { rows } = await pool.query(q);
    const data = rows.map((row) => ({
      ...row,
      status: toHelpStatus(row),
      reporter: {
        name: row.reporter_name,
        email: row.reporter_email,
        phone: row.reporter_phone,
        role: row.reporter_role,
      },
      acknowledgedBy: row.acknowledged_by
        ? {
            id: row.acknowledged_by,
            name: row.acknowledged_by_name,
            email: row.acknowledged_by_email,
            role: row.acknowledged_by_role,
          }
        : null,
    }));
    return res.json(data);
  } catch (err) {
    console.error('listActiveHelpAlerts error:', err);
    return res.status(500).json({ error: 'Failed to fetch help requests.' });
  }
}

async function listMyHelpAlerts(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const q = `
      SELECT
        a.id,
        a.title,
        a.message,
        a.city,
        a.alert_type,
        a.active,
        a.acknowledged_by,
        a.acknowledged_at,
        a.created_by,
        a.starts_at,
        a.expires_at,
        a.created_at,
        ST_X(a.location::geometry) AS longitude,
        ST_Y(a.location::geometry) AS latitude,
        ack.name AS acknowledged_by_name,
        ack.email AS acknowledged_by_email,
        ack.role AS acknowledged_by_role
      FROM alert a
      LEFT JOIN users ack ON ack.id = a.acknowledged_by
      WHERE a.alert_type = 'help' AND a.created_by = $1
      ORDER BY a.created_at DESC
      LIMIT 50;
    `;
    const { rows } = await pool.query(q, [req.user.id]);
    return res.json(
      rows.map((row) => ({
        ...row,
        status: toHelpStatus(row),
        acknowledgedBy: row.acknowledged_by
          ? {
              id: row.acknowledged_by,
              name: row.acknowledged_by_name,
              email: row.acknowledged_by_email,
              role: row.acknowledged_by_role,
            }
          : null,
      }))
    );
  } catch (err) {
    console.error('listMyHelpAlerts error:', err);
    return res.status(500).json({ error: 'Failed to fetch your help requests.' });
  }
}

async function claimHelpAlert(req, res) {
  try {
    const { id } = req.params;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await pool.query(
      `SELECT id, active, acknowledged_by, acknowledged_at
       FROM alert
       WHERE id = $1 AND alert_type = 'help'
       LIMIT 1`,
      [id]
    );

    const alertRow = existing.rows[0];
    if (!alertRow) {
      return res.status(404).json({ error: 'Help request not found.' });
    }
    if (!alertRow.active) {
      return res.status(400).json({ error: 'This help request is already resolved.' });
    }
    if (alertRow.acknowledged_by && alertRow.acknowledged_by !== actorId) {
      return res.status(409).json({ error: 'This help request is already claimed by another responder.' });
    }

    const { rows } = await pool.query(
      `UPDATE alert a
       SET acknowledged_by = $2,
           acknowledged_at = COALESCE(a.acknowledged_at, NOW())
       WHERE a.id = $1 AND a.alert_type = 'help'
       RETURNING
         a.id,
         a.title,
         a.message,
         a.city,
         a.alert_type,
         a.active,
         a.acknowledged_by,
         a.acknowledged_at,
         a.created_by,
         a.starts_at,
         a.expires_at,
         a.created_at,
         ST_X(a.location::geometry) AS longitude,
         ST_Y(a.location::geometry) AS latitude`,
      [id, actorId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Help request not found.' });
    }

    const ackUserRes = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1`,
      [actorId]
    );
    const ackUser = ackUserRes.rows[0] || null;

    const payload = {
      ...rows[0],
      status: toHelpStatus(rows[0]),
      acknowledgedBy: ackUser,
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('help-request:claimed', payload);
    }

    return res.json(payload);
  } catch (err) {
    console.error('claimHelpAlert error:', err);
    return res.status(500).json({ error: 'Failed to claim help request.' });
  }
}

async function resolveHelpAlert(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE alert
       SET active = FALSE,
           expires_at = NOW()
       WHERE id = $1 AND alert_type = 'help'
       RETURNING
         id,
         title,
         message,
         city,
         alert_type,
         active,
         acknowledged_by,
         acknowledged_at,
         created_by,
         starts_at,
         expires_at,
         created_at,
         ST_X(location::geometry) AS longitude,
         ST_Y(location::geometry) AS latitude`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Help request not found.' });
    }

    const ackUserRes = rows[0]?.acknowledged_by
      ? await pool.query(`SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1`, [rows[0].acknowledged_by])
      : { rows: [] };
    const payload = {
      ...rows[0],
      status: toHelpStatus(rows[0]),
      acknowledgedBy: ackUserRes.rows[0] || null,
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('help-request:resolved', payload);
    }

    return res.json(payload);
  } catch (err) {
    console.error('resolveHelpAlert error:', err);
    return res.status(500).json({ error: 'Failed to resolve help request.' });
  }
}

module.exports = {
  createHelpAlert,
  listActiveHelpAlerts,
  listMyHelpAlerts,
  claimHelpAlert,
  resolveHelpAlert,
};
