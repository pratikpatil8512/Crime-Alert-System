// backend/controllers/tipController.js
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const sendEmail = require('../utils/email'); // nodemailer utility

function isEmail(str) {
  return typeof str === "string" && str.includes("@");
}

/* ---------------------------------------------------------
   1) REPORT TIP (ONLY AUTHENTICATED USER, NO ANONYMOUS)
--------------------------------------------------------- */
exports.reportTip = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Login required to report a tip" });
    }

    const {
      title,
      description,
      category,
      severity,
      latitude,
      longitude
    } = req.body;

    if (!title || !description || !category || !severity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Location is required" });
    }

    const id = uuidv4();

    const q = `
      INSERT INTO anonymous_tips (
        id, title, description,
        reporter_name, reporter_contact,
        is_anonymous,
        category, severity,
        location, status,
        reported_at, created_at,
        reporter_id
      )
      VALUES (
        $1, $2, $3,
        $4, $5,
        false,
        $6, $7,
        ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography,
        'pending',
        NOW(), NOW(),
        $10
      )
      RETURNING id;
    `;

    await pool.query(q, [
      id,
      title,
      description,
      user.name,
      user.email,
      category,
      severity,
      longitude,
      latitude,
      user.id
    ]);

    // ⬅ (Optional) Notify admins
    if (process.env.ADMIN_EMAILS) {
      process.env.ADMIN_EMAILS.split(",").forEach(adminEmail => {
        if (isEmail(adminEmail.trim())) {
          sendEmail(
            adminEmail.trim(),
            "New crime tip reported",
            `User ${user.name} <${user.email}> submitted a new tip: ${title}`
          ).catch(err => console.log("Admin email error:", err));
        }
      });
    }

    return res.json({ message: "Tip submitted successfully", id });
  } catch (err) {
    console.error("reportTip error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ---------------------------------------------------------
   2) GET PENDING TIPS (ADMIN / POLICE)
--------------------------------------------------------- */
exports.getPendingTips = async (req, res) => {
  try {
    const q = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.category,
        t.severity,
        t.reported_at,
        ST_Y(t.location::geometry) AS latitude,
        ST_X(t.location::geometry) AS longitude,

        u.id AS reporter_id,
        u.name AS reporter_name,
        u.email AS reporter_email,
        u.phone AS reporter_phone,
        ST_Y(u.current_location::geometry) AS reporter_latitude,
        ST_X(u.current_location::geometry) AS reporter_longitude,
        u.is_verified,
        u.risk_level

      FROM anonymous_tips t
      LEFT JOIN users u ON u.id = t.reporter_id
      WHERE t.status = 'pending'
      ORDER BY t.reported_at DESC;
    `;

    const { rows } = await pool.query(q);

    const formatted = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      severity: r.severity,
      reported_at: r.reported_at,
      latitude: r.latitude,
      longitude: r.longitude,
      reporter: {
        id: r.reporter_id,
        name: r.reporter_name,
        email: r.reporter_email,
        phone: r.reporter_phone,
        last_latitude: r.reporter_latitude,
        last_longitude: r.reporter_longitude,
        is_verified: r.is_verified,
        risk_level: r.risk_level
      }
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("getPendingTips error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ---------------------------------------------------------
   3) APPROVE TIP
--------------------------------------------------------- */
exports.approveTip = async (req, res) => {
  const client = await pool.connect();
  try {
    const tipId = req.params.id;
    const { category, severity, notes } = req.body;

    const moderatorId = req.user.id;
    const moderatorRole = req.user.role;

    await client.query("BEGIN");

    // STEP 1 — Lock the row (no joins allowed!)
    const tipRes = await client.query(
      `SELECT *,
              ST_X(location::geometry) AS lon,
              ST_Y(location::geometry) AS lat
       FROM anonymous_tips
       WHERE id = $1
       FOR UPDATE`,
      [tipId]
    );

    if (!tipRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Tip not found" });
    }

    const tip = tipRes.rows[0];

    // STEP 2 — Fetch reporter data (separate query)
    let reporterEmail = null;
    const userRes = await client.query(
      `SELECT email FROM users WHERE id = $1`,
      [tip.reporter_id]
    );

    if (userRes.rows.length) reporterEmail = userRes.rows[0].email;

    const finalCategory = category || tip.category;
    const finalSeverity = severity || tip.severity;

    // STEP 3 — Create crime record
    const crimeRes = await client.query(
      `INSERT INTO crime_data (
        id, reporter_id,
        title, description,
        category, severity,
        city, address,
        incident_time, location,
        created_at, updated_at, status
      )
      VALUES (
        gen_random_uuid(), $1,
        $2, $3,
        $4, $5,
        NULL, NULL,
        NOW(),
        ST_SetSRID(ST_MakePoint($6,$7),4326)::geography,
        NOW(), NOW(), 'reported'
      )
      RETURNING id`,
      [
        tip.reporter_id,
        tip.title,
        tip.description,
        finalCategory,
        finalSeverity,
        tip.lon,
        tip.lat
      ]
    );

    const crimeId = crimeRes.rows[0].id;

    // STEP 4 — Update tip
    await client.query(
      `UPDATE anonymous_tips
       SET status='approved',
           moderator_id=$1,
           moderator_role=$2,
           moderator_notes=$3,
           moderated_at=NOW(),
           crime_id=$4
       WHERE id=$5`,
      [moderatorId, moderatorRole, notes || null, crimeId, tipId]
    );

    await client.query("COMMIT");

    // STEP 5 — Notify reporter
    if (isEmail(reporterEmail)) {
      sendEmail(
        reporterEmail,
        "Your crime tip has been approved",
        `Your tip "${tip.title}" is now verified and added as crime ID: ${crimeId}.`
      ).catch(err => console.log("Email error:", err));
    }

    return res.json({ message: "Tip approved & crime created", crimeId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("approveTip error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   4) DENY TIP
--------------------------------------------------------- */
exports.denyTip = async (req, res) => {
  try {
    const tipId = req.params.id;
    const { reason } = req.body;

    const moderatorId = req.user.id;
    const moderatorRole = req.user.role;

    const q = `
      UPDATE anonymous_tips
      SET status='denied',
          moderator_id=$1,
          moderator_role=$2,
          moderator_notes=$3,
          moderated_at=NOW()
      WHERE id=$4
      RETURNING reporter_contact, title;
    `;

    const result = await pool.query(q, [
      moderatorId,
      moderatorRole,
      reason || null,
      tipId
    ]);

    if (!result.rows.length) return res.status(404).json({ error: "Tip not found" });

    const { reporter_contact, title } = result.rows[0];

    if (isEmail(reporter_contact)) {
      sendEmail(
        reporter_contact,
        "Your crime tip was denied",
        `Your tip "${title}" was denied.\nReason: ${reason || "Not provided"}`
      );
    }

    return res.json({ message: "Tip denied" });
  } catch (err) {
    console.error("denyTip error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
