const express = require('express');
const fs = require('fs');
const path = require('path');
const scanner = require('../services/musicScanner');
const { addJob, getJob } = require('../redis');

const router = express.Router();

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
        cachedTracks: results.cached,
        deletedTracks: results.deleted,
        totalInDb: results.total_in_db,
        errors: results.errors.length,
        errorDetails: results.errors
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
    const stats = await scanner.getScanStats();
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

// Helper function to build folder tree
async function buildFolderTree(dirPath, relativePath = '', maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();

    if (folders.length === 0) {
      return null;
    }

    const tree = {
      name: path.basename(dirPath),
      path: relativePath,
      children: []
    };

    for (const folderName of folders) {
      const folderPath = path.join(dirPath, folderName);
      const folderRelativePath = relativePath ? `${relativePath}/${folderName}` : folderName;
      
      const subtree = await buildFolderTree(folderPath, folderRelativePath, maxDepth, currentDepth + 1);
      
      const folderNode = {
        name: folderName,
        path: folderRelativePath,
        children: subtree ? subtree.children : []
      };
      
      tree.children.push(folderNode);
    }

    return tree;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return null;
  }
}

// Get folder structure for include/exclude selection
router.get('/folders', async (req, res) => {
  try {
    const musicDir = process.env.MUSIC_PATH || '/app/music';
    
    console.log(`📁 Building folder tree for: ${musicDir}`);
    
    if (!fs.existsSync(musicDir)) {
      return res.status(404).json({
        error: 'Music directory not found',
        path: musicDir
      });
    }

    const folderTree = await buildFolderTree(musicDir);
    
    if (!folderTree) {
      return res.json({
        success: true,
        folders: [],
        message: 'No subfolders found'
      });
    }

    res.json({
      success: true,
      folders: folderTree.children || [], // Return only the subfolders, not the root
      rootPath: musicDir
    });

  } catch (error) {
    console.error('Folder tree error:', error);
    res.status(500).json({
      error: 'Failed to get folder structure',
      message: error.message
    });
  }
});

module.exports = router;