/**
 * Mobile-friendly image loading utilities
 */

// Detect mobile devices
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Get cache-busting timestamp - more aggressive for mobile
export const getCacheBustingParam = () => {
  if (isMobile()) {
    // Mobile: use timestamp + random for better cache busting
    return `v=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  } else {
    // Desktop: use just timestamp
    return `v=${Date.now()}`;
  }
};

// Create artwork URL with mobile-specific cache busting
export const createArtworkUrl = (artworkPath, baseUrl = null) => {
  if (!artworkPath) return null;
  
  const baseApiUrl = baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const filename = artworkPath.split('/').pop();
  const cacheBuster = getCacheBustingParam();
  
  return `${baseApiUrl}/api/cache/artwork/${filename}?${cacheBuster}`;
};

// Preload image with mobile-specific handling
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Mobile-specific image loading
    if (isMobile()) {
      // Disable cache for mobile
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
    }
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    
    img.src = src;
  });
};

// Force refresh image on mobile
export const refreshImageOnMobile = (imgElement) => {
  if (isMobile() && imgElement) {
    const currentSrc = imgElement.src;
    const baseUrl = currentSrc.split('?')[0];
    imgElement.src = `${baseUrl}?${getCacheBustingParam()}`;
  }
};