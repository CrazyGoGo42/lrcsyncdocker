const fs = require('fs').promises;
const path = require('path');

async function testArtworkExtraction() {
  try {
    // Test file
    const testFile = '/home/gogo/Desktop/phpsynclyrics idea/lyrics-sync-web/music/Voyage (2021)/01 - I Still Have Faith in You.flac';
    
    console.log('Testing artwork extraction from:', testFile);
    
    // Check if file exists
    await fs.access(testFile);
    console.log('✅ File exists');
    
    // Try music-metadata
    console.log('\n--- Testing music-metadata ---');
    try {
      const { parseFile } = await import('music-metadata');
      const metadata = await parseFile(testFile, {
        skipCovers: false,
        skipPostHeaders: true
      });
      
      console.log('Metadata extracted:', {
        title: metadata.common?.title,
        artist: metadata.common?.artist,
        album: metadata.common?.album,
        hasPictures: metadata.common?.picture?.length || 0
      });
      
      if (metadata.common?.picture?.length > 0) {
        const picture = metadata.common.picture[0];
        console.log('First picture:', {
          format: picture.format,
          type: picture.type,
          description: picture.description,
          dataLength: picture.data?.length
        });
      }
    } catch (error) {
      console.error('music-metadata error:', error.message);
    }
    
    // Check for folder.jpg in directory
    console.log('\n--- Checking folder artwork ---');
    const dir = path.dirname(testFile);
    const folderArt = path.join(dir, 'folder.jpg');
    
    try {
      await fs.access(folderArt);
      const stats = await fs.stat(folderArt);
      console.log('✅ folder.jpg found, size:', stats.size, 'bytes');
    } catch (error) {
      console.log('❌ No folder.jpg found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testArtworkExtraction();