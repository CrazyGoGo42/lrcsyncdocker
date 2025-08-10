const fs = require('fs').promises;
const path = require('path');

async function testFolderArtwork() {
  try {
    const filePath = '/home/gogo/Desktop/phpsynclyrics idea/lyrics-sync-web/music/Thank You for the Music (1994)/Digital Media 01/01 - People Need Love.flac';
    const directory = path.dirname(filePath);
    
    console.log('Testing folder artwork detection for:', filePath);
    console.log('Directory:', directory);
    
    // Check if folder.jpg exists
    const folderJpg = path.join(directory, 'folder.jpg');
    console.log('Looking for:', folderJpg);
    
    try {
      await fs.access(folderJpg);
      const stats = await fs.stat(folderJpg);
      console.log('✅ folder.jpg found! Size:', stats.size, 'bytes');
      
      // Test reading the file
      const data = await fs.readFile(folderJpg);
      console.log('✅ File readable, data length:', data.length);
    } catch (error) {
      console.log('❌ folder.jpg not found:', error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFolderArtwork();