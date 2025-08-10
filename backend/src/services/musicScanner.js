const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { query } = require('../database');
const lyricsEmbedder = require('./lyricsEmbedder');
const cacheService = require('./cacheService');

class MusicScanner {
  constructor() {
    // Comprehensive audio format support for lyrics syncing
    this.supportedFormats = [
      // Lossless formats
      '.flac',    // Free Lossless Audio Codec
      '.wav',     // Waveform Audio File Format
      '.alac',    // Apple Lossless Audio Codec
      '.ape',     // Monkey's Audio
      '.wv',      // WavPack
      '.tak',     // Tom's lossless Audio Kompressor
      '.tta',     // True Audio
      '.dsd',     // Direct Stream Digital
      '.dsf',     // DSD Stream File
      '.dff',     // DSD Interchange File Format
      
      // Lossy compressed formats
      '.mp3',     // MPEG-1/2 Audio Layer III
      '.aac',     // Advanced Audio Coding
      '.m4a',     // MPEG-4 Audio (AAC in MP4 container)
      '.ogg',     // Ogg Vorbis
      '.oga',     // Ogg Audio
      '.opus',    // Opus codec
      '.wma',     // Windows Media Audio
      '.mp4',     // MPEG-4 Audio
      '.3gp',     // 3GPP Audio
      '.amr',     // Adaptive Multi-Rate
      '.webm',    // WebM Audio
      
      // Legacy/Other formats
      '.au',      // Sun/NeXT Audio
      '.snd',     // Sound file
      '.aiff',    // Audio Interchange File Format
      '.aifc',    // AIFF Compressed
      '.ra',      // RealAudio
      '.rm',      // RealMedia
      '.ac3',     // Audio Codec 3
      '.dts',     // DTS Coherent Acoustics
      '.mka',     // Matroska Audio
      '.mpc',     // Musepack
      '.spx',     // Speex
      '.gsm'      // GSM Audio
    ];
    this.musicPath = process.env.MUSIC_PATH || '/app/music';
  }

  async scanDirectory(directory = null) {
    const scanDir = directory || this.musicPath;
    
    console.log(`🎵 Starting music scan of: ${scanDir}`);
    
    try {
      // Check if directory exists
      await fs.access(scanDir);
      
      // Get scanner settings
      const settings = await this.getSettings();
      console.log(`📂 Scanner settings:`, settings);
      
      // Step 1: Find all music files that match our criteria
      const musicFiles = await this.findMusicFiles(scanDir, settings);
      console.log(`🎵 Found ${musicFiles.length} music files to process`);
      
      // Step 2: Clean up database - remove files that no longer exist or don't match filters
      const cleanupResult = await this.cleanupDatabase(scanDir, musicFiles, settings);
      console.log(`🧹 Cleanup result:`, cleanupResult);
      
      // Step 3: Process found files
      const processResult = await this.processFiles(musicFiles);
      console.log(`📊 Process result:`, processResult);
      
      const finalResult = {
        ...processResult,
        deleted: cleanupResult.deleted,
        total_in_db: await this.getTotalTracksCount()
      };
      
      console.log(`✅ Scan completed:`, finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('❌ Scan failed:', error);
      throw error;
    }
  }

  async getSettings() {
    const settings = {
      maxDepth: 10,
      includeSubfolders: [],
      excludeSubfolders: []
    };
    
    try {
      // Get max depth
      const depthResult = await query('SELECT value FROM settings WHERE key = $1', ['scanner.max_depth']);
      if (depthResult.rows.length > 0) {
        settings.maxDepth = parseInt(depthResult.rows[0].value) || 10;
      }
      
      // Get include folders
      const includeResult = await query('SELECT value FROM settings WHERE key = $1', ['scanner.include_subfolders']);
      if (includeResult.rows.length > 0) {
        const parsed = JSON.parse(includeResult.rows[0].value || '[]');
        settings.includeSubfolders = Array.isArray(parsed) ? parsed.filter(f => f && f.trim()) : [];
      }
      
      // Get exclude folders
      const excludeResult = await query('SELECT value FROM settings WHERE key = $1', ['scanner.exclude_subfolders']);
      if (excludeResult.rows.length > 0) {
        const parsed = JSON.parse(excludeResult.rows[0].value || '[]');
        settings.excludeSubfolders = Array.isArray(parsed) ? parsed.filter(f => f && f.trim()) : [];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load scanner settings, using defaults:', error.message);
    }
    
    return settings;
  }

  async findMusicFiles(baseDir, settings) {
    const musicFiles = [];
    const { maxDepth, includeSubfolders, excludeSubfolders } = settings;
    
    console.log(`🔍 Scanning with settings:
    - Max depth: ${maxDepth}
    - Include folders: ${includeSubfolders.length ? includeSubfolders.join(', ') : 'All'}
    - Exclude folders: ${excludeSubfolders.length ? excludeSubfolders.join(', ') : 'None'}`);
    
    const walkDirectory = async (currentDir, depth = 0) => {
      // Check depth limit
      if (maxDepth > 0 && depth >= maxDepth) {
        console.log(`⏸️ Reached max depth at: ${currentDir}`);
        return;
      }
      
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);
          
          if (entry.isDirectory()) {
            // Check if this directory should be scanned
            if (this.shouldScanDirectory(relativePath, includeSubfolders, excludeSubfolders)) {
              console.log(`📂 Scanning directory: ${relativePath}`);
              await walkDirectory(fullPath, depth + 1);
            } else {
              console.log(`⏭️ Skipping directory: ${relativePath}`);
            }
          } else if (entry.isFile()) {
            // Check if this is a music file
            const ext = path.extname(entry.name).toLowerCase();
            if (this.supportedFormats.includes(ext)) {
              // Check if the file's parent directory should be included
              const parentRelative = path.dirname(relativePath);
              if (this.shouldScanDirectory(parentRelative, includeSubfolders, excludeSubfolders)) {
                musicFiles.push(fullPath);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Cannot read directory ${currentDir}:`, error.message);
      }
    };
    
    await walkDirectory(baseDir);
    return musicFiles;
  }

  shouldScanDirectory(relativePath, includeSubfolders, excludeSubfolders) {
    // Normalize path - use forward slashes and ensure no leading slash
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    
    // If we have include filters, only scan those directories and their subdirectories
    if (includeSubfolders.length > 0) {
      const shouldInclude = includeSubfolders.some(includePattern => {
        const normalizedPattern = includePattern.replace(/\\/g, '/').replace(/^\/+/, '');
        
        // Exact match
        if (normalizedPath === normalizedPattern) {
          return true;
        }
        
        // Is this a subdirectory of an included directory?
        if (normalizedPath.startsWith(normalizedPattern + '/')) {
          return true;
        }
        
        // Is this a parent directory of an included directory?
        if (normalizedPattern.startsWith(normalizedPath + '/') || normalizedPattern.startsWith(normalizedPath) && normalizedPath !== '') {
          return true;
        }
        
        // Root directory case
        if (normalizedPath === '' && normalizedPattern !== '') {
          return true;
        }
        
        return false;
      });
      
      if (!shouldInclude) {
        return false;
      }
    }
    
    // Check exclude filters
    if (excludeSubfolders.length > 0) {
      const shouldExclude = excludeSubfolders.some(excludePattern => {
        const normalizedPattern = excludePattern.replace(/\\/g, '/').replace(/^\/+/, '');
        
        // Exact match
        if (normalizedPath === normalizedPattern) {
          return true;
        }
        
        // Is this a subdirectory of an excluded directory?
        if (normalizedPath.startsWith(normalizedPattern + '/')) {
          return true;
        }
        
        return false;
      });
      
      if (shouldExclude) {
        return false;
      }
    }
    
    return true;
  }

  async cleanupDatabase(baseDir, currentMusicFiles, settings) {
    console.log(`🧹 Cleaning up database...`);
    
    // Get all tracks currently in database
    const result = await query('SELECT id, file_path FROM tracks');
    const dbTracks = result.rows;
    
    console.log(`📊 Database has ${dbTracks.length} tracks, filesystem has ${currentMusicFiles.length} files`);
    
    let deleted = 0;
    const tracksToDelete = [];
    
    for (const dbTrack of dbTracks) {
      const filePath = dbTrack.file_path;
      let shouldDelete = false;
      
      // Check if file still exists
      try {
        await fs.access(filePath);
      } catch {
        console.log(`🗑️ File no longer exists: ${filePath}`);
        shouldDelete = true;
      }
      
      // Check if file matches current scan criteria
      if (!shouldDelete) {
        const relativePath = path.relative(baseDir, filePath);
        const parentDir = path.dirname(relativePath);
        
        if (!this.shouldScanDirectory(parentDir, settings.includeSubfolders, settings.excludeSubfolders)) {
          console.log(`🗑️ File no longer matches scan criteria: ${filePath}`);
          shouldDelete = true;
        }
      }
      
      // Check if file is in current scan results
      if (!shouldDelete && !currentMusicFiles.includes(filePath)) {
        console.log(`🗑️ File not found in current scan: ${filePath}`);
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        tracksToDelete.push(dbTrack.id);
      }
    }
    
    // Delete tracks that no longer exist or don't match criteria
    if (tracksToDelete.length > 0) {
      console.log(`🗑️ Deleting ${tracksToDelete.length} tracks from database`);
      
      // Delete in batches to avoid query length limits
      const batchSize = 100;
      for (let i = 0; i < tracksToDelete.length; i += batchSize) {
        const batch = tracksToDelete.slice(i, i + batchSize);
        const placeholders = batch.map((_, index) => `$${index + 1}`).join(',');
        await query(`DELETE FROM tracks WHERE id IN (${placeholders})`, batch);
      }
      
      deleted = tracksToDelete.length;
    }
    
    return { deleted };
  }

  async processFiles(musicFiles) {
    console.log(`📊 Processing ${musicFiles.length} music files...`);
    
    const results = {
      processed: 0,
      new: 0,
      updated: 0,
      cached: 0,
      errors: []
    };
    
    const batchSize = 10;
    
    for (let i = 0; i < musicFiles.length; i += batchSize) {
      const batch = musicFiles.slice(i, i + batchSize);
      
      for (const filePath of batch) {
        try {
          const result = await this.processFile(filePath);
          results.processed++;
          results[result.action]++;
          
          if (results.processed % 50 === 0) {
            console.log(`📊 Progress: ${results.processed}/${musicFiles.length} files processed`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${filePath}:`, error.message);
          results.errors.push({ file: filePath, error: error.message });
          results.processed++;
        }
      }
    }
    
    return results;
  }

  async processFile(filePath) {
    // Check if file exists in database
    const existingResult = await query('SELECT * FROM tracks WHERE file_path = $1', [filePath]);
    
    // Get file stats
    const stats = await fs.stat(filePath);
    const fileHash = await this.calculateFileHash(filePath);
    
    if (existingResult.rows.length > 0) {
      const existingTrack = existingResult.rows[0];
      
      // Check if file has been modified
      if (existingTrack.file_hash === fileHash && existingTrack.file_size == stats.size) {
        // File unchanged, just update last_scanned
        await query('UPDATE tracks SET last_scanned = NOW() WHERE id = $1', [existingTrack.id]);
        return { action: 'cached' };
      } else {
        // File changed, update it
        const trackData = await this.extractTrackData(filePath, stats, fileHash);
        await this.updateTrack(existingTrack.id, trackData);
        return { action: 'updated' };
      }
    } else {
      // New file, insert it
      const trackData = await this.extractTrackData(filePath, stats, fileHash);
      await this.insertTrack(trackData);
      return { action: 'new' };
    }
  }

  async extractTrackData(filePath, stats, fileHash) {
    // Try to get cached metadata first
    let metadata = await cacheService.getCachedMetadata(filePath, stats);
    
    if (!metadata) {
      // Cache miss - extract metadata and cache it
      metadata = await this.extractMetadata(filePath);
      await cacheService.setCachedMetadata(filePath, stats, metadata);
    }
    
    const hasLyrics = await this.checkForAnyLyrics(filePath);
    
    return {
      file_path: filePath,
      filename: path.basename(filePath),
      title: metadata.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.artist || null,
      album: metadata.album || null,
      album_artist: metadata.albumArtist || null,
      genre: metadata.genre || null,
      year: metadata.year || null,
      track_number: metadata.track || null,
      duration: metadata.duration || null,
      file_size: stats.size,
      file_hash: fileHash,
      has_lyrics: hasLyrics,
      artwork_path: metadata.artwork || null,
      last_scanned: new Date()
    };
  }

  async extractMetadata(filePath) {
    let metadata = {
      title: null,
      artist: null,
      album: null,
      duration: null,
      year: null,
      track: null,
      genre: null,
      albumArtist: null
    };

    // Method 1: Try XML sidecar file first (most reliable for your setup)
    const xmlMetadata = await this.extractXmlMetadata(filePath);
    if (xmlMetadata && (xmlMetadata.title || xmlMetadata.artist)) {
      metadata = { ...metadata, ...xmlMetadata };
      
      // If album is missing from XML, extract from directory structure
      if (!metadata.album) {
        const directoryMetadata = await this.extractDirectoryMetadata(filePath);
        metadata = { ...metadata, ...directoryMetadata };
      }
      
      console.log(`📄 Extracted XML+Directory metadata from: ${path.basename(filePath)}:`, {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.year,
        track: metadata.track
      });
      
      // Still try to get duration from audio file
      try {
        const { parseFile } = await import('music-metadata');
        const audioMetadata = await parseFile(filePath, { skipCovers: true, skipPostHeaders: true });
        if (audioMetadata?.format?.duration) {
          metadata.duration = Math.round(audioMetadata.format.duration);
        }
      } catch (error) {
        console.log(`⚠️ Could not extract duration from ${path.basename(filePath)}`);
      }
      
      return metadata;
    }

    // Method 2: Try music-metadata for clean metadata extraction
    try {
      const { parseFile } = await import('music-metadata');
      const audioMetadata = await parseFile(filePath, {
        skipCovers: true,
        skipPostHeaders: true,
        includeChapters: false,
        mergeTagHeaders: true
      });
      
      if (audioMetadata && audioMetadata.common) {
        const common = audioMetadata.common;
        
        metadata = {
          title: common.title || null,
          artist: common.artist || null,
          album: common.album || null,
          duration: audioMetadata.format?.duration ? Math.round(audioMetadata.format.duration) : null,
          year: common.year || null,
          track: common.track?.no || null,
          genre: common.genre?.[0] || null,
          albumArtist: common.albumartist || null
        };
        
        console.log(`🎵 Extracted music-metadata from: ${path.basename(filePath)}:`, {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration
        });
        
        return metadata;
      }
    } catch (error) {
      console.log(`⚠️ music-metadata failed for ${filePath}:`, error.message);
    }

    // Method 3: Try ID3 tags as fallback (for files with embedded ID3 in FLAC)
    try {
      const nodeId3 = require('node-id3');
      const tags = nodeId3.read(filePath);
      
      if (tags && (tags.title || tags.artist || tags.album)) {
        metadata = {
          ...metadata,
          title: tags.title || metadata.title,
          artist: tags.artist || metadata.artist,
          album: tags.album || metadata.album,
          year: tags.year ? parseInt(tags.year) : metadata.year,
          track: tags.trackNumber ? parseInt(tags.trackNumber.split('/')[0]) : metadata.track,
          genre: tags.genre || metadata.genre,
          albumArtist: tags.performerInfo || metadata.albumArtist
        };
        
        console.log(`🏷️ Extracted ID3 metadata from: ${path.basename(filePath)}:`, {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album
        });
        
        return metadata;
      }
    } catch (id3Error) {
      console.log(`⚠️ ID3 extraction failed for ${filePath}:`, id3Error.message);
    }

    // Method 4: Use directory parsing as final fallback
    const directoryMetadata = await this.extractDirectoryMetadata(filePath);
    metadata = { ...metadata, ...directoryMetadata };
    
    // Set fallback title if still missing
    if (!metadata.title) {
      const filename = path.basename(filePath, path.extname(filePath));
      metadata.title = filename;
    }
    
    // For ABBA tracks, set artist if missing
    if (!metadata.artist && (metadata.album === 'Voyage' || metadata.album === 'Thank You for the Music')) {
      metadata.artist = 'ABBA';
    }
    
    console.log(`📂 Final metadata for: ${path.basename(filePath)}:`, {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      track: metadata.track,
      year: metadata.year
    });

    return metadata;
  }

  async extractXmlMetadata(audioFilePath) {
    try {
      // Look for corresponding XML file
      const xmlPath = audioFilePath.replace(/\.[^/.]+$/, '.xml');
      
      try {
        await fs.access(xmlPath);
      } catch {
        return null; // No XML file found
      }

      const xmlContent = await fs.readFile(xmlPath, 'utf8');
      
      // Parse simple XML structure
      const titleMatch = xmlContent.match(/<title>([^<]+)<\/title>/);
      const artistMatch = xmlContent.match(/<performingartist>([^<]+)<\/performingartist>/);
      const albumMatch = xmlContent.match(/<album>([^<]+)<\/album>/);
      const yearMatch = xmlContent.match(/<year>([^<]+)<\/year>/);
      
      const metadata = {
        title: titleMatch ? titleMatch[1].trim() : null,
        artist: artistMatch ? artistMatch[1].trim() : null,
        album: albumMatch ? albumMatch[1].trim() : null,
        year: yearMatch ? parseInt(yearMatch[1]) : null
      };
      
      return metadata;
      
    } catch (error) {
      console.log(`⚠️ XML parsing failed for ${audioFilePath}:`, error.message);
      return null;
    }
  }

  async extractDirectoryMetadata(filePath) {
    try {
      const parentDir = path.dirname(filePath);
      const parentDirName = path.basename(parentDir);
      
      // For multi-disc albums, look for the actual album directory
      let albumDir = parentDirName;
      
      // If current dir looks like "Digital Media 01", "12 Vinyl 01", etc., go up one level
      if (parentDirName.match(/^(Digital Media|12 Vinyl|CD|Disc)\s*\d+$/i)) {
        const grandParentDir = path.dirname(parentDir);
        albumDir = path.basename(grandParentDir);
      }
      
      const metadata = {};
      
      // Extract album from directory (e.g., "Voyage (2021)" -> album: "Voyage", year: 2021)
      const albumMatch = albumDir.match(/^(.+?)(?:\s*\((\d{4})\))?$/);
      if (albumMatch) {
        metadata.album = albumMatch[1].trim();
        if (albumMatch[2]) {
          metadata.year = parseInt(albumMatch[2]);
        }
      }

      // Parse filename for track number
      const filename = path.basename(filePath, path.extname(filePath));
      const trackMatch = filename.match(/^(\d+)\s*[-.](.+)$/);
      
      if (trackMatch) {
        metadata.track = parseInt(trackMatch[1]);
      }
      
      return metadata;
      
    } catch (error) {
      console.log(`⚠️ Directory parsing failed for ${filePath}:`, error.message);
      return {};
    }
  }

  async saveAlbumArtwork(filePath, artwork) {
    try {
      const extension = artwork.format === 'image/jpeg' ? 'jpg' : 
                       artwork.format === 'image/png' ? 'png' : 'jpg';
      
      // Use cache service to store artwork
      const artworkPath = await cacheService.setCachedArtwork(artwork.data, extension);
      
      if (artworkPath) {
        console.log(`🎨 Cached album artwork for: ${path.basename(filePath)}`);
        return artworkPath;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Failed to save album artwork for ${filePath}:`, error);
      return null;
    }
  }

  async checkForAnyLyrics(filePath) {
    try {
      // Use the enhanced lyrics embedder to check for ANY lyrics (sidecar + embedded)
      return await lyricsEmbedder.hasAnyLyrics(filePath);
    } catch (error) {
      console.error(`Error checking for any lyrics for ${filePath}:`, error);
      return false;
    }
  }

  async checkForEmbeddedLyrics(filePath) {
    try {
      // Use the enhanced method to check embedded and sidecar
      const result = await lyricsEmbedder.readAnyLyrics(filePath);
      return result.hasLyrics;
    } catch (error) {
      console.error(`Error checking embedded lyrics for ${filePath}:`, error);
      return false;
    }
  }

  async calculateFileHash(filePath) {
    try {
      // For large files, just hash file stats instead of content
      const stats = await fs.stat(filePath);
      const hashInput = `${filePath}:${stats.size}:${stats.mtime.getTime()}`;
      return crypto.createHash('md5').update(hashInput).digest('hex');
    } catch (error) {
      console.error(`Error calculating hash for ${filePath}:`, error);
      return null;
    }
  }

  async insertTrack(trackData) {
    await query(`
      INSERT INTO tracks (
        file_path, filename, title, artist, album, album_artist,
        genre, year, track_number, duration, file_size, file_hash,
        has_lyrics, artwork_path, last_scanned, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
    `, [
      trackData.file_path, trackData.filename, trackData.title, trackData.artist,
      trackData.album, trackData.album_artist, trackData.genre, trackData.year,
      trackData.track_number, trackData.duration, trackData.file_size, trackData.file_hash,
      trackData.has_lyrics, trackData.artwork_path, trackData.last_scanned
    ]);
  }

  async updateTrack(trackId, trackData) {
    await query(`
      UPDATE tracks SET
        filename = $2, title = $3, artist = $4, album = $5, album_artist = $6,
        genre = $7, year = $8, track_number = $9, duration = $10, file_size = $11,
        file_hash = $12, has_lyrics = $13, artwork_path = $14, last_scanned = $15, updated_at = NOW()
      WHERE id = $1
    `, [
      trackId, trackData.filename, trackData.title, trackData.artist,
      trackData.album, trackData.album_artist, trackData.genre, trackData.year,
      trackData.track_number, trackData.duration, trackData.file_size, trackData.file_hash,
      trackData.has_lyrics, trackData.artwork_path, trackData.last_scanned
    ]);
  }

  async getTotalTracksCount() {
    const result = await query('SELECT COUNT(*) as total FROM tracks');
    return parseInt(result.rows[0].total) || 0;
  }

  async getScanStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_tracks,
          COUNT(*) FILTER (WHERE has_lyrics = true) as tracks_with_lyrics,
          COUNT(DISTINCT artist) as unique_artists,
          COUNT(DISTINCT album) as unique_albums,
          ROUND(AVG(duration)) as avg_duration
        FROM tracks
      `);
      
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error getting scan stats:', error);
      return {};
    }
  }
}

module.exports = new MusicScanner();