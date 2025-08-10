import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Paper,
  Grid,
  IconButton,
  Chip,
  Divider,
  Tooltip,
  LinearProgress,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Edit as EditIcon,
  Sync as SyncIcon,
  RestoreFromTrash as ResetIcon,
} from '@mui/icons-material';
import { saveLyrics, getTrackLyrics } from '../services/api';
import toast from 'react-hot-toast';

const LyricsEditor = ({ open, onClose, track }) => {
  const [lyrics, setLyrics] = useState('');
  const [originalLyrics, setOriginalLyrics] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [hoverTime, setHoverTime] = useState(null);
  const [isHoveringProgressBar, setIsHoveringProgressBar] = useState(false);
  
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const queryClient = useQueryClient();
  
  // Initialize audioRef
  useEffect(() => {
    // Wait for audio element to be rendered
    const checkAudioRef = () => {
      if (!audioRef.current) {
        setTimeout(checkAudioRef, 100);
      }
    };
    checkAudioRef();
  }, []);

  const saveMutation = useMutation(
    ({ trackId, lyrics }) => saveLyrics(trackId, lyrics),
    {
      onSuccess: () => {
        toast.success('Lyrics saved successfully!');
        queryClient.invalidateQueries('tracks');
        setOriginalLyrics(lyrics);
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(`Failed to save lyrics: ${error.message}`);
      },
    }
  );

  // Load lyrics and audio when track changes
  useEffect(() => {
    if (track && open) {
      loadTrackLyrics();
      
      // Wait for audioRef to be available before loading audio
      const waitForAudioRef = () => {
        if (audioRef.current) {
          loadAudio();
        } else {
          setTimeout(waitForAudioRef, 50);
        }
      };
      waitForAudioRef();
    }
  }, [track, open]);

  // Spacebar control for play/pause
  useEffect(() => {
    if (!open) return;

    const handleKeyPress = (event) => {
      // Only handle spacebar if not focused on input/textarea
      if (event.code === 'Space' && 
          !['INPUT', 'TEXTAREA'].includes(event.target.tagName) &&
          !event.target.contentEditable) {
        event.preventDefault();
        togglePlayback();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [open, isPlaying, isLoadingAudio, audioError]);

  // Parse synced lyrics when lyrics change
  useEffect(() => {
    if (lyrics) {
      const parsed = parseSyncedLyrics(lyrics);
      setParsedLyrics(parsed);
      setIsSynced(parsed.length > 0 && parsed.some(line => line.time >= 0));
    }
  }, [lyrics]);

  // Update highlighted line based on current time and auto-scroll
  useEffect(() => {
    if (isPlaying && isSynced && parsedLyrics.length > 0) {
      let activeIndex = -1;
      for (let i = 0; i < parsedLyrics.length; i++) {
        if (parsedLyrics[i].time <= currentTime) {
          activeIndex = i;
        } else {
          break;
        }
      }
      
      if (activeIndex !== highlightedLine) {
        setHighlightedLine(activeIndex);
        
        // Auto-scroll to highlighted line
        if (activeIndex >= 0 && lyricsContainerRef.current) {
          const container = lyricsContainerRef.current;
          const lineElement = container.children[activeIndex];
          
          if (lineElement) {
            const containerHeight = container.clientHeight;
            const lineHeight = lineElement.offsetHeight;
            const lineOffsetTop = lineElement.offsetTop;
            const containerScrollTop = container.scrollTop;
            
            // Calculate if we need to scroll
            const lineBottom = lineOffsetTop + lineHeight;
            const containerBottom = containerScrollTop + containerHeight;
            
            // Scroll to keep the highlighted line in the middle third of the container
            const targetScrollTop = lineOffsetTop - containerHeight / 3;
            
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [currentTime, isPlaying, isSynced, parsedLyrics, highlightedLine]);

  const loadTrackLyrics = async () => {
    if (!track?.id) {
      console.warn('⚠️ Cannot load lyrics: track or track.id is missing');
      return;
    }

    setIsLoadingLyrics(true);
    try {
      const response = await getTrackLyrics(track.id);
      const lyricsText = response?.lyrics || '';
      
      setLyrics(lyricsText);
      setOriginalLyrics(lyricsText);
      setIsEditing(!lyricsText); // Auto-enable edit mode if no lyrics
      
      if (lyricsText) {
        toast.success(`Lyrics loaded from ${response?.source || 'unknown source'}`);
      }
    } catch (error) {
      console.error('Failed to load lyrics:', error);
      toast.error('Failed to load lyrics');
      setLyrics('');
      setOriginalLyrics('');
      setIsEditing(true); // Enable edit mode on error
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const loadAudio = () => {
    console.log('🎵 loadAudio called with:', { 
      hasTrack: !!track, 
      trackType: typeof track,
      hasAudioRef: !!audioRef.current,
      track: track 
    });
    
    if (!track || !audioRef.current) {
      console.log('❌ loadAudio: Missing track or audioRef', { track: !!track, audioRef: !!audioRef.current });
      setAudioError('Audio player not ready');
      return;
    }
    
    if (!track.id) {
      console.error('❌ Track has no ID property!');
      setAudioError('Invalid track data');
      return;
    }
    
    setIsLoadingAudio(true);
    setAudioError(null);
    const audioUrl = `/api/tracks/${track.id}/audio`;
    
    console.log(`🎵 Loading audio from: ${audioUrl} for track:`, track.title);
    
    // Clear previous event listeners and reset audio
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    
    // Remove old listeners (create new functions to avoid issues)
    const loadedMetadataHandler = () => {
      console.log(`✅ Audio metadata loaded, duration: ${audio.duration}s`);
      setDuration(audio.duration || 0);
      setIsLoadingAudio(false);
    };
    
    const timeupdateHandler = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const endedHandler = () => {
      setIsPlaying(false);
      console.log('🔄 Audio playback ended');
    };
    
    const errorHandler = (e) => {
      console.error('❌ Audio loading error:', e);
      const errorDetails = {
        error: audio.error?.code,
        errorMessage: audio.error?.message,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src
      };
      console.error('Audio error details:', errorDetails);
      
      setIsLoadingAudio(false);
      setAudioError(`Audio loading failed (Error ${audio.error?.code || 'unknown'})`);
      toast.error('Failed to load audio');
    };
    
    const canplayHandler = () => {
      console.log('✅ Audio can start playing');
      setIsLoadingAudio(false);
      setAudioError(null);
    };
    
    const loadstartHandler = () => {
      console.log('🔄 Audio loading started');
      setIsLoadingAudio(true);
    };
    
    const waitingHandler = () => {
      console.log('⏳ Audio buffering...');
    };
    
    // Set new source and add listeners
    audio.src = audioUrl;
    audio.addEventListener('loadedmetadata', loadedMetadataHandler);
    audio.addEventListener('timeupdate', timeupdateHandler);
    audio.addEventListener('ended', endedHandler);
    audio.addEventListener('error', errorHandler);
    audio.addEventListener('canplay', canplayHandler);
    audio.addEventListener('loadstart', loadstartHandler);
    audio.addEventListener('waiting', waitingHandler);
    
    // Force load
    audio.load();
  };

  const parseSyncedLyrics = (lyricsText) => {
    if (!lyricsText) return [];
    
    const lines = lyricsText.split('\n');
    const parsed = [];
    
    for (const line of lines) {
      const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.*)$/);
      if (match) {
        const [, minutes, seconds, centiseconds, text] = match;
        const time = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100;
        parsed.push({
          time,
          text: text.trim(),
          original: line,
        });
      } else if (line.trim()) {
        parsed.push({
          time: -1,
          text: line.trim(),
          original: line,
        });
      }
    }
    
    return parsed;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!track || !lyrics.trim()) return;
    
    saveMutation.mutate({
      trackId: track.id,
      lyrics: lyrics.trim(),
    });
  };

  const handleReset = () => {
    setLyrics(originalLyrics);
    setIsEditing(false);
  };

  const handleTimeSeek = (time) => {
    if (audioRef.current && !isNaN(time) && time >= 0 && time <= duration) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleProgressBarClick = (event) => {
    if (!audioRef.current || !progressBarRef.current || duration === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const barWidth = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / barWidth));
    const seekTime = clickRatio * duration;
    
    console.log('🎯 Progress bar clicked:', { clickX, barWidth, clickRatio, seekTime });
    handleTimeSeek(seekTime);
  };

  const handleProgressBarMouseMove = (event) => {
    if (!progressBarRef.current || duration === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = event.clientX - rect.left;
    const barWidth = rect.width;
    const hoverRatio = Math.max(0, Math.min(1, hoverX / barWidth));
    const hoverTimeSeconds = hoverRatio * duration;
    
    setHoverTime(hoverTimeSeconds);
  };

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
      toast.error('Playback failed');
      setIsPlaying(false);
    }
  };

  const hasChanges = lyrics !== originalLyrics;

  if (!track) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1,
      }}>
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Edit Lyrics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {track.artist} - {track.title}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isSynced && (
            <Chip 
              icon={<SyncIcon />} 
              label="Synced" 
              color="primary" 
              size="small" 
              variant="outlined"
            />
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '100%' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Audio Player Section */}
          <Grid item xs={12} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                  <IconButton 
                    onClick={togglePlayback}
                    disabled={isLoadingAudio || !!audioError}
                    color="primary"
                    sx={{ 
                      bgcolor: audioError ? 'error.main' : 'primary.main', 
                      color: 'white',
                      '&:hover': { bgcolor: audioError ? 'error.dark' : 'primary.dark' },
                      '&:disabled': { bgcolor: 'action.disabled' }
                    }}
                  >
                    {isLoadingAudio ? (
                      <Box sx={{ width: 24, height: 24, position: 'relative' }}>
                        <LinearProgress sx={{ 
                          position: 'absolute', 
                          top: '50%', 
                          left: 0, 
                          right: 0, 
                          transform: 'translateY(-50%)',
                          height: 2
                        }} />
                      </Box>
                    ) : (
                      isPlaying ? <PauseIcon /> : <PlayIcon />
                    )}
                  </IconButton>
                </Tooltip>
                
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  {/* Interactive Progress Bar */}
                  <Box
                    ref={progressBarRef}
                    onClick={handleProgressBarClick}
                    onMouseMove={handleProgressBarMouseMove}
                    onMouseEnter={() => setIsHoveringProgressBar(true)}
                    onMouseLeave={() => {
                      setIsHoveringProgressBar(false);
                      setHoverTime(null);
                    }}
                    sx={{
                      position: 'relative',
                      cursor: duration > 0 ? 'pointer' : 'default',
                      mb: 0.5,
                      '&:hover .MuiLinearProgress-root': {
                        transform: 'scaleY(1.5)',
                      }
                    }}
                  >
                    <LinearProgress 
                      variant="determinate" 
                      value={duration > 0 ? (currentTime / duration) * 100 : 0}
                      sx={{ 
                        height: 6,
                        borderRadius: 3,
                        transition: 'transform 0.2s ease',
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                        }
                      }}
                    />
                    
                    {/* Hover time indicator */}
                    {isHoveringProgressBar && hoverTime !== null && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -35,
                          left: `${(hoverTime / duration) * 100}%`,
                          transform: 'translateX(-50%)',
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          border: 1,
                          borderColor: 'divider',
                          boxShadow: 2,
                          zIndex: 1000,
                        }}
                      >
                        {formatTime(hoverTime)}
                      </Box>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Typography>
                    {audioError && (
                      <Typography variant="caption" color="error.main">
                        {audioError}
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={isEditing}
                      onChange={(e) => setIsEditing(e.target.checked)}
                      disabled={isLoadingLyrics}
                    />
                  }
                  label="Edit Mode"
                />
              </Box>

              {/* Audio element (hidden) */}
              <audio
                ref={audioRef}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onDurationChange={(e) => setDuration(e.target.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                style={{ display: 'none' }}
              />
            </Paper>
          </Grid>

          {/* Lyrics Section */}
          <Grid item xs={12} sx={{ height: 'calc(100% - 120px)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', p: 2 }}>
              {isLoadingLyrics ? (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <LinearProgress sx={{ width: '50%' }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading lyrics...
                  </Typography>
                </Box>
              ) : isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Enter lyrics here..."
                  variant="outlined"
                  sx={{
                    height: '100%',
                    '& .MuiOutlinedInput-root': {
                      height: '100%',
                    },
                    '& .MuiOutlinedInput-input': {
                      height: '100% !important',
                      overflow: 'auto !important',
                    }
                  }}
                />
              ) : (
                <Paper 
                  ref={lyricsContainerRef}
                  sx={{ height: '100%', overflow: 'auto', p: 2 }}
                >
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((line, index) => (
                      <Box
                        key={index}
                        onClick={() => line.time >= 0 && handleTimeSeek(line.time)}
                        sx={{
                          p: 1,
                          mb: 0.5,
                          borderRadius: 1,
                          cursor: line.time >= 0 ? 'pointer' : 'default',
                          backgroundColor: 
                            highlightedLine === index ? 'primary.main' : 'transparent',
                          color: highlightedLine === index ? 'primary.contrastText' : 'inherit',
                          '&:hover': line.time >= 0 ? {
                            backgroundColor: 'action.hover',
                          } : {},
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        <Typography variant="body1">
                          {line.time >= 0 && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                mr: 2,
                                opacity: 0.7,
                                fontFamily: 'monospace',
                              }}
                            >
                              [{formatTime(line.time)}]
                            </Typography>
                          )}
                          {line.text}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Alert severity="info">
                        No lyrics available. Click "Edit Mode" to add lyrics.
                      </Alert>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {hasChanges && (
          <Button
            startIcon={<ResetIcon />}
            onClick={handleReset}
            color="secondary"
          >
            Reset
          </Button>
        )}
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button onClick={onClose}>
          Cancel
        </Button>
        
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saveMutation.isLoading || !hasChanges}
          sx={{ minWidth: 120 }}
        >
          {saveMutation.isLoading ? 'Saving...' : 'Save Lyrics'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LyricsEditor;