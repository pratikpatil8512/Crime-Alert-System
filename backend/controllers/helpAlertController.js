const pool = require('../db');
const sendEmail = require('../utils/email');

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getResponderEmails() {
  const { rows } = await pool.query(
    `SELECT DISTINCT email
     FROM users
     WHERE role IN ('admin', 'police')
       AND is_verified = TRUE
       AND email IS NOT NULL
       AND TRIM(email) <> ''`
  );

  return rows
    .map((row) => String(row.email || '').trim())
    .filter(Boolean);
}

function buildHelpAlertEmail({ actor, payload }) {
  const reporterName = actor?.name || actor?.email || 'Unknown user';
  const mapsUrl = `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}`;
  const createdAt = payload.created_at ? new Date(payload.created_at).toLocaleString('en-IN', { hour12: true }) : 'Just now';

  return {
    subject: `Emergency Help Request: ${reporterName}`,
    title: 'Emergency Help Request',
    subtitle: 'A user has triggered an urgent distress signal in Crime Alert System.',
    accentColor: '#dc2626',
    text: [
      'A new emergency help request has been submitted in Crime Alert System.',
      '',
      `Reporter: ${reporterName}`,
      `Reporter Email: ${actor?.email || 'N/A'}`,
      `Reporter Phone: ${actor?.phone || 'N/A'}`,
      `Role: ${actor?.role || 'N/A'}`,
      `City: ${payload.city || 'Not provided'}`,
      `Time: ${createdAt}`,
      `Coordinates: ${payload.latitude}, ${payload.longitude}`,
      `Google Maps: ${mapsUrl}`,
      '',
      'Message:',
      payload.message || 'No message provided.',
    ].join('\n'),
    bodyHtml: `
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: 700;">Reporter</td><td style="padding: 8px 0;">${escapeHtml(reporterName)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Email</td><td style="padding: 8px 0;">${escapeHtml(actor?.email || 'N/A')}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Phone</td><td style="padding: 8px 0;">${escapeHtml(actor?.phone || 'N/A')}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Role</td><td style="padding: 8px 0;">${escapeHtml(actor?.role || 'N/A')}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">City</td><td style="padding: 8px 0;">${escapeHtml(payload.city || 'Not provided')}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Time</td><td style="padding: 8px 0;">${escapeHtml(createdAt)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Coordinates</td><td style="padding: 8px 0;">${escapeHtml(`${payload.latitude}, ${payload.longitude}`)}</td></tr>
      </table>

      <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
        <div style="font-weight: 700; margin-bottom: 8px;">User Message</div>
        <div>${escapeHtml(payload.message || 'No message provided.')}</div>
      </div>

      <div style="margin-top: 24px;">
        <a href="${mapsUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 700;">
          Open Location in Google Maps
        </a>
      </div>
    `,
  };
}

async function notifyRespondersOfHelpAlert(actor, payload) {
  try {
    const recipients = await getResponderEmails();
    if (!recipients.length) return;

    const email = buildHelpAlertEmail({ actor, payload });
    await Promise.allSettled(
      recipients.map((recipient) =>
        sendEmail(recipient, email.subject, email.text, {
          title: email.title,
          subtitle: email.subtitle,
          accentColor: email.accentColor,
          bodyHtml: email.bodyHtml,
        })
      )
    );
  } catch (error) {
    console.error('notifyRespondersOfHelpAlert error:', error);
  }
}

function buildHelpResolvedEmail({ reporter, responder, payload }) {
  const resolvedAt = payload.expires_at ? new Date(payload.expires_at).toLocaleString('en-IN', { hour12: true }) : 'Recently';
  const reporterName = reporter?.name || reporter?.email || 'User';
  const responderName = responder?.name || responder?.email || 'A responder';

  return {
    subject: 'Your emergency help request has been resolved',
    title: 'Help Request Resolved',
    subtitle: 'Your distress signal has been marked as resolved by the response team.',
    accentColor: '#059669',
    text: [
      `Hello ${reporterName},`,
      '',
      'Your emergency help request has been marked as resolved.',
      `Resolved by: ${responderName}`,
      `Resolved at: ${resolvedAt}`,
      '',
      'Original message:',
      payload.message || 'No message provided.',
      '',
      'If you still need assistance, please open the app and raise another help request immediately.',
    ].join('\n'),
    bodyHtml: `
      <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#374151;">
        Hello <strong>${escapeHtml(reporterName)}</strong>,
      </p>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#374151;">
        Your emergency help request has been marked as <strong>resolved</strong> by the response team.
      </p>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:8px 0; font-weight:700;">Resolved by</td><td style="padding:8px 0;">${escapeHtml(responderName)}</td></tr>
        <tr><td style="padding:8px 0; font-weight:700;">Resolved at</td><td style="padding:8px 0;">${escapeHtml(resolvedAt)}</td></tr>
      </table>
      <div style="margin-top:20px; padding:16px; background:#f9fafb; border-radius:12px; border:1px solid #e5e7eb;">
        <div style="font-weight:700; margin-bottom:8px;">Original message</div>
        <div>${escapeHtml(payload.message || 'No message provided.')}</div>
      </div>
      <p style="margin:20px 0 0; font-size:14px; line-height:1.7; color:#4b5563;">
        If you still need assistance, please open the app and raise another help request immediately.
      </p>
    `,
  };
}

async function notifyHelpResolved({ reporter, responder, payload }) {
  if (!reporter?.email) return;

  try {
    const email = buildHelpResolvedEmail({ reporter, responder, payload });
    await sendEmail(reporter.email, email.subject, email.text, {
      title: email.title,
      subtitle: email.subtitle,
      accentColor: email.accentColor,
      bodyHtml: email.bodyHtml,
    });
  } catch (error) {
    console.error('notifyHelpResolved error:', error);
  }
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

    await notifyRespondersOfHelpAlert(actor, payload);

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

    const reporterRes = rows[0]?.created_by
      ? await pool.query(`SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1`, [rows[0].created_by])
      : { rows: [] };
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

    await notifyHelpResolved({
      reporter: reporterRes.rows[0] || null,
      responder: ackUserRes.rows[0] || null,
      payload,
    });

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
