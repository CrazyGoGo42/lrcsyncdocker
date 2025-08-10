const path = require('path');
const fs = require('fs').promises;
const NodeID3 = require('node-id3');

class LyricsEmbedder {
  constructor() {
    this.supportedFormats = ['.mp3'];
  }

  isSupported(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(ext);
  }

  async embedLyrics(filePath, plainLyrics, syncedLyrics) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      console.log(`🎵 Embedding lyrics into: ${filePath}`);
      
      switch (ext) {
        case '.mp3':
          return await this.embedMP3Lyrics(filePath, plainLyrics, syncedLyrics);
        case '.flac':
          // FLAC embedding would require additional dependencies
          console.log('⚠️ FLAC embedding not yet supported');
          return { success: false, message: 'FLAC embedding not supported' };
        default:
          console.log(`⚠️ Unsupported format: ${ext}`);
          return { success: false, message: `Unsupported format: ${ext}` };
      }
    } catch (error) {
      console.error(`❌ Failed to embed lyrics in ${filePath}:`, error);
      return { success: false, message: error.message };
    }
  }

  async embedMP3Lyrics(filePath, plainLyrics, syncedLyrics) {
    try {
      // Read current tags
      const currentTags = NodeID3.read(filePath) || {};
      
      // Prepare tags for lyrics
      const tags = { ...currentTags };
      
      // Add unsynchronized lyrics (USLT frame)
      if (plainLyrics) {
        tags.unsynchronisedLyrics = {
          language: 'eng',
          shortText: '',
          text: plainLyrics
        };
      }
      
      // Add synchronized lyrics (SYLT frame)
      // Note: node-id3 has limited SYLT support, so we'll store synced lyrics as a comment for now
      if (syncedLyrics) {
        tags.comment = {
          language: 'eng',
          shortText: 'Synced Lyrics',
          text: syncedLyrics
        };
      }
      
      // Write tags to file
      const success = NodeID3.write(tags, filePath);
      
      if (success) {
        console.log(`✅ Successfully embedded lyrics into: ${path.basename(filePath)}`);
        return { success: true, message: 'Lyrics embedded successfully' };
      } else {
        throw new Error('Failed to write ID3 tags');
      }
    } catch (error) {
      console.error(`❌ MP3 embedding error for ${filePath}:`, error);
      throw error;
    }
  }

  async removeLyrics(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      console.log(`🗑️ Removing lyrics from: ${filePath}`);
      
      switch (ext) {
        case '.mp3':
          return await this.removeMP3Lyrics(filePath);
        default:
          return { success: false, message: `Unsupported format: ${ext}` };
      }
    } catch (error) {
      console.error(`❌ Failed to remove lyrics from ${filePath}:`, error);
      return { success: false, message: error.message };
    }
  }

  async removeMP3Lyrics(filePath) {
    try {
      // Read current tags
      const currentTags = NodeID3.read(filePath) || {};
      
      // Remove lyrics-related tags
      const tags = { ...currentTags };
      delete tags.unsynchronisedLyrics;
      delete tags.comment; // Remove comment that might contain synced lyrics
      
      // Write cleaned tags
      const success = NodeID3.write(tags, filePath);
      
      if (success) {
        console.log(`✅ Successfully removed lyrics from: ${path.basename(filePath)}`);
        return { success: true, message: 'Lyrics removed successfully' };
      } else {
        throw new Error('Failed to write cleaned ID3 tags');
      }
    } catch (error) {
      console.error(`❌ MP3 lyrics removal error for ${filePath}:`, error);
      throw error;
    }
  }

  async hasEmbeddedLyrics(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.mp3':
          const tags = NodeID3.read(filePath) || {};
          
          // Check for any lyrics content
          const hasUnsyncedLyrics = tags.unsynchronisedLyrics?.text?.trim();
          const hasSyncedInComment = tags.comment?.text?.trim() && tags.comment?.shortText === 'Synced Lyrics';
          const hasCommentLyrics = tags.comment?.text?.trim();
          
          const hasAnyLyrics = !!(hasUnsyncedLyrics || hasSyncedInComment || hasCommentLyrics);
          
          if (hasAnyLyrics) {
            console.log(`🎵 Has embedded lyrics: ${path.basename(filePath)} (unsync: ${!!hasUnsyncedLyrics}, synced: ${!!hasSyncedInComment}, comment: ${!!hasCommentLyrics})`);
          }
          
          return hasAnyLyrics;
        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ Error checking embedded lyrics in ${filePath}:`, error);
      return false;
    }
  }

  async readEmbeddedLyrics(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    console.log(`🔍 Reading embedded lyrics from: ${filePath} (${ext})`);
    
    try {
      switch (ext) {
        case '.mp3':
          console.log(`📖 Reading ID3 tags from MP3: ${path.basename(filePath)}`);
          const tags = NodeID3.read(filePath) || {};
          
          console.log(`🏷️ Available ID3 tags:`, Object.keys(tags));
          
          let lyrics = '';
          let source = '';
          
          // Check for synced lyrics in comment field first
          if (tags.comment && tags.comment.text && tags.comment.shortText === 'Synced Lyrics') {
            lyrics = tags.comment.text;
            source = 'comment (synced)';
            console.log(`✅ Found synced lyrics in comment field: ${lyrics.length} characters`);
          }
          // Fall back to unsynchronized lyrics
          else if (tags.unsynchronisedLyrics && tags.unsynchronisedLyrics.text) {
            lyrics = tags.unsynchronisedLyrics.text;
            source = 'unsynchronised';
            console.log(`✅ Found unsynchronised lyrics: ${lyrics.length} characters`);
          }
          // Check comment field for any lyrics
          else if (tags.comment && tags.comment.text) {
            lyrics = tags.comment.text;
            source = 'comment';
            console.log(`✅ Found lyrics in comment field: ${lyrics.length} characters`);
          }
          
          if (lyrics) {
            console.log(`🎵 Extracted lyrics (${source}):`, lyrics.substring(0, 100) + '...');
          } else {
            console.log(`❌ No lyrics found in any ID3 field`);
            if (tags.comment) {
              console.log(`📝 Comment field exists but not lyrics:`, tags.comment);
            }
            if (tags.unsynchronisedLyrics) {
              console.log(`📝 Unsynchronised lyrics field exists:`, tags.unsynchronisedLyrics);
            }
          }
          
          return {
            hasLyrics: !!lyrics,
            lyrics: lyrics || null,
            source: 'embedded'
          };
        default:
          console.log(`⚠️ Unsupported file format for embedded lyrics: ${ext}`);
          return {
            hasLyrics: false,
            lyrics: null,
            source: null
          };
      }
    } catch (error) {
      console.error(`❌ Error reading embedded lyrics from ${filePath}:`, error);
      return {
        hasLyrics: false,
        lyrics: null,
        source: null
      };
    }
  }

  getSupportedFormats() {
    return [...this.supportedFormats];
  }
}

module.exports = new LyricsEmbedder();