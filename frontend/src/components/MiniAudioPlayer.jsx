import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  Slide,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  MusicNote as MusicNoteIcon,
  OpenInFull as OpenInFullIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';

const MiniAudioPlayer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { 
    currentTrack, 
    isPlaying, 
    togglePlayback,
    nextTrack,
    previousTrack,
    queue,
    currentQueueIndex
  } = useAppStore();
  
  const handleOpenFullPlayer = () => {
    navigate('/now-playing');
  };

  if (!currentTrack) return null;

  return (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Card
        sx={{
          position: 'fixed',
          bottom: 0,
          left: { xs: 0, md: 240 },
          right: 0,
          zIndex: 1300,
          borderRadius: '16px 16px 0 0',
          backdropFilter: 'blur(20px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(30, 41, 59, 0.95)' // Dark theme
            : 'rgba(255, 255, 255, 0.95)', // Light theme
          boxShadow: theme.palette.mode === 'dark'
            ? '0 -4px 20px rgba(0, 0, 0, 0.3)'
            : '0 -4px 20px rgba(0, 0, 0, 0.1)',
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
            }}
            onClick={handleOpenFullPlayer}
          >
            {/* Album artwork */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: theme.palette.grey[200],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentTrack.artwork_path ? (
                <img
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cache/artwork/${currentTrack.artwork_path.split('/').pop()}?v=${Date.now()}`}
                  alt={`${currentTrack.album} artwork`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <MusicNoteIcon sx={{ fontSize: 24, color: theme.palette.grey[500] }} />
              )}
            </Box>

            {/* Track info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {currentTrack.title || currentTrack.filename}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {currentTrack.artist}
              </Typography>
            </Box>

            {/* Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Previous button */}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  previousTrack();
                }}
                disabled={queue.length <= 1 || currentQueueIndex <= 0}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '&.Mui-disabled': {
                    color: 'text.disabled',
                  },
                }}
              >
                <SkipPreviousIcon fontSize="small" />
              </IconButton>
              
              {/* Play/Pause button */}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayback();
                }}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  mx: 0.5,
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                {isPlaying ? (
                  <PauseIcon fontSize="small" />
                ) : (
                  <PlayIcon fontSize="small" />
                )}
              </IconButton>
              
              {/* Next button */}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  nextTrack();
                }}
                disabled={queue.length <= 1 || currentQueueIndex >= queue.length - 1}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '&.Mui-disabled': {
                    color: 'text.disabled',
                  },
                }}
              >
                <SkipNextIcon fontSize="small" />
              </IconButton>
              
              {/* Expand button - only on desktop */}
              {!isMobile && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFullPlayer();
                  }}
                  sx={{
                    color: 'text.secondary',
                    ml: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <OpenInFullIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Slide>
  );
};

export default MiniAudioPlayer;