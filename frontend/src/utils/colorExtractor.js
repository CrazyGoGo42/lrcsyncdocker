/**
 * Advanced color extraction from images using k-means clustering and perceptual analysis
 */

/**
 * Convert RGB to HSL for better color analysis
 */
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
};

/**
 * Convert HSL back to RGB
 */
const hslToRgb = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
};

/**
 * Calculate color difference using Delta E (perceptual color difference)
 */
const colorDistance = (color1, color2) => {
  const [r1, g1, b1] = color1;
  const [r2, g2, b2] = color2;

  // Simple Euclidean distance in RGB space (could be improved with LAB color space)
  const deltaR = r1 - r2;
  const deltaG = g1 - g2;
  const deltaB = b1 - b2;

  // Weight green more heavily as human eyes are more sensitive to green
  return Math.sqrt(
    2 * deltaR * deltaR + 4 * deltaG * deltaG + 3 * deltaB * deltaB
  );
};

/**
 * K-means clustering for color quantization
 */
const kMeansClustering = (pixels, k = 5, maxIterations = 10) => {
  if (pixels.length === 0) return [];

  // Initialize centroids randomly
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
    centroids.push([randomPixel.r, randomPixel.g, randomPixel.b]);
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign pixels to clusters
    const clusters = Array(k)
      .fill()
      .map(() => []);

    pixels.forEach((pixel) => {
      const pixelColor = [pixel.r, pixel.g, pixel.b];
      let minDistance = Infinity;
      let closestCluster = 0;

      centroids.forEach((centroid, index) => {
        const distance = colorDistance(pixelColor, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = index;
        }
      });

      clusters[closestCluster].push(pixel);
    });

    // Update centroids
    const newCentroids = clusters.map((cluster) => {
      if (cluster.length === 0) return centroids[0]; // Keep old centroid if cluster is empty

      const sumR = cluster.reduce((sum, pixel) => sum + pixel.r, 0);
      const sumG = cluster.reduce((sum, pixel) => sum + pixel.g, 0);
      const sumB = cluster.reduce((sum, pixel) => sum + pixel.b, 0);

      return [
        Math.round(sumR / cluster.length),
        Math.round(sumG / cluster.length),
        Math.round(sumB / cluster.length),
      ];
    });

    // Check for convergence
    const hasConverged = centroids.every((centroid, index) => {
      const newCentroid = newCentroids[index];
      return colorDistance(centroid, newCentroid) < 1;
    });

    centroids = newCentroids;

    if (hasConverged) break;
  }

  // Return centroids with their cluster sizes
  const clusters = Array(k)
    .fill()
    .map(() => []);
  pixels.forEach((pixel) => {
    const pixelColor = [pixel.r, pixel.g, pixel.b];
    let minDistance = Infinity;
    let closestCluster = 0;

    centroids.forEach((centroid, index) => {
      const distance = colorDistance(pixelColor, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        closestCluster = index;
      }
    });

    clusters[closestCluster].push(pixel);
  });

  return centroids
    .map((centroid, index) => ({
      color: centroid,
      count: clusters[index].length,
      percentage: (clusters[index].length / pixels.length) * 100,
    }))
    .filter((cluster) => cluster.count > 0);
};

/**
 * Analyze color properties for better selection
 */
const analyzeColor = (r, g, b) => {
  const [h, s, l] = rgbToHsl(r, g, b);

  return {
    r,
    g,
    b,
    h,
    s,
    l,
    brightness: (r + g + b) / 3,
    luminance: 0.299 * r + 0.587 * g + 0.114 * b, // Perceived brightness
    saturation: s,
    isVibrant: s > 40 && l > 20 && l < 80,
    isDark: l < 40,
    isLight: l > 60,
    isMuted: s < 30,
    isNeutral: s < 15,
  };
};

/**
 * Select the best color palette from clusters
 */
const selectBestPalette = (clusters) => {
  if (clusters.length === 0) {
    return generateFallbackColors();
  }

  // Sort clusters by size (most dominant first)
  clusters.sort((a, b) => b.count - a.count);

  // Analyze all colors
  const analyzedColors = clusters.map((cluster) => ({
    ...cluster,
    analysis: analyzeColor(...cluster.color),
  }));

  // Filter out colors that are too dark, too light, or too neutral
  const viableColors = analyzedColors.filter(
    ({ analysis }) =>
      !analysis.isNeutral &&
      analysis.luminance > 30 &&
      analysis.luminance < 200 &&
      analysis.saturation > 20
  );

  if (viableColors.length === 0) {
    return generateFallbackColors();
  }

  // Select primary: most dominant viable color
  const primary = viableColors[0];

  // Select secondary: different hue from primary, good saturation
  let secondary =
    viableColors.find((color) => {
      const hueDiff = Math.abs(color.analysis.h - primary.analysis.h);
      const adjustedHueDiff = Math.min(hueDiff, 360 - hueDiff);
      return (
        adjustedHueDiff > 30 &&
        adjustedHueDiff < 180 &&
        color.analysis.isVibrant
      );
    }) ||
    viableColors[1] ||
    primary;

  // Select accent: complementary or triadic color
  let accent = viableColors.find((color) => {
    const hueDiff = Math.abs(color.analysis.h - primary.analysis.h);
    const adjustedHueDiff = Math.min(hueDiff, 360 - hueDiff);
    return (
      adjustedHueDiff > 120 && adjustedHueDiff < 240 && color.analysis.isVibrant
    );
  });

  // If no good accent found, create one by shifting primary hue
  if (!accent) {
    const [r, g, b] = primary.color;
    const [h, s, l] = rgbToHsl(r, g, b);
    const newHue = (h + 180) % 360; // Complementary color
    const [newR, newG, newB] = hslToRgb(
      newHue,
      Math.max(s, 50),
      Math.min(l + 10, 70)
    );
    accent = {
      color: [newR, newG, newB],
      analysis: analyzeColor(newR, newG, newB),
    };
  }

  // Ensure good contrast between colors
  const adjustColorForContrast = (baseColor, targetColor, minDistance = 40) => {
    const distance = colorDistance(baseColor.color, targetColor.color);
    if (distance < minDistance) {
      const [r, g, b] = targetColor.color;
      const [h, s, l] = rgbToHsl(r, g, b);
      const newL = l > 50 ? Math.min(l + 20, 80) : Math.max(l - 20, 20);
      const [newR, newG, newB] = hslToRgb(h, s, newL);
      return { ...targetColor, color: [newR, newG, newB] };
    }
    return targetColor;
  };

  secondary = adjustColorForContrast(primary, secondary);
  accent = adjustColorForContrast(primary, accent, 60);

  return {
    primary: `rgb(${primary.color.join(", ")})`,
    secondary: `rgb(${secondary.color.join(", ")})`,
    accent: `rgb(${accent.color.join(", ")})`,
    dominantBrightness: primary.analysis.luminance,
    palette: viableColors.slice(0, 5).map((c) => `rgb(${c.color.join(", ")})`),
    debug: {
      totalClusters: clusters.length,
      viableClusters: viableColors.length,
      primaryDominance: primary.percentage,
    },
  };
};

/**
 * Enhanced color extraction with improved sampling and analysis
 */
export const extractColorsFromImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        // Use optimal size for color extraction
        const size = 100; // Increased for better color sampling
        canvas.width = size;
        canvas.height = size;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, size, size);

        // Get image data
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        console.log("🖼️ Processing image data:", pixels.length / 4, "pixels");

        // Extract pixel data with better sampling
        const colorPixels = [];
        const skipRate = 4; // Sample every 4th pixel for performance

        for (let i = 0; i < pixels.length; i += skipRate * 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const alpha = pixels[i + 3];

          // Skip transparent or nearly transparent pixels
          if (alpha < 128) continue;

          const analysis = analyzeColor(r, g, b);

          // Skip colors that are too extreme or neutral
          if (
            analysis.isNeutral ||
            analysis.luminance < 20 ||
            analysis.luminance > 230 ||
            analysis.saturation < 10
          ) {
            continue;
          }

          colorPixels.push({ r, g, b, alpha, ...analysis });
        }

        console.log("🎨 Viable color pixels:", colorPixels.length);

        if (colorPixels.length < 10) {
          console.warn("⚠️ Insufficient color data, using hash-based fallback");
          resolve(generateHashBasedColors(imageUrl));
          return;
        }

        // Apply k-means clustering to find dominant colors
        const clusters = kMeansClustering(colorPixels, 8, 15); // More clusters, more iterations
        console.log("📊 Color clusters found:", clusters.length);

        // Select the best color palette
        const palette = selectBestPalette(clusters);
        console.log("🎨 Final color palette:", palette);

        resolve(palette);
      } catch (error) {
        console.error("❌ Color extraction failed:", error);
        resolve(generateHashBasedColors(imageUrl));
      }
    };

    img.onerror = () => {
      console.error("❌ Image load failed for color extraction");
      resolve(generateHashBasedColors(imageUrl));
    };

    // Add cache busting and error handling
    const cacheBuster = Date.now();
    img.src = `${imageUrl}&cache=${cacheBuster}`;
  });
};

/**
 * Generate fallback colors when extraction fails
 */
const generateFallbackColors = () => {
  return {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#ec4899",
    dominantBrightness: 50,
  };
};

/**
 * Enhanced hash-based color generation
 */
const generateHashBasedColors = (imageUrl) => {
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i++) {
    const char = imageUrl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  // Generate more sophisticated color scheme
  const baseHue = Math.abs(hash % 360);
  const baseSaturation = 55 + (Math.abs(hash >> 8) % 25); // 55-80%
  const baseLightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%

  // Create analogous color scheme (colors next to each other on color wheel)
  const primary = hslToRgb(baseHue, baseSaturation, baseLightness);
  const secondary = hslToRgb(
    (baseHue + 45) % 360,
    baseSaturation - 10,
    baseLightness + 5
  );
  const accent = hslToRgb(
    (baseHue + 120) % 360,
    baseSaturation + 10,
    baseLightness - 10
  );

  console.log("🎨 Generated hash-based colors for:", imageUrl.split("/").pop());

  return {
    primary: `rgb(${primary.join(", ")})`,
    secondary: `rgb(${secondary.join(", ")})`,
    accent: `rgb(${accent.join(", ")})`,
    dominantBrightness: baseLightness,
    isHashBased: true,
  };
};

/**
 * Create sophisticated gradients from extracted colors
 */
export const createGradientFromColors = (colors, direction = "135deg") => {
  if (!colors || !colors.primary) {
    return "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)";
  }

  // Create a multi-stop gradient for more visual interest
  return `linear-gradient(${direction}, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`;
};

/**
 * Create radial gradient for backgrounds
 */
export const createRadialGradientFromColors = (colors) => {
  if (!colors || !colors.primary) {
    return "radial-gradient(circle at center, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)";
  }

  return `radial-gradient(circle at center, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`;
};

/**
 * Adjust color brightness for better contrast
 */
export const adjustColorBrightness = (color, amount) => {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!rgbMatch) return color;

  const [, r, g, b] = rgbMatch.map(Number);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.max(0, Math.min(100, l + amount));
  const [newR, newG, newB] = hslToRgb(h, s, newL);

  return `rgb(${newR}, ${newG}, ${newB})`;
};
