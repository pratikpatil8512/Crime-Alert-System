// backend/routes/tipRoutes.js
const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/authorizeRole");
const controller = require("../controllers/tipController");

// Report (requires auth now)
router.post("/report", authenticateToken, controller.reportTip);

// Admin/Police: fetch pending tips
router.get(
  "/pending",
  authenticateToken,
  authorizeRole("admin", "police"),
  controller.getPendingTips
);

// Admin/Police: approve tip
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRole("admin", "police"),
  controller.approveTip
);

// Admin/Police: deny tip
router.post(
  "/:id/deny",
  authenticateToken,
  authorizeRole("admin", "police"),
  controller.denyTip
);

module.exports = router;
