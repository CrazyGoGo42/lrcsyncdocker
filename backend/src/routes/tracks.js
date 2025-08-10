const express = require('express');
const fs = require('fs');
const path = require('path');
const { query } = require('../database');

const router = express.Router();

// Get tracks with pagination, filtering, and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      artist = '',
      album = '',
      hasLyrics = '',
      sortBy = 'title',
      sortOrder = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        title ILIKE $${paramIndex} OR 
        artist ILIKE $${paramIndex} OR 
        album ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (artist) {
      conditions.push(`artist ILIKE $${paramIndex}`);
      params.push(`%${artist}%`);
      paramIndex++;
    }

    if (album) {
      conditions.push(`album ILIKE $${paramIndex}`);
      params.push(`%${album}%`);
      paramIndex++;
    }

    if (hasLyrics !== '') {
      conditions.push(`has_lyrics = $${paramIndex}`);
      params.push(hasLyrics === 'true');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Validate sort parameters
    const validSortColumns = ['title', 'artist', 'album', 'year', 'duration', 'created_at', 'has_lyrics'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'title';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM tracks ${whereClause}
    `, params);
    const totalTracks = parseInt(countResult.rows[0].total);

    // Get tracks
    const tracksResult = await query(`
      SELECT 
        id, file_path, filename, title, artist, album, album_artist,
        genre, year, track_number, duration, file_size, has_lyrics,
        lyrics_source, lyrics_accuracy, artwork_path, created_at, updated_at
      FROM tracks 
      ${whereClause}
      ORDER BY ${sortColumn} ${order}, title ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), offset]);

    // Format response
    const tracks = tracksResult.rows.map(track => ({
      ...track,
      duration: track.duration ? Math.round(track.duration) : null,
      file_size: track.file_size ? parseInt(track.file_size) : null
    }));

    res.json({
      tracks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalTracks,
        totalPages: Math.ceil(totalTracks / parseInt(limit))
      },
      filters: {
        search,
        artist,
        album,
        hasLyrics,
        sortBy: sortColumn,
        sortOrder: order
      }
    });

  } catch (error) {
    console.error('Tracks fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch tracks',
      message: error.message
    });
  }
});

// Get single track by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        id, file_path, filename, title, artist, album, album_artist,
        genre, year, track_number, duration, file_size, has_lyrics,
        lyrics_source, lyrics_accuracy, artwork_path, created_at, updated_at, last_scanned
      FROM tracks 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Track not found'
      });
    }

    const track = result.rows[0];
    res.json({
      ...track,
      duration: track.duration ? Math.round(track.duration) : null,
      file_size: track.file_size ? parseInt(track.file_size) : null
    });

  } catch (error) {
    console.error('Track fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch track',
      message: error.message
    });
  }
});

// Get unique artists
router.get('/filters/artists', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT artist 
      FROM tracks 
      WHERE artist IS NOT NULL 
      ORDER BY artist ASC
    `);

    const artists = result.rows.map(row => row.artist);
    res.json(artists);

  } catch (error) {
    console.error('Artists fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch artists',
      message: error.message
    });
  }
});

// Get unique albums
router.get('/filters/albums', async (req, res) => {
  try {
    const { artist } = req.query;
    
    let query_text = `
      SELECT DISTINCT album 
      FROM tracks 
      WHERE album IS NOT NULL
    `;
    let params = [];

    if (artist) {
      query_text += ` AND artist ILIKE $1`;
      params.push(`%${artist}%`);
    }

    query_text += ` ORDER BY album ASC`;

    const result = await query(query_text, params);
    const albums = result.rows.map(row => row.album);
    res.json(albums);

  } catch (error) {
    console.error('Albums fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch albums',
      message: error.message
    });
  }
});

// Middleware to handle CORS for audio streaming
const audioCorsMiddleware = (req, res, next) => {
  // Remove restrictive CORS headers
  res.removeHeader('Cross-Origin-Resource-Policy');
  
  // Set permissive CORS headers for audio streaming
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  next();
};

// Handle preflight OPTIONS request for audio streaming
router.options('/:trackId/audio', audioCorsMiddleware, (req, res) => {
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// Stream audio file for a specific track
router.get('/:trackId/audio', audioCorsMiddleware, async (req, res) => {
  try {
    
    const { trackId } = req.params;
    
    console.log(`🎵 Audio stream request for trackId: "${trackId}" (type: ${typeof trackId})`);
    console.log(`🎵 Request headers:`, req.headers);
    
    // Validate trackId is numeric
    if (!trackId || isNaN(trackId)) {
      console.log(`❌ Invalid trackId: "${trackId}"`);
      return res.status(400).json({ error: `Invalid track ID: ${trackId}` });
    }
    
    // Get track info
    const trackResult = await query('SELECT * FROM tracks WHERE id = $1', [parseInt(trackId)]);
    if (trackResult.rows.length === 0) {
      console.log(`❌ Track not found in database: ${trackId}`);
      return res.status(404).json({ error: 'Track not found' });
    }
    
    const track = trackResult.rows[0];
    const filePath = track.file_path;
    
    console.log(`🎵 Track found: ${track.artist} - ${track.title}`);
    console.log(`📁 File path: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Audio file not found on filesystem: ${filePath}`);
      return res.status(404).json({ error: 'Audio file not found', filePath });
    }
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Determine MIME type based on file extension - comprehensive format support
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      // Lossless formats
      '.flac': 'audio/flac',
      '.wav': 'audio/wav',
      '.alac': 'audio/mp4',
      '.ape': 'audio/x-monkeys-audio',
      '.wv': 'audio/x-wavpack',
      '.tak': 'audio/x-tak',
      '.tta': 'audio/x-tta',
      '.dsd': 'audio/dsd',
      '.dsf': 'audio/x-dsf',
      '.dff': 'audio/x-dff',
      
      // Lossy compressed formats
      '.mp3': 'audio/mpeg',
      '.aac': 'audio/aac',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.oga': 'audio/ogg',
      '.opus': 'audio/opus',
      '.wma': 'audio/x-ms-wma',
      '.mp4': 'audio/mp4',
      '.3gp': 'audio/3gpp',
      '.amr': 'audio/amr',
      '.webm': 'audio/webm',
      
      // Legacy/Other formats
      '.au': 'audio/basic',
      '.snd': 'audio/basic',
      '.aiff': 'audio/aiff',
      '.aifc': 'audio/aiff',
      '.ra': 'audio/vnd.rn-realaudio',
      '.rm': 'audio/x-pn-realaudio',
      '.ac3': 'audio/ac3',
      '.dts': 'audio/vnd.dts',
      '.mka': 'audio/x-matroska',
      '.mpc': 'audio/x-musepack',
      '.spx': 'audio/speex',
      '.gsm': 'audio/gsm'
    };
    const mimeType = mimeTypes[ext] || 'audio/mpeg';
    
    console.log(`🎵 File info: size=${fileSize}, mime=${mimeType}, ext=${ext}`);
    console.log(`🎵 Range header: ${range || 'none'}`);
    
    if (range) {
      // Handle range requests for audio streaming
      console.log(`📡 Handling range request: ${range}`);
      
      const parts = range.replace(/bytes=/, "").split("-");
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Validate and sanitize range values
      if (isNaN(start) || start < 0) {
        start = 0;
      }
      if (isNaN(end) || end >= fileSize) {
        end = fileSize - 1;
      }
      
      // Check if range is satisfiable
      if (start > end || start >= fileSize) {
        console.log(`❌ Range not satisfiable: ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        res.status(416).send('Range Not Satisfiable\n');
        return;
      }
      
      const chunksize = (end - start) + 1;
      console.log(`📡 Sending range: ${start}-${end}/${fileSize} (${chunksize} bytes)`);
      
      const file = fs.createReadStream(filePath, { start, end });
      
      // Handle stream errors
      file.on('error', (streamError) => {
        console.error('❌ File stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream audio file' });
        }
      });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      };
      
      console.log(`📡 Response headers:`, head);
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Serve entire file
      console.log(`📡 Serving entire file: ${fileSize} bytes`);
      
      const file = fs.createReadStream(filePath);
      
      // Handle stream errors
      file.on('error', (streamError) => {
        console.error('❌ File stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream audio file' });
        }
      });
      
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      };
      
      console.log(`📡 Response headers:`, head);
      
      res.writeHead(200, head);
      file.pipe(res);
    }
    
  } catch (error) {
    console.error('Audio streaming error:', error);
    res.status(500).json({
      error: 'Failed to stream audio',
      message: error.message
    });
  }
});

// Debug endpoint to check track and file availability
router.get('/:trackId/debug', async (req, res) => {
  try {
    const { trackId } = req.params;
    
    console.log(`🔧 Debug request for track: ${trackId}`);
    
    const trackResult = await query('SELECT * FROM tracks WHERE id = $1', [parseInt(trackId)]);
    if (trackResult.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    const track = trackResult.rows[0];
    const filePath = track.file_path;
    const fileExists = fs.existsSync(filePath);
    
    let fileStats = null;
    if (fileExists) {
      try {
        fileStats = fs.statSync(filePath);
      } catch (error) {
        fileStats = { error: error.message };
      }
    }
    
    res.json({
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        file_path: track.file_path
      },
      file: {
        path: filePath,
        exists: fileExists,
        stats: fileStats ? {
          size: fileStats.size,
          mtime: fileStats.mtime,
          isFile: fileStats.isFile?.()
        } : null
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;