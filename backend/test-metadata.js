const fs = require('fs');
const path = require('path');

async function testMetadata() {
  try {
    console.log('🧪 Testing metadata extraction...');
    
    // Test with music-metadata
    const { parseFile } = await import('music-metadata');
    
    // Test with a specific FLAC file
    const testFile = '/app/music/Voyage (2021)/05 - Just a Notion.flac';
    console.log(`📁 Testing file: ${testFile}`);
    
    // Check if file exists
    if (fs.existsSync(testFile)) {
      console.log('✅ File exists');
      
      const stats = fs.statSync(testFile);
      console.log(`📊 File size: ${stats.size} bytes`);
      
      // Read first few bytes to check file header
      const buffer = fs.readFileSync(testFile, { start: 0, end: 10 });
      console.log('🔍 File header (hex):', buffer.toString('hex'));
      console.log('🔍 File header (ascii):', buffer.toString('ascii'));
      
      // Try to parse with music-metadata
      const audioMetadata = await parseFile(testFile, {
        skipCovers: true,
        skipPostHeaders: false,
        includeChapters: false
      });
      
      if (audioMetadata && audioMetadata.common) {
        console.log('✅ Metadata extracted successfully!');
        console.log('🎵 Title:', audioMetadata.common.title);
        console.log('🎤 Artist:', audioMetadata.common.artist);
        console.log('💿 Album:', audioMetadata.common.album);
        console.log('📅 Year:', audioMetadata.common.year);
      } else {
        console.log('❌ No common metadata found');
      }
      
    } else {
      console.log('❌ File does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMetadata();