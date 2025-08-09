const express = require('express');
const fs = require('fs').promises;
const { query } = require('../database');

const router = express.Router();

// Clean up database by removing tracks with invalid paths
router.post('/database', async (req, res) => {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Get all tracks
    const allTracks = await query('SELECT id, file_path, title, artist FROM tracks');
    let removedCount = 0;
    const toRemove = [];
    
    // Check each track's file existence
    for (const track of allTracks.rows) {
      try {
        await fs.access(track.file_path);
        // File exists, keep it
      } catch (error) {
        // File doesn't exist, mark for removal
        console.log(`❌ File not found: ${track.title} - ${track.file_path}`);
        toRemove.push(track.id);
        removedCount++;
      }
    }
    
    // Remove tracks with non-existent files
    if (toRemove.length > 0) {
      const idsString = toRemove.join(',');
      await query(`DELETE FROM tracks WHERE id IN (${idsString})`);
    }
    
    console.log(`✅ Database cleanup completed: ${removedCount} invalid tracks removed`);
    
    res.json({
      success: true,
      message: `Database cleanup completed`,
      removed: removedCount,
      remaining: allTracks.rows.length - removedCount
    });
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database cleanup failed',
      message: error.message
    });
  }
});

module.exports = router;