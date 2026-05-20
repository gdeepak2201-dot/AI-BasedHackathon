require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const { initializeSocket } = require('./socket/socketManager');
const { connectPostgres } = require('./db/postgres');
const { connectNeo4j } = require('./db/neo4j');
const { connectChroma } = require('./db/chroma');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const leaveRoutes = require('./routes/leaves');
const peerReviewRoutes = require('./routes/peerReviews');
const timeTrackingRoutes = require('./routes/timeTracking');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const compensationRoutes = require('./routes/compensation');
const departmentRoutes = require('./routes/departments');

// Ensure required directories exist
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);
app.set('io', io);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing & compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'SkillSync API'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/peer-reviews', peerReviewRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/compensation', compensationRoutes);
app.use('/api/departments', departmentRoutes);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // PostgreSQL is required
    await connectPostgres();
    logger.info('✅ PostgreSQL connected');

    // Neo4j is optional
    try {
      await connectNeo4j();
      logger.info('✅ Neo4j connected');
    } catch (err) {
      logger.warn('⚠️  Neo4j unavailable — graph features disabled');
    }

    // ChromaDB is optional
    try {
      await connectChroma();
      logger.info('✅ ChromaDB connected');
    } catch (err) {
      logger.warn('⚠️  ChromaDB unavailable — vector search disabled');
    }

    server.listen(PORT, () => {
      logger.info(`🚀 SkillSync API running on http://localhost:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => process.exit(0));
});

// Start immediately
startServer();

module.exports = { app, server };
