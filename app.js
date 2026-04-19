// app.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');

const app = express();
const pool = require('./db');
const authenticateToken = require('./middleware/authMiddleware');

// --------- ROUTES IMPORTS ----------
const authRoutes = require('./routes/authRoutes');
const statRoutes = require('./routes/statRoutes');
const crimeRoutes = require('./routes/crimeRoutes');         // 👈 NEW
const locationRoutes = require('./routes/locationRoutes');   // 👈 NEW

// --------- MIDDLEWARES -------------
app.use(cors({
  origin: 'http://localhost:3000', // frontend origin (React dashboard)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// --------- ROOT ENDPOINT -----------
app.get('/', (req, res) => {
  res.json({ message: '🛡️ Crime Alert System API is running...' });
});

// --------- ROUTES MOUNTING ---------
app.use('/api/auth', authRoutes);
app.use('/api', statRoutes);

// ✅ NEW crime + location routes
app.use('/api/crimes', crimeRoutes);        // Handles create, nearby, heatmap
app.use('/api/location', locationRoutes);   // Handles location updates

// --------- TEST PROTECTED ROUTE ----
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// --------- ERROR HANDLER -----------
app.use((err, req, res, next) => {
  console.error('💥 Global Error:', err.stack || err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// --------- START SERVER ------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// --------- TEST DB CONNECTION ------
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Connected to Supabase DB at', res.rows[0].now);
});
