const express = require('express');
const { query } = require('../database');
const { getClient } = require('../redis');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {}
    };

    // Test database connection
    try {
      await query('SELECT 1');
      health.services.database = { status: 'connected' };
    } catch (error) {
      health.services.database = { status: 'error', message: error.message };
      health.status = 'unhealthy';
    }

    // Test Redis connection
    try {
      const redisClient = getClient();
      await redisClient.ping();
      health.services.redis = { status: 'connected' };
    } catch (error) {
      health.services.redis = { status: 'error', message: error.message };
      health.status = 'unhealthy';
    }

    // Get basic stats
    try {
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total_tracks,
          COUNT(*) FILTER (WHERE has_lyrics = true) as tracks_with_lyrics
        FROM tracks
      `);
      health.stats = statsResult.rows[0];
    } catch (error) {
      console.warn('Could not fetch stats for health check:', error.message);
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;