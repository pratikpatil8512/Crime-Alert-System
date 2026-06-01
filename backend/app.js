const express = require('express');
require('dotenv').config();
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const tipRoutes = require('./routes/tipRoutes');
const app = express();
const pool = require('./db');
const authenticateToken = require('./middleware/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const statRoutes = require('./routes/statRoutes');
const crimeRoutes = require('./routes/crimeRoutes');
const locationRoutes = require('./routes/locationRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const helpAlertRoutes = require('./routes/helpAlertRoutes');

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Crime Alert System API is running...' });
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      ok: true,
      serverTime: result.rows[0].now,
      socketEnabled: true,
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(500).json({ ok: false, error: 'Database unavailable' });
  }
});

app.use('/api/tips', tipRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', statRoutes);
app.use('/api/crimes', crimeRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/alerts', helpAlertRoutes);

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack || err);

  if (err.message === 'CORS origin not allowed') {
    return res.status(403).json({ error: err.message });
  }

  res.status(500).json({ error: 'Something went wrong!' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  const { role, userId } = socket.handshake.auth || {};
  if (role) socket.join(`role:${role}`);
  if (userId) socket.join(`user:${userId}`);

  socket.emit('socket:connected', {
    socketId: socket.id,
    joinedRooms: [role ? `role:${role}` : null, userId ? `user:${userId}` : null].filter(Boolean),
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('DB connection failed:', err.message);
  else console.log('Connected to Supabase DB at', res.rows[0].now);
});
