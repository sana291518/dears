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

// ✅ Define allowed origins for CORS and Socket.IO
const allowedOrigins = [
  "http://localhost:5173",
  "https://resonant-dango-6097ed.netlify.app"
];

// ✅ Setup Socket.IO with allowed origins
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH"]
  }
});

// ✅ Make io accessible in controllers
app.set("io", io);

// ✅ Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH"]
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
