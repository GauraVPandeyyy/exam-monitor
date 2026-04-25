
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── In-Memory Store ──────────────────────────────────────────────────────────
const activityLogs = [];
let logIdCounter = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VALID_EVENT_TYPES = [
  "TAB_SWITCH",
  "MOUSE_LEAVE",
  "COPY_PASTE",
  "RIGHT_CLICK",
  "KEYBOARD_SHORTCUT",
  "FOCUS_LOST",
  "PASTE",
  "COPY",
];

const VALID_SEVERITIES = ["Low", "Medium", "High"];

function validateLogPayload(body) {
  const errors = [];
  if (!body.studentId || typeof body.studentId !== "string")
    errors.push("studentId is required and must be a string.");
  if (!body.studentName || typeof body.studentName !== "string")
    errors.push("studentName is required and must be a string.");
  if (!body.eventType || !VALID_EVENT_TYPES.includes(body.eventType))
    errors.push(
      `eventType must be one of: ${VALID_EVENT_TYPES.join(", ")}.`
    );
  if (!body.severity || !VALID_SEVERITIES.includes(body.severity))
    errors.push(`severity must be one of: ${VALID_SEVERITIES.join(", ")}.`);
  return errors;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/logs
 * Ingest a new anomaly event from the student exam client.
 */
function createLog(req, res) {
  const { studentId, studentName, eventType, timestamp, severity } = req.body;

  const validationErrors = validateLogPayload(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ success: false, errors: validationErrors });
  }

  const log = {
    id: logIdCounter++,
    studentId: studentId.trim(),
    studentName: studentName.trim(),
    eventType,
    severity,
    timestamp: timestamp || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };

  activityLogs.push(log);

  return res.status(201).json({
    success: true,
    message: "Anomaly logged successfully.",
    log,
  });
}

/**
 * GET /api/logs
 * Retrieve all activity logs sorted by most recent first.
 * Supports optional ?studentId= query filter.
 */
function getLogs(req, res) {
  const { studentId } = req.query;

  let results = [...activityLogs];

  if (studentId) {
    results = results.filter(
      (log) => log.studentId === studentId.trim()
    );
  }

  // Sort descending by receivedAt
  results.sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)
  );

  return res.status(200).json({
    success: true,
    total: results.length,
    logs: results,
  });
}

/**
 * GET /api/stats
 * Return aggregate analytics for the monitoring dashboard.
 */
function getStats(req, res) {
  const totalFlags = activityLogs.length;
  const highSeverityCount = activityLogs.filter(
    (l) => l.severity === "High"
  ).length;
  const mediumSeverityCount = activityLogs.filter(
    (l) => l.severity === "Medium"
  ).length;
  const lowSeverityCount = activityLogs.filter(
    (l) => l.severity === "Low"
  ).length;

  // Unique students flagged
  const uniqueStudents = new Set(activityLogs.map((l) => l.studentId)).size;

  // Event type breakdown
  const eventBreakdown = activityLogs.reduce((acc, log) => {
    acc[log.eventType] = (acc[log.eventType] || 0) + 1;
    return acc;
  }, {});

  // Risk-scored students: aggregate severity scores per student
  const studentRisk = {};
  activityLogs.forEach((log) => {
    if (!studentRisk[log.studentId]) {
      studentRisk[log.studentId] = {
        studentId: log.studentId,
        studentName: log.studentName,
        score: 0,
        flags: 0,
      };
    }
    const scoreMap = { High: 10, Medium: 5, Low: 1 };
    studentRisk[log.studentId].score += scoreMap[log.severity] || 0;
    studentRisk[log.studentId].flags += 1;
  });

  const topRiskyStudents = Object.values(studentRisk)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return res.status(200).json({
    success: true,
    stats: {
      totalFlags,
      highSeverityCount,
      mediumSeverityCount,
      lowSeverityCount,
      uniqueStudentsFlagged: uniqueStudents,
      eventBreakdown,
      topRiskyStudents,
    },
  });
}

/**
 * DELETE /api/logs
 * Clear all logs (useful for demo resets).
 */
function clearLogs(req, res) {
  activityLogs.length = 0;
  logIdCounter = 1;
  return res.status(200).json({
    success: true,
    message: "All logs cleared.",
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.post("/api/logs", createLog);
app.get("/api/logs", getLogs);
app.get("/api/stats", getStats);
app.delete("/api/logs", clearLogs);

// Health check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

// 404 handler
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found." })
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛡️  Exam Monitor API running → http://localhost:${PORT}`);
});
