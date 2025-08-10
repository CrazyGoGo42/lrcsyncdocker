const fs = require('fs');
const path = require('path');

async function testMetadataFix() {
  try {
    console.log('🧪 Testing improved metadata extraction...');
    
    const testFile = '/app/music/Voyage (2021)/05 - Just a Notion.flac';
    console.log(`📁 Testing file: ${testFile}`);
    
    if (!fs.existsSync(testFile)) {
      console.log('❌ File does not exist');
      return;
    }
    
    console.log('✅ File exists');
    
    // Method 1: Try music-metadata with different options
    try {
      console.log('🔄 Trying music-metadata with skipCovers...');
      const { parseFile } = await import('music-metadata');
      
      const audioMetadata = await parseFile(testFile, {
        skipCovers: true,  // Skip artwork to avoid parsing issues
        skipPostHeaders: true,
        includeChapters: false,
        mergeTagHeaders: true
      });
      
      if (audioMetadata && audioMetadata.common) {
        console.log('✅ music-metadata SUCCESS!');
        console.log('🎵 Title:', audioMetadata.common.title || 'N/A');
        console.log('🎤 Artist:', audioMetadata.common.artist || 'N/A');
        console.log('💿 Album:', audioMetadata.common.album || 'N/A');
        console.log('📅 Year:', audioMetadata.common.year || 'N/A');
        console.log('🎧 Duration:', audioMetadata.format?.duration || 'N/A');
        return; // Success, exit
      }
    } catch (error) {
      console.log('❌ music-metadata failed:', error.message);
    }
    
    // Method 2: Try to read only ID3 tags if they exist (since we saw ID3 header)
    try {
      console.log('🔄 Trying to read ID3 tags from FLAC...');
      const nodeId3 = require('node-id3');
      
      // Even though it's FLAC, try to read ID3 since we saw ID3 header
      const tags = nodeId3.read(testFile);
      
      if (tags && (tags.title || tags.artist || tags.album)) {
        console.log('✅ ID3 tags found in FLAC!');
        console.log('🎵 Title:', tags.title || 'N/A');
        console.log('🎤 Artist:', tags.artist || 'N/A');
        console.log('💿 Album:', tags.album || 'N/A');
        console.log('📅 Year:', tags.year || 'N/A');
        console.log('🎧 Track:', tags.trackNumber || 'N/A');
        return; // Success, exit
      }
    } catch (error) {
      console.log('❌ ID3 reading failed:', error.message);
    }
    
    // Method 3: Try music-metadata with parseBuffer (read file manually first)
    try {
      console.log('🔄 Trying music-metadata with buffer approach...');
      const { parseBuffer } = await import('music-metadata');
      
      const buffer = fs.readFileSync(testFile);
      const audioMetadata = await parseBuffer(buffer, 'audio/flac', {
        skipCovers: true,
        skipPostHeaders: true
      });
      
      if (audioMetadata && audioMetadata.common) {
        console.log('✅ Buffer parsing SUCCESS!');
        console.log('🎵 Title:', audioMetadata.common.title || 'N/A');
        console.log('🎤 Artist:', audioMetadata.common.artist || 'N/A');
        console.log('💿 Album:', audioMetadata.common.album || 'N/A');
        return; // Success, exit
      }
    } catch (error) {
      console.log('❌ Buffer parsing failed:', error.message);
    }
    
    console.log('❌ All methods failed - will need filename fallback');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testMetadataFix();