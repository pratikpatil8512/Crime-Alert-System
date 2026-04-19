// app.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const http = require('http');             // <-- required for socket.io
const { Server } = require('socket.io');  // <-- socket.io server
const tipRoutes = require('./routes/tipRoutes');
const app = express();
const pool = require('./db');
const authenticateToken = require('./middleware/authMiddleware');

// --------- ROUTES IMPORTS ----------
const authRoutes = require('./routes/authRoutes');
const statRoutes = require('./routes/statRoutes');
const crimeRoutes = require('./routes/crimeRoutes');
const locationRoutes = require('./routes/locationRoutes');

// --------- MIDDLEWARES -------------
app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// --------- ROOT ENDPOINT -----------
app.get('/', (req, res) => {
  res.json({ message: '🛡️ Crime Alert System API is running...' });
});

// --------- TIP ROUTES --------------
app.use("/api/tips", tipRoutes);

// --------- ROUTES MOUNTING ---------
app.use('/api/auth', authRoutes);
app.use('/api', statRoutes);
app.use('/api/crimes', crimeRoutes);
app.use('/api/location', locationRoutes);

// --------- TEST PROTECTED ROUTE ----
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// --------- ERROR HANDLER -----------
app.use((err, req, res, next) => {
  console.error('💥 Global Error:', err.stack || err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ======================================================
// 🚀 SOCKET.IO + SERVER SETUP (New Section Added)
// ======================================================

// Create HTTP server for socket.io
const server = http.createServer(app);

// Create socket.io instance
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Make socket.io available to all controllers (like tipController)
app.set("io", io);

// Handle socket.io connections
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// ======================================================
// 🚀 START SERVER (Replaces old app.listen())
// ======================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// --------- TEST DB CONNECTION ------
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Connected to Supabase DB at', res.rows[0].now);
});
