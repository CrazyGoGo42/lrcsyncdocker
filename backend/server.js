const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./src/database');
const { initializeRedis } = require('./src/redis');
const cacheService = require('./src/services/cacheService');

// Import routes
const tracksRouter = require('./src/routes/tracks');
const lyricsRouter = require('./src/routes/lyrics');
const scanRouter = require('./src/routes/scan');
const healthRouter = require('./src/routes/health');
const cleanupRouter = require('./src/routes/cleanup');
const publishRouter = require('./src/routes/publish');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware - disable CSP for debugging
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting - more generous for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute  
  max: 1000 // limit each IP to 1000 requests per minute
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for album artwork and cache with CORS
app.use('/artwork', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'public', 'artwork')));

app.use('/cache', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(process.env.CACHE_PATH || '/app/cache'));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/lyrics', lyricsRouter);
app.use('/api/scan', scanRouter);
app.use('/api/cleanup', cleanupRouter);
app.use('/api/publish', publishRouter);
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/cache', require('./src/routes/cache'));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    console.log('Initializing Redis...');
    await initializeRedis();
    
    console.log('Initializing cache service...');
    await cacheService.initializeCacheDirectories();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Music directory: ${process.env.MUSIC_PATH || '/app/music'}`);
      console.log(`📁 Cache directory: ${process.env.CACHE_PATH || '/app/cache'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

startServer();