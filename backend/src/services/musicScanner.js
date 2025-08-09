const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { query } = require('../database');

class MusicScanner {
  constructor() {
    this.supportedFormats = ['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.wav', '.wma'];
    this.musicPath = process.env.MUSIC_PATH || '/app/music';
  }

  async scanDirectory(directory = null) {
    const scanDir = directory || this.musicPath;
    
    try {
      console.log(`🔍 Starting scan of: ${scanDir}`);
      
      // Check if directory exists
      await fs.access(scanDir);
      
      // Find all music files
      const musicFiles = await this.findMusicFiles(scanDir);
      console.log(`📁 Found ${musicFiles.length} music files`);
      
      // Process files in batches to avoid overwhelming the database
      const batchSize = 10;
      const results = {
        processed: 0,
        new: 0,
        updated: 0,
        errors: []
      };
      
      for (let i = 0; i < musicFiles.length; i += batchSize) {
        const batch = musicFiles.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch);
        
        results.processed += batchResults.processed;
        results.new += batchResults.new;
        results.updated += batchResults.updated;
        results.errors.push(...batchResults.errors);
        
        // Log progress
        console.log(`📊 Processed ${results.processed}/${musicFiles.length} files`);
      }
      
      console.log('✅ Scan completed:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Scan failed:', error);
      throw error;
    }
  }

  async findMusicFiles(directory) {
    const allFiles = [];
    const supportedFormats = this.supportedFormats;
    
    // Simple recursive function to walk directory
    async function walkDir(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedFormats.includes(ext)) {
            allFiles.push(fullPath);
          }
        }
      }
    }
    
    await walkDir(directory);
    return allFiles;
  }

  async processBatch(files) {
    const results = {
      processed: 0,
      new: 0,
      updated: 0,
      errors: []
    };
    
    const promises = files.map(async (filePath) => {
      try {
        const result = await this.processFile(filePath);
        results.processed++;
        if (result.isNew) results.new++;
        if (result.isUpdated) results.updated++;
      } catch (error) {
        results.errors.push({
          file: filePath,
          error: error.message
        });
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  async processFile(filePath) {
    const stats = await fs.stat(filePath);
    const fileHash = await this.calculateFileHash(filePath);
    
    // Check if file already exists in database
    const existingResult = await query(
      'SELECT id, file_hash, last_scanned FROM tracks WHERE file_path = $1',
      [filePath]
    );
    
    const existing = existingResult.rows[0];
    
    // Skip if file hasn't changed since last scan
    if (existing && existing.file_hash === fileHash) {
      await query(
        'UPDATE tracks SET last_scanned = NOW() WHERE id = $1',
        [existing.id]
      );
      return { isNew: false, isUpdated: false };
    }
    
    // Extract metadata
    const metadata = await this.extractMetadata(filePath);
    
    // Check for existing LRC file
    const hasLyrics = await this.checkForLrcFile(filePath);
    
    const trackData = {
      file_path: filePath,
      filename: path.basename(filePath),
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      album_artist: metadata.albumArtist,
      genre: metadata.genre,
      year: metadata.year,
      track_number: metadata.track,
      duration: metadata.duration,
      file_size: stats.size,
      file_hash: fileHash,
      has_lyrics: hasLyrics,
      last_scanned: new Date()
    };
    
    if (existing) {
      // Update existing record
      await query(`
        UPDATE tracks SET 
          filename = $2, title = $3, artist = $4, album = $5, album_artist = $6,
          genre = $7, year = $8, track_number = $9, duration = $10, 
          file_size = $11, file_hash = $12, has_lyrics = $13, 
          last_scanned = $14, updated_at = NOW()
        WHERE id = $1
      `, [
        existing.id, trackData.filename, trackData.title, trackData.artist, 
        trackData.album, trackData.album_artist, trackData.genre, trackData.year,
        trackData.track_number, trackData.duration, trackData.file_size, 
        trackData.file_hash, trackData.has_lyrics, trackData.last_scanned
      ]);
      
      return { isNew: false, isUpdated: true };
    } else {
      // Insert new record
      await query(`
        INSERT INTO tracks (
          file_path, filename, title, artist, album, album_artist, genre, 
          year, track_number, duration, file_size, file_hash, has_lyrics, last_scanned
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        trackData.file_path, trackData.filename, trackData.title, trackData.artist,
        trackData.album, trackData.album_artist, trackData.genre, trackData.year,
        trackData.track_number, trackData.duration, trackData.file_size,
        trackData.file_hash, trackData.has_lyrics, trackData.last_scanned
      ]);
      
      return { isNew: true, isUpdated: false };
    }
  }

  async extractMetadata(filePath) {
    try {
      console.log(`🎵 Extracting metadata from: ${path.basename(filePath)}`);
      
      // Use dynamic import for ES module music-metadata
      const { parseFile } = await import('music-metadata');
      
      // Use music-metadata to extract actual metadata from the file
      const metadata = await parseFile(filePath, { duration: true, skipPostHeaders: true });
      const common = metadata.common || {};
      const format = metadata.format || {};
      
      console.log(`📊 Raw metadata for ${path.basename(filePath)}:`, {
        title: common.title,
        artist: common.artist,
        album: common.album,
        albumartist: common.albumartist,
        track: common.track
      });
      
      // Extract metadata with fallbacks
      let title = common.title || path.basename(filePath, path.extname(filePath));
      let artist = common.artist || common.albumartist || 'Unknown Artist';
      let album = common.album || 'Unknown Album';
      
      // If no metadata found from file tags, try filename parsing as fallback
      if (!common.title && !common.artist && !common.album) {
        console.log(`📁 No ID3 metadata found, using filename parsing as fallback`);
        const fallbackMetadata = this.extractMetadataFromFilename(filePath);
        if (fallbackMetadata.artist !== 'Unknown Artist') {
          artist = fallbackMetadata.artist;
        }
        if (fallbackMetadata.title !== path.basename(filePath, path.extname(filePath))) {
          title = fallbackMetadata.title;
        }
        if (fallbackMetadata.album !== 'Unknown Album') {
          album = fallbackMetadata.album;
        }
      }
      
      const finalMetadata = {
        title: title || 'Unknown Title',
        artist: artist || 'Unknown Artist',
        album: album || 'Unknown Album',
        albumArtist: common.albumartist || null,
        genre: common.genre ? (Array.isArray(common.genre) ? common.genre[0] : common.genre) : null,
        year: common.year || null,
        track: common.track ? common.track.no : null,
        duration: format.duration ? Math.round(format.duration) : null,
        bitrate: format.bitrate || null,
        sampleRate: format.sampleRate || null
      };
      
      console.log(`✅ Final metadata for ${path.basename(filePath)}:`, finalMetadata);
      return finalMetadata;
      
    } catch (error) {
      console.error(`❌ Failed to extract metadata from ${filePath}:`, error.message);
      
      // Fallback to filename parsing if metadata extraction fails
      return this.extractMetadataFromFilename(filePath);
    }
  }

  extractMetadataFromFilename(filePath) {
    // Fallback method for filename-based extraction
    const filename = path.basename(filePath, path.extname(filePath));
    const dirPath = path.dirname(filePath);
    const pathParts = dirPath.split(path.sep);
    
    // Try to guess artist/album from directory structure
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    
    if (pathParts.length >= 2) {
      const possibleArtist = pathParts[pathParts.length - 2];
      const possibleAlbum = pathParts[pathParts.length - 1];
      
      if (possibleArtist && possibleArtist !== 'music' && possibleArtist !== 'Music') {
        artist = possibleArtist;
      }
      if (possibleAlbum && possibleAlbum !== filename) {
        album = possibleAlbum;
      }
    }
    
    // Try to extract from filename patterns
    let title = filename;
    if (filename.includes(' - ')) {
      const parts = filename.split(' - ');
      if (parts.length >= 2) {
        if (parts.length === 2) {
          artist = parts[0].trim();
          title = parts[1].trim();
        } else if (parts.length >= 3) {
          // Remove track number if present
          const possibleTrackNum = parts[0].trim();
          if (/^\d+$/.test(possibleTrackNum)) {
            artist = parts[1].trim();
            title = parts[2].trim();
          } else {
            artist = parts[0].trim();
            title = parts[1].trim();
          }
        }
      }
    }
    
    return {
      title,
      artist,
      album,
      albumArtist: null,
      genre: null,
      year: null,
      track: null,
      duration: null,
      bitrate: null,
      sampleRate: null
    };
  }

  async checkForLrcFile(musicFilePath) {
    try {
      const lrcPath = musicFilePath.replace(/\.[^/.]+$/, '.lrc');
      await fs.access(lrcPath);
      return true;
    } catch {
      return false;
    }
  }

  async calculateFileHash(filePath) {
    try {
      const data = await fs.readFile(filePath);
      return crypto.createHash('md5').update(data).digest('hex');
    } catch (error) {
      // If we can't read the whole file, use file stats as fallback
      const stats = await fs.stat(filePath);
      return crypto.createHash('md5')
        .update(`${filePath}:${stats.size}:${stats.mtime.getTime()}`)
        .digest('hex');
    }
  }

  async getStats() {
    const results = await query(`
      SELECT 
        COUNT(*) as total_tracks,
        COUNT(*) FILTER (WHERE has_lyrics = true) as tracks_with_lyrics,
        COUNT(DISTINCT artist) as unique_artists,
        COUNT(DISTINCT album) as unique_albums,
        SUM(duration) as total_duration,
        SUM(file_size) as total_size
      FROM tracks
    `);
    
    return results.rows[0];
  }
}

module.exports = MusicScanner;