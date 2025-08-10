import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import {
  Box,
  Paper,
  IconButton,
  Slider,
  Typography,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
} from '@mui/icons-material';

const AudioPlayer = ({ 
  track, 
  onTimeUpdate, 
  onPlay, 
  onPause, 
  onStop,
  seeking = false,
  seekTime = null 
}) => {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);

  const howlRef = useRef(null);
  const intervalRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load new track
  useEffect(() => {
    if (!track?.file_path) {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Unload previous track
    if (howlRef.current) {
      howlRef.current.unload();
    }

    // Create audio URL for the track
    const audioUrl = `/api/tracks/${track.id}/audio`;
    
    console.log(`🎵 Loading audio from: ${audioUrl}`);

    howlRef.current = new Howl({
      src: [audioUrl],
      html5: true,
      volume: isMuted ? 0 : volume,
      onload: () => {
        console.log(`✅ Audio loaded successfully for track ${track.id}`);
        setIsLoading(false);
        setDuration(howlRef.current.duration());
        setError(null);
      },
      onloaderror: (id, error) => {
        console.error('❌ Audio load error:', { id, error, audioUrl });
        setError(`Failed to load audio file: ${error || 'Unknown error'}`);
        setIsLoading(false);
      },
      onplayerror: (id, error) => {
        console.error('❌ Audio play error:', { id, error, audioUrl });
        setError(`Failed to play audio: ${error || 'Unknown error'}`);
        setIsPlaying(false);
      },
      onend: () => {
        console.log(`🎵 Audio playback ended for track ${track.id}`);
        setIsPlaying(false);
        setCurrentTime(0);
        onStop?.();
      }
    });

  }, [track?.id, track?.file_path, volume, isMuted]);

  // Handle external seek requests
  useEffect(() => {
    if (seeking && seekTime !== null && howlRef.current) {
      howlRef.current.seek(seekTime);
      setCurrentTime(seekTime);
    }
  }, [seeking, seekTime]);

  // Update time interval
  useEffect(() => {
    if (isPlaying && howlRef.current) {
      intervalRef.current = setInterval(() => {
        const time = howlRef.current.seek();
        if (typeof time === 'number') {
          setCurrentTime(time);
          onTimeUpdate?.(time);
        }
      }, 100); // Update every 100ms for smooth progress

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isPlaying, onTimeUpdate]);

  const handlePlay = useCallback(() => {
    if (!howlRef.current) return;

    if (isPlaying) {
      howlRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    } else {
      howlRef.current.play();
      setIsPlaying(true);
      onPlay?.();
    }
  }, [isPlaying, onPlay, onPause]);

  const handleStop = useCallback(() => {
    if (!howlRef.current) return;
    
    howlRef.current.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    onStop?.();
  }, [onStop]);

  const handleSeek = useCallback((event, newValue) => {
    if (!howlRef.current || !duration) return;
    
    const seekTime = newValue;
    howlRef.current.seek(seekTime);
    setCurrentTime(seekTime);
    onTimeUpdate?.(seekTime);
  }, [duration, onTimeUpdate]);

  const handleVolumeChange = useCallback((event, newValue) => {
    setVolume(newValue);
    if (howlRef.current) {
      howlRef.current.volume(isMuted ? 0 : newValue);
    }
  }, [isMuted]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (howlRef.current) {
      howlRef.current.volume(newMuted ? 0 : volume);
    }
  }, [isMuted, volume]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) {
    return (
      <Paper 
        sx={{ 
          p: 2, 
          backgroundColor: theme.palette.grey[50],
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          Select a track to play
        </Typography>
      </Paper>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        {/* Track Info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" noWrap>
            {track.title || track.filename}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {track.artist} {track.album && `• ${track.album}`}
          </Typography>
        </Box>

        {/* Error Display */}
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleSeek}
            disabled={!duration || isLoading}
            size="small"
            sx={{
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              },
              '& .MuiSlider-track': {
                height: 4,
              },
              '& .MuiSlider-rail': {
                height: 4,
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption">
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption">
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 1 
        }}>
          <IconButton
            onClick={handlePlay}
            disabled={isLoading || !!error}
            size="large"
            color="primary"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          
          <IconButton
            onClick={handleStop}
            disabled={isLoading || !!error}
            size="medium"
          >
            <StopIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <IconButton onClick={handleMuteToggle} size="small">
              {isMuted ? <MuteIcon /> : <VolumeIcon />}
            </IconButton>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.05}
              sx={{ width: 80 }}
              size="small"
            />
          </Box>
        </Box>

        {/* Loading indicator */}
        {isLoading && (
          <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1, display: 'block' }}>
            Loading audio...
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;