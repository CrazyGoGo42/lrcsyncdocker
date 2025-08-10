const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./src/database');
const { initializeRedis } = require('./src/redis');

// Import routes
const tracksRouter = require('./src/routes/tracks');
const lyricsRouter = require('./src/routes/lyrics');
const scanRouter = require('./src/routes/scan');
const healthRouter = require('./src/routes/health');
const cleanupRouter = require('./src/routes/cleanup');
const publishRouter = require('./src/routes/publish');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for album artwork
app.use('/artwork', express.static(path.join(__dirname, 'public', 'artwork')));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/lyrics', lyricsRouter);
app.use('/api/scan', scanRouter);
app.use('/api/cleanup', cleanupRouter);
app.use('/api/publish', publishRouter);
app.use('/api/settings', require('./src/routes/settings'));

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
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Music directory: ${process.env.MUSIC_PATH || '/app/music'}`);
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