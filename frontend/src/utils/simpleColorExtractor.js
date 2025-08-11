/**
 * Simple and effective color extraction from album art
 */

// Color utility functions
const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const getLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const isColorVibrant = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const avg = (r + g + b) / 3;
  
  // Check if color is vibrant enough (good saturation and not too dark/light)
  return diff > 30 && avg > 40 && avg < 215;
};

const colorDistance = (color1, color2) => {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

/**
 * Extract dominant colors from an image
 */
export const extractColorsFromImage = (imageSrc) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Scale down for faster processing
      const maxSize = 100;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      try {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        console.log('🖼️ Canvas data extracted:', data.length / 4, 'pixels');
        
        const colorMap = new Map();
        
        // Sample every 4th pixel for speed
        for (let i = 0; i < data.length; i += 16) { // Skip more pixels for speed
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Skip transparent or nearly transparent pixels
          if (a < 128) continue;
          
          // Skip very dark or very light pixels
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 240) continue;
          
          // Group similar colors together (reduce precision)
          const key = `${Math.floor(r/20)*20}-${Math.floor(g/20)*20}-${Math.floor(b/20)*20}`;
          colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }
        
        console.log('🎨 Sampled colors:', colorMap.size);
        
        // Get most frequent colors
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([key]) => {
            const [r, g, b] = key.split('-').map(Number);
            return { r, g, b, hex: rgbToHex(r, g, b) };
          });
        
        // Find the best colors for primary, secondary, and accent
        const colors = {
          primary: sortedColors[0]?.hex || '#ff0000',
          secondary: null,
          accent: null,
          raw: sortedColors.slice(0, 5),
          dominantBrightness: sortedColors[0] ? (sortedColors[0].r + sortedColors[0].g + sortedColors[0].b) / 3 : 128
        };
        
        // Find vibrant colors for secondary and accent
        const vibrantColors = sortedColors.filter(color => 
          isColorVibrant(color.r, color.g, color.b)
        );
        
        if (vibrantColors.length > 0) {
          colors.secondary = vibrantColors[0].hex;
          
          // Find accent color that's different from primary and secondary
          for (const color of vibrantColors) {
            const primary = sortedColors[0];
            const secondary = vibrantColors[0];
            
            if (colorDistance(color, primary) > 100 && 
                colorDistance(color, secondary) > 50) {
              colors.accent = color.hex;
              break;
            }
          }
        }
        
        // Fallback to algorithmic colors if we don't have enough
        if (!colors.secondary || !colors.accent) {
          const primary = sortedColors[0];
          if (primary) {
            // Create complementary colors
            colors.secondary = colors.secondary || rgbToHex(
              Math.max(0, Math.min(255, primary.g + 30)),
              Math.max(0, Math.min(255, primary.b + 30)), 
              Math.max(0, Math.min(255, primary.r + 30))
            );
            colors.accent = colors.accent || rgbToHex(
              Math.max(0, Math.min(255, primary.b + 20)),
              Math.max(0, Math.min(255, primary.r + 20)),
              Math.max(0, Math.min(255, primary.g + 20))
            );
          }
        }
        
        console.log('🎨 Final extracted colors:', colors);
        resolve(colors);
        
      } catch (error) {
        console.error('❌ Color extraction failed:', error);
        // Return fallback colors
        resolve({
          primary: '#ff0000',
          secondary: '#cc0000', 
          accent: '#990000',
          raw: [],
          dominantBrightness: 128
        });
      }
    };
    
    img.onerror = () => {
      console.error('❌ Failed to load image for color extraction');
      resolve({
        primary: '#ff0000',
        secondary: '#cc0000',
        accent: '#990000', 
        raw: [],
        dominantBrightness: 128
      });
    };
    
    img.src = imageSrc;
  });
};

// Fallback color generation based on track info
export const generateFallbackColors = (track) => {
  if (!track) {
    return {
      primary: '#ff0000',
      secondary: '#cc0000',
      accent: '#990000'
    };
  }
  
  // Generate colors based on track name hash
  let hash = 0;
  const name = track.title || track.filename || 'unknown';
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash + char) & 0xffffffff;
  }
  
  // Create pleasant color variations
  const baseHue = Math.abs(hash % 360);
  const saturation = 65 + (Math.abs(hash >> 8) % 20); // 65-85%
  const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%
  
  return {
    primary: `hsl(${baseHue}, ${saturation}%, ${lightness}%)`,
    secondary: `hsl(${(baseHue + 60) % 360}, ${saturation - 10}%, ${lightness + 10}%)`,
    accent: `hsl(${(baseHue + 180) % 360}, ${saturation + 10}%, ${lightness - 5}%)`
  };
};