const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { query } = require('../database');
const { addJob, getJob } = require('../redis');
const lyricsEmbedder = require('../services/lyricsEmbedder');

const router = express.Router();

// Search for lyrics from various sources
router.get('/search', async (req, res) => {
  try {
    const { artist, title, album, duration } = req.query;
    
    if (!artist || !title) {
      return res.status(400).json({
        error: 'Artist and title are required'
      });
    }

    // Search LRCLIB first
    const lrclibResults = await searchLrclib(artist, title, album, duration);
    
    res.json({
      source: 'lrclib',
      results: lrclibResults || [],
      query: { artist, title, album, duration }
    });

  } catch (error) {
    console.error('Lyrics search error:', error);
    res.status(500).json({
      error: 'Failed to search lyrics',
      message: error.message
    });
  }
});

// Get lyrics for a specific track
router.get('/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    
    console.log(`🎵 Getting lyrics for track ID: ${trackId}`);
    
    // Get track info
    const trackResult = await query('SELECT * FROM tracks WHERE id = $1', [trackId]);
    if (trackResult.rows.length === 0) {
      console.log(`❌ Track not found: ${trackId}`);
      return res.status(404).json({ error: 'Track not found' });
    }
    
    const track = trackResult.rows[0];
    console.log(`📀 Track: ${track.artist} - ${track.title} (has_lyrics: ${track.has_lyrics})`);
    console.log(`📁 File path: ${track.file_path}`);
    
    // Check if LRC file exists first
    const lrcPath = track.file_path.replace(/\.[^/.]+$/, '.lrc');
    console.log(`🔍 Checking for LRC file: ${lrcPath}`);
    
    try {
      const lrcContent = await fs.readFile(lrcPath, 'utf8');
      console.log(`✅ Found LRC file for: ${track.title}`);
      res.json({
        hasLyrics: true,
        lyrics: lrcContent,
        source: 'local',
        filePath: lrcPath
      });
      return;
    } catch (lrcError) {
      console.log(`📂 No .lrc file found for ${track.title} (${lrcError.code}), checking embedded lyrics...`);
    }
    
    // Check for embedded lyrics
    try {
      console.log(`🔍 Checking embedded lyrics in: ${track.file_path}`);
      const embeddedResult = await lyricsEmbedder.readEmbeddedLyrics(track.file_path);
      
      console.log(`🎵 Embedded lyrics result:`, {
        hasLyrics: embeddedResult.hasLyrics,
        lyricsLength: embeddedResult.lyrics?.length || 0,
        source: embeddedResult.source
      });
      
      if (embeddedResult.hasLyrics && embeddedResult.lyrics) {
        console.log(`✅ Found embedded lyrics for: ${track.title}`);
        res.json({
          hasLyrics: true,
          lyrics: embeddedResult.lyrics,
          source: 'embedded',
          filePath: track.file_path
        });
      } else {
        console.log(`❌ No embedded lyrics found for: ${track.title}`);
        res.json({
          hasLyrics: false,
          lyrics: null,
          source: null,
          filePath: lrcPath
        });
      }
    } catch (embeddedError) {
      console.error(`❌ Error reading embedded lyrics for ${track.title}:`, embeddedError);
      res.json({
        hasLyrics: false,
        lyrics: null,
        source: null,
        filePath: lrcPath,
        error: embeddedError.message
      });
    }

  } catch (error) {
    console.error('Get lyrics error:', error);
    res.status(500).json({
      error: 'Failed to get lyrics',
      message: error.message
    });
  }
});

// Diagnostic endpoint to check lyrics detection
router.get('/debug/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    
    console.log(`🔧 DEBUGGING: Track ID ${trackId}`);
    
    // Get track info
    const trackResult = await query('SELECT * FROM tracks WHERE id = $1', [trackId]);
    if (trackResult.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    const track = trackResult.rows[0];
    const lrcPath = track.file_path.replace(/\.[^/.]+$/, '.lrc');
    
    // Check LRC file
    let lrcExists = false;
    let lrcContent = null;
    try {
      lrcContent = await fs.readFile(lrcPath, 'utf8');
      lrcExists = true;
    } catch (error) {
      // File doesn't exist
    }
    
    // Check embedded lyrics
    let embeddedResult = null;
    try {
      embeddedResult = await lyricsEmbedder.readEmbeddedLyrics(track.file_path);
    } catch (error) {
      embeddedResult = { hasLyrics: false, lyrics: null, error: error.message };
    }
    
    // Check what scanner thinks
    let scannerResult = null;
    try {
      scannerResult = await lyricsEmbedder.hasEmbeddedLyrics(track.file_path);
    } catch (error) {
      scannerResult = { error: error.message };
    }
    
    res.json({
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        file_path: track.file_path,
        has_lyrics: track.has_lyrics
      },
      lrcFile: {
        path: lrcPath,
        exists: lrcExists,
        content: lrcExists ? lrcContent.substring(0, 200) + '...' : null
      },
      embedded: embeddedResult,
      scannerDetection: scannerResult
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download and save lyrics for a track
router.post('/download', async (req, res) => {
  try {
    const { trackId, lyricsId, source = 'lrclib' } = req.body;
    
    if (!trackId || !lyricsId) {
      return res.status(400).json({
        error: 'Track ID and lyrics ID are required'
      });
    }

    // Add download job to queue
    const jobId = await addJob('lyrics_download', {
      trackId,
      lyricsId,
      source,
      requestedBy: req.ip,
      requestedAt: new Date().toISOString()
    });

    // Process job immediately (in production, use workers)
    processLyricsDownloadJob(jobId);

    res.json({
      success: true,
      jobId,
      message: 'Lyrics download started'
    });

  } catch (error) {
    console.error('Lyrics download error:', error);
    res.status(500).json({
      error: 'Failed to start lyrics download',
      message: error.message
    });
  }
});

// Save custom lyrics
router.post('/save', async (req, res) => {
  try {
    const { trackId, lyrics } = req.body;
    
    if (!trackId || !lyrics) {
      return res.status(400).json({
        error: 'Track ID and lyrics content are required'
      });
    }

    // Get track info
    const trackResult = await query('SELECT * FROM tracks WHERE id = $1', [trackId]);
    if (trackResult.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    const track = trackResult.rows[0];
    
    // Get storage method setting
    const storageMethod = await getSetting('lyrics.storage_method', 'lrc_files');
    
    let lrcSaved = false;
    let embeddedSaved = false;
    let lrcPath = null;
    
    // Save based on storage method
    if (storageMethod === 'lrc_files' || storageMethod === 'both') {
      lrcPath = track.file_path.replace(/\.[^/.]+$/, '.lrc');
      await fs.writeFile(lrcPath, lyrics, 'utf8');
      lrcSaved = true;
      console.log(`📄 Saved LRC file: ${lrcPath}`);
    }
    
    if (storageMethod === 'embedded' || storageMethod === 'both') {
      if (lyricsEmbedder.isSupported(track.file_path)) {
        const embedResult = await lyricsEmbedder.embedLyrics(track.file_path, lyrics, lyrics);
        embeddedSaved = embedResult.success;
        if (embeddedSaved) {
          console.log(`🎵 Embedded lyrics into: ${track.file_path}`);
        } else {
          console.error(`❌ Failed to embed lyrics: ${embedResult.message}`);
        }
      }
    }
    
    // Update track record
    await query(`
      UPDATE tracks 
      SET has_lyrics = true, lyrics_source = 'manual', updated_at = NOW()
      WHERE id = $1
    `, [trackId]);

    res.json({
      success: true,
      message: 'Lyrics saved successfully',
      filePath: lrcPath,
      storageMethod,
      lrcSaved,
      embeddedSaved
    });

  } catch (error) {
    console.error('Save lyrics error:', error);
    res.status(500).json({
      error: 'Failed to save lyrics',
      message: error.message
    });
  }
});

// Helper function to get setting value
async function getSetting(key, defaultValue) {
  try {
    const result = await query('SELECT value, type FROM settings WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return defaultValue;
    }
    
    const { value, type } = result.rows[0];
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return parseFloat(value);
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

// Bulk download lyrics for multiple tracks
router.post('/bulk-download', async (req, res) => {
  try {
    const { trackIds } = req.body;
    
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      return res.status(400).json({
        error: 'Array of track IDs is required'
      });
    }

    // Get settings for lyrics processing
    const storageMethod = await getSetting('lyrics.storage_method', 'lrc_files');
    const overwriteExisting = await getSetting('lyrics.overwrite_existing', false);
    
    console.log(`🎵 Using storage method: ${storageMethod}`);
    
    // Determine what to save based on storage method
    let saveLrcFiles = false;
    let saveEmbedded = false;
    
    switch (storageMethod) {
      case 'lrc_files':
        saveLrcFiles = true;
        saveEmbedded = false;
        break;
      case 'embedded':
        saveLrcFiles = false;
        saveEmbedded = true;
        break;
      case 'both':
        saveLrcFiles = true;
        saveEmbedded = true;
        break;
      default:
        saveLrcFiles = true; // fallback to lrc files
        saveEmbedded = false;
    }
    
    console.log(`📄 Save LRC files: ${saveLrcFiles}, 🎵 Embed: ${saveEmbedded}`);
    
    // Process directly without Redis
    const results = await processBulkLyricsDownloadDirect(trackIds, saveEmbedded, {
      saveLrcFiles,
      overwriteExisting
    });

    res.json({
      success: true,
      message: `Bulk lyrics download completed for ${trackIds.length} tracks`,
      results
    });

  } catch (error) {
    console.error('Bulk lyrics download error:', error);
    res.status(500).json({
      error: 'Failed to process bulk lyrics download',
      message: error.message
    });
  }
});

// Cache for LRCLIB results to avoid repeated API calls
const lyricsCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to search LRCLIB using the /api/get endpoint like original LRCGET
async function searchLrclib(artist, title, album, duration) {
  const cacheKey = `${artist.toLowerCase()}-${title.toLowerCase()}-${album?.toLowerCase() || ''}`;
  
  // Check cache first
  const cachedResult = lyricsCache.get(cacheKey);
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
    console.log(`💾 Using cached result for: ${artist} - ${title}`);
    return cachedResult.data;
  }

  try {
    console.log(`🔍 LRCLIB Search - Artist: "${artist}", Title: "${title}", Album: "${album}", Duration: ${duration}`);
    
    // Use /api/get endpoint like the original LRCGET implementation
    const params = new URLSearchParams({
      artist_name: artist,
      track_name: title
    });
    
    if (album) params.append('album_name', album);
    if (duration) params.append('duration', Math.round(duration));

    const url = `https://lrclib.net/api/get?${params}`;
    console.log(`📡 LRCLIB Request URL: ${url}`);

    const response = await axios.get(url, {
      timeout: 15000, // Increased timeout
      headers: {
        'User-Agent': 'Lyrics-Sync-Web/1.0.0 (https://github.com/user/lyrics-sync-web)'
      }
    });

    console.log(`📥 LRCLIB Response Status: ${response.status}`);

    // The /api/get endpoint returns a single object, not an array
    if (response.data && (response.data.syncedLyrics || response.data.plainLyrics)) {
      const result = [response.data]; // Wrap in array for compatibility
      
      // Cache the result
      lyricsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      console.log(`✅ Found lyrics for: ${artist} - ${title}`);
      return result;
    }

    // Cache empty result to avoid repeated failed requests
    lyricsCache.set(cacheKey, {
      data: [],
      timestamp: Date.now()
    });

    return [];
  } catch (error) {
    console.error('LRCLIB search error:', error.message);
    
    // If /api/get fails, try /api/search as fallback
    try {
      console.log('🔄 Trying /api/search as fallback...');
      const searchParams = new URLSearchParams({
        artist_name: artist,
        track_name: title
      });
      
      if (album) searchParams.append('album_name', album);
      if (duration) searchParams.append('duration', Math.round(duration));

      const searchUrl = `https://lrclib.net/api/search?${searchParams}`;
      console.log(`📡 Fallback LRCLIB Search URL: ${searchUrl}`);

      const searchResponse = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Lyrics-Sync-Web/1.0.0 (https://github.com/user/lyrics-sync-web)'
        }
      });

      console.log(`📥 Fallback Response Status: ${searchResponse.status}`);
      
      const searchData = searchResponse.data || [];
      
      // Cache the result
      lyricsCache.set(cacheKey, {
        data: searchData,
        timestamp: Date.now()
      });

      return searchData;
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError.message);
      
      // Cache empty result to avoid repeated failed requests
      lyricsCache.set(cacheKey, {
        data: [],
        timestamp: Date.now()
      });
      
      return [];
    }
  }
}

// Clean up cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of lyricsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      lyricsCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

// Process single lyrics download job
async function processLyricsDownloadJob(jobId) {
  const { updateJob } = require('../redis');
  
  try {
    await updateJob(jobId, { status: 'processing', progress: 0 });
    
    const job = await getJob(jobId);
    const { trackId, lyricsId, source } = job.data;

    // Get track info
    const trackResult = await query('SELECT * FROM tracks WHERE id = $1', [trackId]);
    const track = trackResult.rows[0];

    let lyricsContent;
    
    if (source === 'lrclib') {
      // Fetch lyrics from LRCLIB
      const response = await axios.get(`https://lrclib.net/api/get/${lyricsId}`, {
        timeout: 10000,
        headers: { 'User-Agent': 'Lyrics-Sync-Web/1.0.0' }
      });
      lyricsContent = response.data.syncedLyrics || response.data.plainLyrics;
    }

    if (!lyricsContent) {
      throw new Error('No lyrics content received');
    }

    // Save lyrics file
    const lrcPath = track.file_path.replace(/\.[^/.]+$/, '.lrc');
    await fs.writeFile(lrcPath, lyricsContent, 'utf8');

    // Update database
    await query(`
      UPDATE tracks 
      SET has_lyrics = true, lyrics_source = $1, updated_at = NOW()
      WHERE id = $2
    `, [source, trackId]);

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      result: { filePath: lrcPath, source },
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Lyrics download job ${jobId} failed:`, error);
    await updateJob(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });
  }
}

// Direct bulk lyrics download processing
async function processBulkLyricsDownloadDirect(trackIds, embedLyrics = false, options = {}) {
  const { saveLrcFiles = true, overwriteExisting = false } = options;
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  console.log(`🎵 Starting bulk lyrics download for ${trackIds.length} tracks`);

  for (let i = 0; i < trackIds.length; i++) {
    const trackId = trackIds[i];
    
    try {
      // Get track info
      const trackResult = await query('SELECT * FROM tracks WHERE id = $1', [trackId]);
      const track = trackResult.rows[0];
      
      if (!track) {
        results.errors.push({ trackId, error: 'Track not found' });
        results.failed++;
        continue;
      }

      console.log(`🔍 Searching lyrics for: ${track.artist} - ${track.title}`);

      // Search for lyrics
      const searchResults = await searchLrclib(track.artist, track.title, track.album, track.duration);
      
      if (searchResults.length > 0) {
        const bestMatch = searchResults[0]; // Take first result
        const lyricsContent = bestMatch.syncedLyrics || bestMatch.plainLyrics;
        
        if (lyricsContent) {
          let lrcSaved = false;
          
          // Save as .lrc file if enabled
          if (saveLrcFiles) {
            const lrcPath = track.file_path.replace(/\.[^/.]+$/, '.lrc');
            
            // Check if file exists and handle overwrite setting
            try {
              await fs.access(lrcPath);
              if (!overwriteExisting) {
                console.log(`⏭️ Skipping existing .lrc file: ${path.basename(lrcPath)}`);
              } else {
                await fs.writeFile(lrcPath, lyricsContent, 'utf8');
                lrcSaved = true;
                console.log(`📄 Overwritten .lrc file: ${path.basename(lrcPath)}`);
              }
            } catch (error) {
              // File doesn't exist, create it
              await fs.writeFile(lrcPath, lyricsContent, 'utf8');
              lrcSaved = true;
              console.log(`📄 Created .lrc file: ${path.basename(lrcPath)}`);
            }
          }
          
          // Embed lyrics if requested
          if (embedLyrics) {
            console.log(`📝 Embedding lyrics for: ${track.title}`);
            
            if (lyricsEmbedder.isSupported(track.file_path)) {
              const embedResult = await lyricsEmbedder.embedLyrics(
                track.file_path,
                bestMatch.plainLyrics,
                bestMatch.syncedLyrics
              );
              
              if (embedResult.success) {
                console.log(`✅ Lyrics embedded into: ${track.artist} - ${track.title}`);
              } else {
                console.log(`⚠️ Embedding failed for ${track.title}: ${embedResult.message}`);
              }
            } else {
              console.log(`⚠️ File format not supported for embedding: ${path.extname(track.file_path)}`);
            }
          }
          
          // Update database
          await query(`
            UPDATE tracks 
            SET has_lyrics = true, lyrics_source = 'lrclib', updated_at = NOW()
            WHERE id = $1
          `, [trackId]);
          
          results.successful++;
          console.log(`✅ Lyrics saved for: ${track.artist} - ${track.title}`);
        } else {
          results.errors.push({ trackId, error: 'No lyrics content found' });
          results.failed++;
        }
      } else {
        results.errors.push({ trackId, error: 'No lyrics found' });
        results.failed++;
        console.log(`❌ No lyrics found for: ${track.artist} - ${track.title}`);
      }
      
      results.processed++;
      
    } catch (error) {
      results.errors.push({ trackId, error: error.message });
      results.failed++;
      results.processed++;
      console.error(`❌ Error processing track ${trackId}:`, error.message);
    }
  }

  console.log(`🎉 Bulk lyrics download completed: ${results.successful} successful, ${results.failed} failed`);
  return results;
}

module.exports = router;