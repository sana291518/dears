const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const alertRoutes = require('./routes/alerts');
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Allow frontend domain from .env
const allowedOrigin = process.env.CLIENT_ORIGIN || "*";

// ✅ Socket.IO CORS setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST", "PATCH"]
  }
});

// ✅ Make io accessible in controllers
app.set("io", io);

// ✅ Middleware
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PATCH"],
  credentials: true
}));
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertRoutes);

// ✅ DB connect + start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ✅ Socket.IO events
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});
