const express = require('express');
const cacheService = require('../services/cacheService');

const router = express.Router();

// Get cache statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    
    if (stats) {
      // Format sizes for better readability
      const formatSize = (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      };

      const formattedStats = {};
      for (const [type, data] of Object.entries(stats)) {
        formattedStats[type] = {
          count: data.count,
          size: formatSize(data.size),
          sizeBytes: data.size
        };
      }

      const totalSize = Object.values(stats).reduce((sum, data) => sum + data.size, 0);
      const totalCount = Object.values(stats).reduce((sum, data) => sum + data.count, 0);

      res.json({
        individual: formattedStats,
        totals: {
          count: totalCount,
          size: formatSize(totalSize),
          sizeBytes: totalSize
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to get cache statistics' });
    }
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      error: 'Failed to get cache statistics',
      message: error.message
    });
  }
});

// Clear cache
router.delete('/clear/:type?', async (req, res) => {
  try {
    const { type = 'all' } = req.params;
    
    const validTypes = ['all', 'metadata', 'artwork', 'config', 'temp'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid cache type', 
        validTypes 
      });
    }

    const success = await cacheService.clearCache(type);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `${type} cache cleared successfully` 
      });
    } else {
      res.status(500).json({ 
        error: `Failed to clear ${type} cache` 
      });
    }
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Cleanup temporary files
router.post('/cleanup-temp', async (req, res) => {
  try {
    const { maxAge = 86400000 } = req.body; // Default 24 hours
    
    await cacheService.cleanupTempFiles(maxAge);
    
    res.json({ 
      success: true, 
      message: 'Temporary files cleaned up successfully' 
    });
  } catch (error) {
    console.error('Temp cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup temporary files',
      message: error.message
    });
  }
});

// Serve cached artwork files
router.get('/artwork/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    
    // Validate filename to prevent directory traversal
    if (!filename.match(/^[a-f0-9]+\.(jpg|png|jpeg)$/i)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const artworkPath = path.join(process.env.CACHE_PATH || '/app/cache', 'artwork', filename);
    
    // Check if file exists
    try {
      await fs.access(artworkPath);
    } catch (error) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    
    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Stream the file
    const fileStream = require('fs').createReadStream(artworkPath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Artwork serve error:', error);
    res.status(500).json({
      error: 'Failed to serve artwork',
      message: error.message
    });
  }
});

module.exports = router;