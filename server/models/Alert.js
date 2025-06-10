const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  type: String,
  description: String,
  latitude: Number,
  longitude: Number,
  resolved: { type: Boolean, default: false },   // ✅ new
  resolvedAt: Date,                              // ✅ new
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7                    // auto-delete after 7 d
  }
});

module.exports = mongoose.model("Alert", alertSchema);
