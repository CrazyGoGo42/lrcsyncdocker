import React, { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Slider,
  Card,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  VolumeUp as VolumeIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
  Shuffle as ShuffleIcon,
  MusicNote as MusicNoteIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import { useAlbumColors } from '../contexts/AlbumColorContext';

const ModernAudioPlayer = () => {
  const theme = useTheme();
  const { colors } = useAlbumColors();
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    volume,
    repeat,
    shuffle,
    queue,
    currentQueueIndex,
    togglePlayback,
    nextTrack,
    previousTrack,
    setVolume,
    setRepeat,
    setShuffle,
    seekToTime,
  } = useAppStore();

  const handleSeek = useCallback((event, newValue) => {
    seekToTime(newValue);
  }, [seekToTime]);

  const handleVolumeChange = useCallback((event, newValue) => {
    setVolume(newValue);
  }, [setVolume]);

  const handleRepeat = useCallback(() => {
    const nextRepeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    setRepeat(nextRepeat);
  }, [repeat, setRepeat]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <Card 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          background: theme.palette.background.paper,
          backdropFilter: 'blur(20px)',
        }}
      >
        <MusicNoteIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No track selected
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a song to start playing
        </Typography>
      </Card>
    );
  }

  return (
    <Card 
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}10 50%, ${colors.accent}10 100%)`,
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: `0 16px 40px ${colors.primary}20`,
      }}
    >
      {/* Album Art & Track Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 3 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 3,
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${colors.primary}40 0%, ${colors.secondary}40 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 8px 24px ${colors.primary}30`,
          }}
        >
          {currentTrack.artwork_path ? (
            <img
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cache/artwork/${currentTrack.artwork_path.split('/').pop()}?v=${Date.now()}`}
              alt={`${currentTrack.album} artwork`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <MusicNoteIcon 
            sx={{ 
              fontSize: 40, 
              color: 'rgba(255,255,255,0.8)',
              display: currentTrack.artwork_path ? 'none' : 'block'
            }} 
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
            noWrap
          >
            {currentTrack.title || currentTrack.filename}
          </Typography>
          <Typography variant="body1" color="text.secondary" noWrap>
            {currentTrack.artist || 'Unknown Artist'}
          </Typography>
          {currentTrack.album && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {currentTrack.album}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Slider
          value={currentTime}
          max={duration || 100}
          onChange={handleSeek}
          disabled={!duration}
          sx={{
            '& .MuiSlider-thumb': {
              width: 18,
              height: 18,
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              border: '3px solid #ffffff',
              boxShadow: `0 4px 12px ${colors.primary}40`,
              '&:hover': {
                boxShadow: `0 0 0 8px ${colors.primary}20`,
              },
            },
            '& .MuiSlider-track': {
              height: 8,
              background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              border: 'none',
              borderRadius: 4,
            },
            '& .MuiSlider-rail': {
              height: 8,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              borderRadius: 4,
            }
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(duration)}
          </Typography>
        </Box>
      </Box>

      {/* Main Controls */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2,
        mb: 2
      }}>
        <IconButton
          onClick={() => setShuffle(!shuffle)}
          sx={{
            color: shuffle ? colors.primary : 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': { transform: 'scale(1.1)' }
          }}
        >
          <ShuffleIcon />
        </IconButton>

        <IconButton
          onClick={previousTrack}
          disabled={queue.length <= 1 || currentQueueIndex <= 0}
          sx={{
            color: 'text.primary',
            transition: 'all 0.2s ease',
            '&:hover': { transform: 'scale(1.1)' }
          }}
        >
          <PrevIcon sx={{ fontSize: 32 }} />
        </IconButton>

        <IconButton
          onClick={togglePlayback}
          sx={{
            width: 64,
            height: 64,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            color: '#ffffff',
            boxShadow: `0 8px 24px ${colors.primary}40`,
            transition: 'all 0.2s ease',
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.accent} 100%)`,
              transform: 'scale(1.05)',
              boxShadow: `0 12px 32px ${colors.primary}50`,
            },
          }}
        >
          {isPlaying ? <PauseIcon sx={{ fontSize: 32 }} /> : <PlayIcon sx={{ fontSize: 32 }} />}
        </IconButton>

        <IconButton
          onClick={nextTrack}
          disabled={queue.length <= 1 || currentQueueIndex >= queue.length - 1}
          sx={{
            color: 'text.primary',
            transition: 'all 0.2s ease',
            '&:hover': { transform: 'scale(1.1)' }
          }}
        >
          <NextIcon sx={{ fontSize: 32 }} />
        </IconButton>

        <IconButton
          onClick={handleRepeat}
          sx={{
            color: repeat !== 'off' ? colors.primary : 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': { transform: 'scale(1.1)' }
          }}
        >
          {repeat === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
        </IconButton>
      </Box>

      {/* Volume Control */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        px: 2
      }}>
        <VolumeIcon sx={{ color: 'text.secondary' }} />
        <Slider
          value={volume}
          onChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.01}
          sx={{
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              backgroundColor: colors.accent,
              border: '2px solid #ffffff',
              boxShadow: `0 2px 8px ${colors.accent}40`,
              '&:hover': {
                boxShadow: `0 0 0 6px ${colors.accent}20`,
              },
            },
            '& .MuiSlider-track': {
              height: 6,
              backgroundColor: colors.accent,
              border: 'none',
            },
            '& .MuiSlider-rail': {
              height: 6,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
          {Math.round(volume * 100)}%
        </Typography>
      </Box>
    </Card>
  );
};

export default ModernAudioPlayer;