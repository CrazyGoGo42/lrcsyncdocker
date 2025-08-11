import React, { createContext, useContext, useState, useEffect } from "react";
import { useAppStore } from "../store/appStore";
import { extractColorsFromImage, generateFallbackColors } from "../utils/simpleColorExtractor";
import { createArtworkUrl } from "../utils/imageLoader";
import { AppThemeProvider } from "./ThemeContext";

const AlbumColorContext = createContext({});

// Track user interactions for autoplay permission
let userInteractionCount = 0;
const trackUserInteraction = () => {
  userInteractionCount++;
  console.log('✅ User interaction detected: scroll count:', userInteractionCount);
};

// Add scroll listener to track user interaction
if (typeof window !== 'undefined') {
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(trackUserInteraction, 100);
  }, { passive: true });
}

export const useAlbumColors = () => {
  const context = useContext(AlbumColorContext);
  if (!context) {
    throw new Error("useAlbumColors must be used within AlbumColorProvider");
  }
  return context;
};

export const AlbumColorProvider = ({ children }) => {
  const { currentTrack } = useAppStore();
  const [colors, setColors] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Extract colors from current track
  useEffect(() => {
    const extractColors = async () => {
      if (!currentTrack) {
        setColors(null);
        return;
      }

      // If no artwork, use fallback colors
      if (!currentTrack.artwork_path) {
        console.log('🎨 No artwork, using fallback colors for:', currentTrack.title);
        const fallbackColors = generateFallbackColors(currentTrack);
        setColors(fallbackColors);
        return;
      }

      const artworkUrl = createArtworkUrl(currentTrack.artwork_path);
      const cacheKey = `colors_v2_${currentTrack.id}`;

      // Check cache first
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const cachedColors = JSON.parse(cached);
          setColors(cachedColors);
          console.log('🎨 Using cached colors for:', currentTrack.title);
          return;
        }
      } catch (e) {
        console.warn('Failed to load cached colors');
      }

      // Extract colors from artwork
      setIsExtracting(true);
      
      // Add delay to ensure user has interacted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        console.log('🎨 Attempting color extraction from:', artworkUrl);
        const extractedColors = await extractColorsFromImage(artworkUrl);
        
        if (extractedColors) {
          setColors(extractedColors);
          // Cache the results
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(extractedColors));
          } catch (e) {
            console.warn('Failed to cache colors');
          }
          console.log('✅ Color extraction successful:', extractedColors);
        } else {
          throw new Error('No colors extracted');
        }
      } catch (error) {
        console.error('❌ Color extraction failed, using fallback:', error);
        const fallbackColors = generateFallbackColors(currentTrack);
        setColors(fallbackColors);
      } finally {
        setIsExtracting(false);
      }
    };

    extractColors();
  }, [currentTrack?.id, currentTrack?.artwork_path]);

  const value = {
    colors,
    isExtracting,
    hasColors: !!colors,
  };

  return (
    <AlbumColorContext.Provider value={value}>
      <AppThemeProvider colors={colors}>
        {children}
      </AppThemeProvider>
    </AlbumColorContext.Provider>
  );
};