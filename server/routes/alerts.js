const express = require("express");
const router = express.Router();
const {
  createAlert,
  getAlerts,
  resolveAlert, // ✅ Make sure this is here
} = require("../controllers/alertController");

router.post("/", createAlert);
router.get("/", getAlerts);
router.patch("/:id/resolve", resolveAlert); // ✅ Route handler is now valid

module.exports = router;
