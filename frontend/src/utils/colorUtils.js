/**
 * Utility functions for color conversion and manipulation
 */

export const rgbToHex = (rgb) => {
  if (!rgb || typeof rgb !== 'string') return rgb;
  
  // Extract RGB values from rgb(r, g, b) string
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;
  
  const [, r, g, b] = match;
  return `#${((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b))
    .toString(16)
    .slice(1)}`;
};

export const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return hex;
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
    : hex;
};

export const normalizeColors = (colors) => {
  if (!colors) return colors;
  
  return {
    primary: rgbToHex(colors.primary),
    secondary: rgbToHex(colors.secondary),
    accent: rgbToHex(colors.accent),
    raw: colors.raw
  };
};