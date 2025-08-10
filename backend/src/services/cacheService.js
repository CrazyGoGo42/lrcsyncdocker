const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.cachePath = process.env.CACHE_PATH || '/app/cache';
    this.metadataPath = path.join(this.cachePath, 'metadata');
    this.artworkPath = path.join(this.cachePath, 'artwork');
    this.configPath = path.join(this.cachePath, 'config');
    this.tempPath = path.join(this.cachePath, 'temp');
    
    // Initialize cache directories
    this.initializeCacheDirectories();
  }

  async initializeCacheDirectories() {
    try {
      const directories = [
        this.cachePath,
        this.metadataPath,
        this.artworkPath,
        this.configPath,
        this.tempPath
      ];

      for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      console.log('📁 Cache directories initialized:', {
        metadata: this.metadataPath,
        artwork: this.artworkPath,
        config: this.configPath,
        temp: this.tempPath
      });
    } catch (error) {
      console.warn('⚠️ Failed to initialize cache directories:', error.message);
    }
  }

  // Generate cache key from file path and stats
  generateFileKey(filePath, stats = null) {
    const pathHash = crypto.createHash('md5').update(filePath).digest('hex');
    if (stats) {
      const statsHash = crypto.createHash('md5')
        .update(`${stats.size}:${stats.mtime.getTime()}`)
        .digest('hex');
      return `${pathHash}_${statsHash}`;
    }
    return pathHash;
  }

  // Metadata caching
  async getCachedMetadata(filePath, stats) {
    try {
      const cacheKey = this.generateFileKey(filePath, stats);
      const cacheFile = path.join(this.metadataPath, `${cacheKey}.json`);
      
      const data = await fs.readFile(cacheFile, 'utf8');
      const cached = JSON.parse(data);
      
      // Validate cache entry
      if (cached.filePath === filePath && cached.timestamp) {
        console.log(`💾 Using cached metadata for: ${path.basename(filePath)}`);
        return cached.metadata;
      }
      
      return null;
    } catch (error) {
      return null; // Cache miss
    }
  }

  async setCachedMetadata(filePath, stats, metadata) {
    try {
      const cacheKey = this.generateFileKey(filePath, stats);
      const cacheFile = path.join(this.metadataPath, `${cacheKey}.json`);
      
      const cacheEntry = {
        filePath,
        metadata,
        timestamp: Date.now(),
        stats: {
          size: stats.size,
          mtime: stats.mtime
        }
      };
      
      await fs.writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2));
      console.log(`💾 Cached metadata for: ${path.basename(filePath)}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache metadata for ${filePath}:`, error.message);
    }
  }

  // Album artwork caching
  async getCachedArtwork(artworkHash) {
    try {
      const artworkFile = path.join(this.artworkPath, `${artworkHash}.jpg`);
      await fs.access(artworkFile);
      return `/cache/artwork/${artworkHash}.jpg`;
    } catch (error) {
      return null;
    }
  }

  async setCachedArtwork(artworkData, format = 'jpg') {
    try {
      const artworkHash = crypto.createHash('md5').update(artworkData).digest('hex');
      const artworkFile = path.join(this.artworkPath, `${artworkHash}.jpg`); // Always save as JPG for consistency
      
      // Resize and optimize the image to max 300x300 for web display
      try {
        const sharp = require('sharp');
        const optimizedImage = await sharp(artworkData)
          .resize(300, 300, {
            fit: 'cover',
            position: 'centre'
          })
          .jpeg({ 
            quality: 85, 
            progressive: true 
          })
          .toBuffer();
        
        await fs.writeFile(artworkFile, optimizedImage);
        console.log(`🎨 Cached optimized artwork: ${artworkHash}.jpg`);
        
        return `/cache/artwork/${artworkHash}.jpg`;
      } catch (sharpError) {
        // Fallback: save original image if Sharp processing fails
        console.warn('⚠️ Sharp processing failed, saving original:', sharpError.message);
        await fs.writeFile(artworkFile, artworkData);
        console.log(`🎨 Cached artwork (original): ${artworkHash}.jpg`);
        
        return `/cache/artwork/${artworkHash}.jpg`;
      }
    } catch (error) {
      console.warn('⚠️ Failed to cache artwork:', error.message);
      return null;
    }
  }

  // Configuration caching
  async getCachedConfig(configKey) {
    try {
      const configFile = path.join(this.configPath, `${configKey}.json`);
      const data = await fs.readFile(configFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async setCachedConfig(configKey, configData) {
    try {
      const configFile = path.join(this.configPath, `${configKey}.json`);
      await fs.writeFile(configFile, JSON.stringify(configData, null, 2));
      console.log(`⚙️ Cached configuration: ${configKey}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache configuration ${configKey}:`, error.message);
    }
  }

  // Scanner results caching
  async getCachedScanResults(scanKey) {
    try {
      const scanFile = path.join(this.metadataPath, `scan_${scanKey}.json`);
      const data = await fs.readFile(scanFile, 'utf8');
      const cached = JSON.parse(data);
      
      // Check if cache is not older than 1 hour
      if (Date.now() - cached.timestamp < 3600000) {
        return cached.results;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async setCachedScanResults(scanKey, results) {
    try {
      const scanFile = path.join(this.metadataPath, `scan_${scanKey}.json`);
      const cacheEntry = {
        scanKey,
        results,
        timestamp: Date.now()
      };
      
      await fs.writeFile(scanFile, JSON.stringify(cacheEntry, null, 2));
      console.log(`📊 Cached scan results: ${scanKey}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache scan results ${scanKey}:`, error.message);
    }
  }

  // Temporary files management
  async createTempFile(filename, data) {
    try {
      const tempFile = path.join(this.tempPath, filename);
      await fs.writeFile(tempFile, data);
      return tempFile;
    } catch (error) {
      console.warn(`⚠️ Failed to create temp file ${filename}:`, error.message);
      return null;
    }
  }

  async cleanupTempFiles(maxAge = 86400000) { // 24 hours
    try {
      const files = await fs.readdir(this.tempPath);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`🧹 Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup temp files:', error.message);
    }
  }

  // Cache statistics
  async getCacheStats() {
    try {
      const stats = {
        metadata: { count: 0, size: 0 },
        artwork: { count: 0, size: 0 },
        config: { count: 0, size: 0 },
        temp: { count: 0, size: 0 }
      };

      const directories = {
        metadata: this.metadataPath,
        artwork: this.artworkPath,
        config: this.configPath,
        temp: this.tempPath
      };

      for (const [type, dir] of Object.entries(directories)) {
        try {
          const files = await fs.readdir(dir);
          stats[type].count = files.length;
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const fileStats = await fs.stat(filePath);
            stats[type].size += fileStats.size;
          }
        } catch (error) {
          // Directory might not exist
        }
      }

      return stats;
    } catch (error) {
      console.warn('⚠️ Failed to get cache stats:', error.message);
      return null;
    }
  }

  // Cache cleanup
  async clearCache(type = 'all') {
    try {
      const directories = {
        all: [this.metadataPath, this.artworkPath, this.configPath, this.tempPath],
        metadata: [this.metadataPath],
        artwork: [this.artworkPath],
        config: [this.configPath],
        temp: [this.tempPath]
      };

      const dirsToClean = directories[type] || directories.all;
      
      for (const dir of dirsToClean) {
        try {
          const files = await fs.readdir(dir);
          for (const file of files) {
            await fs.unlink(path.join(dir, file));
          }
          console.log(`🧹 Cleared cache directory: ${path.basename(dir)}`);
        } catch (error) {
          // Directory might not exist or be empty
        }
      }

      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to clear cache (${type}):`, error.message);
      return false;
    }
  }
}

module.exports = new CacheService();