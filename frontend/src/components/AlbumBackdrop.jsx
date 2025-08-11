import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { useAppStore } from '../store/appStore';

const AlbumBackdrop = React.memo(() => {
  const { currentTrack } = useAppStore();
  
  const artworkUrl = useMemo(() => {
    if (!currentTrack?.artwork_path) {
      return null;
    }
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cache/artwork/${currentTrack.artwork_path.split('/').pop()}`;
  }, [currentTrack?.artwork_path]);
  
  if (!artworkUrl) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -10, // Lower z-index to ensure it's behind everything
        backgroundImage: `url(${artworkUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(80px) brightness(0.15) saturate(2)',
        transform: 'scale(1.2)', // Slightly larger scale to hide blur edges
        opacity: 0.3, // More subtle
        transition: 'all 0.8s ease-in-out',
        pointerEvents: 'none', // Don't interfere with clicks
      }}
    />
  );
});

export default AlbumBackdrop;