const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

// Challenge solver implementation (based on LRCGET's challenge solver)
class ChallengeSolver {
  static async solveChallenge(prefix, target) {
    console.log(`🔍 Solving challenge: prefix="${prefix}", target="${target}"`);
    
    const targetBuffer = Buffer.from(target, 'hex');
    let nonce = 0;
    const maxIterations = 10000000; // Prevent infinite loops
    
    while (nonce < maxIterations) {
      const input = `${prefix}:${nonce}`;
      const hash = crypto.createHash('sha256').update(input).digest();
      
      // Check if hash is less than target
      if (this.isHashLessThanTarget(hash, targetBuffer)) {
        console.log(`✅ Challenge solved! Nonce: ${nonce}, iterations: ${nonce + 1}`);
        return nonce;
      }
      
      nonce++;
      
      // Progress logging every 100k iterations
      if (nonce % 100000 === 0) {
        console.log(`⏳ Challenge solving progress: ${nonce} iterations...`);
      }
    }
    
    throw new Error('Failed to solve challenge within maximum iterations');
  }
  
  static isHashLessThanTarget(hash, target) {
    // Compare byte by byte
    for (let i = 0; i < Math.min(hash.length, target.length); i++) {
      if (hash[i] < target[i]) {
        return true;
      } else if (hash[i] > target[i]) {
        return false;
      }
    }
    // If all bytes are equal up to the shorter length, compare lengths
    return hash.length < target.length;
  }
}

// Request challenge from LRCLIB
router.post('/request-challenge', async (req, res) => {
  try {
    const lrclibUrl = process.env.LRCLIB_URL || 'https://lrclib.net';
    
    console.log('🔑 Requesting challenge from LRCLIB...');
    
    const response = await axios.post(`${lrclibUrl}/api/request-challenge`, {}, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Lyrics-Sync-Web/1.0.0 (https://github.com/user/lyrics-sync-web)',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Challenge received:', {
      prefix: response.data.prefix,
      target: response.data.target?.substring(0, 16) + '...' // Log partial target for security
    });
    
    res.json({
      prefix: response.data.prefix,
      target: response.data.target
    });
    
  } catch (error) {
    console.error('❌ Challenge request failed:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Failed to request challenge from LRCLIB',
        message: error.response.data?.message || error.message,
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Failed to request challenge from LRCLIB',
        message: error.message
      });
    }
  }
});

// Solve challenge
router.post('/solve-challenge', async (req, res) => {
  try {
    const { prefix, target } = req.body;
    
    if (!prefix || !target) {
      return res.status(400).json({
        error: 'Missing required fields: prefix and target'
      });
    }
    
    console.log('🧮 Starting challenge solving...');
    const startTime = Date.now();
    
    // Solve challenge in a separate process or with timeout
    const nonce = await Promise.race([
      ChallengeSolver.solveChallenge(prefix, target),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Challenge solving timeout')), 30000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Challenge solved in ${duration}ms, nonce: ${nonce}`);
    
    res.json({
      nonce,
      token: `${prefix}:${nonce}`,
      duration
    });
    
  } catch (error) {
    console.error('❌ Challenge solving failed:', error.message);
    res.status(500).json({
      error: 'Failed to solve challenge',
      message: error.message
    });
  }
});

// Publish lyrics to LRCLIB
router.post('/lyrics', async (req, res) => {
  try {
    const {
      trackName,
      artistName,
      albumName,
      duration,
      plainLyrics,
      syncedLyrics,
      token
    } = req.body;
    
    // Validate required fields
    if (!trackName || !artistName || !token) {
      return res.status(400).json({
        error: 'Missing required fields: trackName, artistName, token'
      });
    }
    
    if (!plainLyrics && !syncedLyrics) {
      return res.status(400).json({
        error: 'Either plainLyrics or syncedLyrics must be provided'
      });
    }
    
    const lrclibUrl = process.env.LRCLIB_URL || 'https://lrclib.net';
    
    console.log('📤 Publishing lyrics to LRCLIB...', {
      trackName,
      artistName,
      albumName,
      duration,
      hasPlain: !!plainLyrics,
      hasSynced: !!syncedLyrics,
      token: token.substring(0, 20) + '...' // Partial token for logging
    });
    
    const publishData = {
      trackName: trackName.trim(),
      artistName: artistName.trim(),
      duration: duration ? Math.round(duration) : undefined,
      plainLyrics: plainLyrics?.trim() || undefined,
      syncedLyrics: syncedLyrics?.trim() || undefined
    };
    
    // Add album name if provided
    if (albumName?.trim()) {
      publishData.albumName = albumName.trim();
    }
    
    const response = await axios.post(`${lrclibUrl}/api/publish`, publishData, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Lyrics-Sync-Web/1.0.0 (https://github.com/user/lyrics-sync-web)',
        'Content-Type': 'application/json',
        'X-Publish-Token': token
      }
    });
    
    console.log('✅ Lyrics published successfully:', response.data);
    
    res.json({
      success: true,
      message: 'Lyrics published successfully',
      lrclibResponse: response.data
    });
    
  } catch (error) {
    console.error('❌ Lyrics publishing failed:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      // Handle specific LRCLIB error responses
      if (status === 409) {
        res.status(409).json({
          error: 'Lyrics already exist for this track',
          message: errorData?.message || 'Duplicate lyrics submission',
          details: errorData
        });
      } else if (status === 400) {
        res.status(400).json({
          error: 'Invalid lyrics data',
          message: errorData?.message || 'Bad request',
          details: errorData
        });
      } else if (status === 401 || status === 403) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid or expired publish token',
          details: errorData
        });
      } else {
        res.status(status).json({
          error: 'Publishing failed',
          message: errorData?.message || error.message,
          details: errorData
        });
      }
    } else {
      res.status(500).json({
        error: 'Failed to publish lyrics',
        message: error.message
      });
    }
  }
});

// Get publishing status/history (optional feature)
router.get('/history', async (req, res) => {
  try {
    // This could be implemented to track publishing history
    // For now, return empty array
    res.json({
      publications: [],
      message: 'Publishing history not yet implemented'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get publishing history',
      message: error.message
    });
  }
});

module.exports = router;