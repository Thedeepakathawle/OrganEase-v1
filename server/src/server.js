const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { initializeSocket } = require('./services/socketService');
const authRoutes = require('./routes/auth');
const organsRoutes = require('./routes/organs');
const { router: matchingRoutes } = require('./routes/matching');
const transitRoutes = require('./routes/transit');
const verificationRoutes = require('./routes/verification');
const analyticsRoutes = require('./routes/analytics');
const seedDatabase = require('./seed');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/organ_ease';
const CORS_ORIGINS = [
  'http://localhost:5173',
  'https://organ-ease-v1.vercel.app',
  ...(process.env.CORS_ORIGIN || '').split(',')
]
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const corsOptions = {
  origin: CORS_ORIGINS,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    ...corsOptions
  }
});

initializeSocket(io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'OrganEase MERN Platform',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Reset / Re-seed endpoint for instant interactive demo testing
app.post('/api/seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Database successfully re-seeded with demo data.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/organs', organsRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/transit', transitRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Connect to MongoDB and start listening
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`[Database] Successfully connected to MongoDB at ${MONGODB_URI}`);
    server.listen(PORT, () => {
      console.log(`[OrganEase API] Server running on http://localhost:${PORT}`);
      console.log(`[OrganEase WebSocket] Alert Service active on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Database] MongoDB connection failed:', err);
    process.exit(1);
  });
