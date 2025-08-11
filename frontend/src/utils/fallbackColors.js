/**
 * Fallback color schemes when image color extraction fails
 */

export const generateColorsFromHash = (input) => {
  // Create a simple hash from the input string
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use hash to generate colors with better variation
  const hue = Math.abs(hash % 360);
  const saturation = 50 + (Math.abs(hash) % 30); // 50-80%
  const lightness = 45 + (Math.abs(hash >> 8) % 20); // 45-65%
  
  // Convert HSL to RGB for consistency
  const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };

  const [r1, g1, b1] = hslToRgb(hue, saturation, lightness);
  const [r2, g2, b2] = hslToRgb((hue + 30) % 360, saturation - 10, lightness + 10);
  const [r3, g3, b3] = hslToRgb((hue + 180) % 360, saturation - 20, lightness - 5);
  
  return {
    primary: `rgb(${r1}, ${g1}, ${b1})`,
    secondary: `rgb(${r2}, ${g2}, ${b2})`,
    accent: `rgb(${r3}, ${g3}, ${b3})`,
    dominantBrightness: lightness
  };
};

export const getColorSchemeForTrack = (track) => {
  if (!track) {
    return {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899'
    };
  }
  
  // Generate colors based on track info
  const input = `${track.title || ''}-${track.artist || ''}-${track.album || ''}`;
  return generateColorsFromHash(input);
};

// Predefined color schemes for different music genres/moods
export const musicColorSchemes = {
  rock: {
    primary: '#dc2626', // red
    secondary: '#ea580c', // orange
    accent: '#ca8a04' // yellow
  },
  pop: {
    primary: '#ec4899', // pink
    secondary: '#8b5cf6', // purple
    accent: '#06b6d4' // cyan
  },
  jazz: {
    primary: '#059669', // emerald
    secondary: '#0d9488', // teal
    accent: '#0284c7' // blue
  },
  classical: {
    primary: '#7c3aed', // violet
    secondary: '#9333ea', // purple
    accent: '#a855f7' // purple light
  },
  electronic: {
    primary: '#06b6d4', // cyan
    secondary: '#0ea5e9', // sky
    accent: '#6366f1' // indigo
  },
  default: {
    primary: '#6366f1', // indigo
    secondary: '#8b5cf6', // violet
    accent: '#ec4899' // pink
  }
};