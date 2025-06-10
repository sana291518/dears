const Alert = require("../models/Alert");

// POST /api/alerts
exports.createAlert = async (req, res) => {
  try {
    const { type, description, latitude, longitude } = req.body;

    const alert = new Alert({ type, description, latitude, longitude });
    await alert.save();

    // Emit real-time alert via Socket.IO
    const io = req.app.get("io");
    io.emit("new-alert", alert);

    res.status(201).json(alert);
  } catch (error) {
    console.error("❌ Error creating alert:", error);
    res.status(500).json({ message: "Server error while creating alert" });
  }
};

// GET /api/alerts
// GET /api/alerts?type=fire&from=2024-06-01&to=2024-06-08
exports.getAlerts = async (req, res) => {
  try {
    const { type, from, to } = req.query;

    const query = {};
    if (type) query.type = type;
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const alerts = await Alert.find(query).sort({ timestamp: -1 });
    res.status(200).json(alerts);
  } catch (error) {
    console.error("❌ Error filtering alerts:", error);
    res.status(500).json({ message: "Server error while filtering alerts" });
  }
};
// PATCH /api/alerts/:id/resolve   (admin-only)
exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );

    if (!alert) return res.status(404).json({ error: "Alert not found" });

    // optional: broadcast to clients so they can hide the alert
    const io = req.app.get("io");
    io.emit("alert-resolved", alert);

    res.json({ message: "Alert resolved", alert });
  } catch (err) {
    console.error("❌ resolveAlert error:", err);
    res.status(500).json({ error: "Server error" });
  }
};


