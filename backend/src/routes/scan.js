const express = require('express');
const MusicScanner = require('../services/musicScanner');
const { addJob, getJob } = require('../redis');

const router = express.Router();
const scanner = new MusicScanner();

// Direct scan processing function
async function processScanJobDirect(directory, jobId, res) {
  try {
    console.log(`🔄 Processing scan job ${jobId}...`);
    
    const results = await scanner.scanDirectory(directory);
    
    console.log(`✅ Scan job ${jobId} completed:`, results);
    
    res.json({
      success: true,
      jobId,
      message: 'Scan completed successfully',
      results: {
        tracksFound: results.processed,
        newTracks: results.new,
        updatedTracks: results.updated,
        errors: results.errors.length
      }
    });
  } catch (error) {
    console.error(`❌ Scan job ${jobId} failed:`, error);
    res.status(500).json({
      success: false,
      jobId,
      error: 'Scan failed',
      message: error.message
    });
  }
}

// Start a scan job
router.post('/start', async (req, res) => {
  try {
    const { directory } = req.body;
    
    // For now, run scan directly without Redis queue
    const jobId = `scan_${Date.now()}`;
    
    // Start processing immediately
    processScanJobDirect(directory, jobId, res);

  } catch (error) {
    console.error('Scan start error:', error);
    res.status(500).json({
      error: 'Failed to start scan',
      message: error.message
    });
  }
});

// Get scan job status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json(job);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

// Get scan statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await scanner.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get scan statistics',
      message: error.message
    });
  }
});

// Process scan job (simplified version - in production use proper job workers)
async function processScanJob(jobId) {
  const { updateJob } = require('../redis');
  
  try {
    await updateJob(jobId, {
      status: 'processing',
      progress: 0,
      startedAt: new Date().toISOString()
    });

    const job = await getJob(jobId);
    const results = await scanner.scanDirectory(job.data.directory);

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      results,
      completedAt: new Date().toISOString()
    });

    console.log(`✅ Scan job ${jobId} completed:`, results);
  } catch (error) {
    console.error(`❌ Scan job ${jobId} failed:`, error);
    
    await updateJob(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });
  }
}

module.exports = router;