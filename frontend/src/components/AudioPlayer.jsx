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
  MusicNote as MusicNoteIcon,
} from '@mui/icons-material';

const AudioPlayer = ({ 
  track, 
  onTimeUpdate, 
  onPlay, 
  onPause, 
  onStop,
  seeking = false,
  seekTime = null,
  autoplay = false
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

  // Check browser codec support for all major audio formats
  const checkCodecSupport = useCallback((format) => {
    const audio = document.createElement('audio');
    const mimeTypes = {
      // Lossless formats
      'flac': 'audio/flac',
      'wav': 'audio/wav',
      'alac': 'audio/mp4', // Apple Lossless in MP4 container
      'ape': 'audio/x-monkeys-audio',
      'wv': 'audio/x-wavpack',
      
      // Lossy compressed formats
      'mp3': 'audio/mpeg',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4', // AAC in MP4 container
      'ogg': 'audio/ogg; codecs="vorbis"',
      'oga': 'audio/ogg; codecs="vorbis"',
      'opus': 'audio/ogg; codecs="opus"',
      'wma': 'audio/x-ms-wma',
      
      // Other formats
      'webm': 'audio/webm',
      'mp4': 'audio/mp4',
      '3gp': 'audio/3gpp',
      'amr': 'audio/amr',
      
      // Legacy formats
      'au': 'audio/basic',
      'snd': 'audio/basic',
      'aiff': 'audio/aiff',
      'aifc': 'audio/aiff'
    };
    
    const mimeType = mimeTypes[format.toLowerCase()];
    if (!mimeType) {
      return false;
    }
    
    const canPlay = audio.canPlayType(mimeType);
    const isSupported = canPlay === 'probably' || canPlay === 'maybe';
    
    return isSupported;
  }, []);

  // Load new track
  useEffect(() => {
    if (!track?.id) {
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

    // Create audio URL for the track with format hint
    const audioUrl = `/api/tracks/${track.id}/audio`;
    
    // Determine format from filename extension
    const fileExtension = track.filename ? track.filename.split('.').pop().toLowerCase() : '';
    const format = fileExtension || 'mp3'; // Default to mp3 if no extension
    
    // Check if browser supports the format
    const isSupported = checkCodecSupport(format);
    
    if (!isSupported) {
      setError(`Audio format '${format}' is not supported by your browser`);
      setIsLoading(false);
      return;
    }

    howlRef.current = new Howl({
      src: [audioUrl],
      format: [format], // Provide format hint to Howler
      html5: true,
      volume: isMuted ? 0 : volume,
      onload: () => {
        setIsLoading(false);
        setDuration(howlRef.current.duration());
        setError(null);
        
        // Auto-start playback if requested
        if (autoplay) {
          setTimeout(() => {
            howlRef.current.play();
            setIsPlaying(true);
            onPlay?.();
          }, 100);
        }
      },
      onloaderror: (id, error) => {
        let errorMessage = `Failed to load audio file: ${error || 'Unknown error'}`;
        
        // Provide specific guidance for FLAC files
        if (format === 'flac') {
          errorMessage = `FLAC audio not supported in this browser. File format: ${format}`;
        }
        
        setError(errorMessage);
        setIsLoading(false);
      },
      onplayerror: (id, error) => {
        setError(`Failed to play audio: ${error || 'Unknown error'}`);
        setIsPlaying(false);
      },
      onend: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onStop?.();
      }
    });

  }, [track?.id, track?.filename, volume, isMuted, checkCodecSupport]);

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
        {/* Track Info with Artwork */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          {/* Album Artwork */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
              background: theme.palette.grey[200],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {track.artwork_path ? (
              <img
                src={track.artwork_path}
                alt={`${track.album} artwork`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <Box
              sx={{
                display: track.artwork_path ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                color: theme.palette.grey[500]
              }}
            >
              <MusicNoteIcon sx={{ fontSize: 32 }} />
            </Box>
          </Box>

          {/* Track Text Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              {track.title || track.filename}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {track.artist}
            </Typography>
            {track.album && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {track.album}
              </Typography>
            )}
          </Box>
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
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' }
        }}>
          {/* Playback Controls */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
            order: { xs: 1, sm: 0 },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'center', sm: 'flex-start' }
          }}>
            <IconButton
              onClick={handlePlay}
              disabled={isLoading || !!error}
              size="large"
              color="primary"
              sx={{ 
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  transform: 'scale(1.05)',
                },
                '&:disabled': {
                  backgroundColor: 'action.disabled',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            
            <IconButton
              onClick={handleStop}
              disabled={isLoading || !!error}
              size="medium"
              sx={{
                '&:hover': {
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <StopIcon />
            </IconButton>
          </Box>

          {/* Volume Control */}
          <Box sx={{ 
            display: { xs: 'flex', sm: 'flex' },
            alignItems: 'center', 
            gap: 1,
            order: { xs: 2, sm: 0 },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'center', sm: 'flex-end' },
            minWidth: { sm: 120 }
          }}>
            <IconButton 
              onClick={handleMuteToggle} 
              size="small"
              sx={{
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {isMuted ? <MuteIcon /> : <VolumeIcon />}
            </IconButton>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.05}
              sx={{ 
                width: { xs: 120, sm: 80 },
                '& .MuiSlider-thumb': {
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.16)',
                  },
                },
              }}
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