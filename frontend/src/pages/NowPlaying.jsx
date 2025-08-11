import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Tooltip,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit as EditIcon,
  Publish as PublishIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  MusicNote as MusicNoteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Shuffle as ShuffleIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
  VolumeUp as VolumeIcon,
  Menu as MenuIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import { useAlbumColors } from '../contexts/AlbumColorContext';
import SyncedLyricsViewer from '../components/SyncedLyricsViewer';
import AdvancedLyricsEditor from '../components/AdvancedLyricsEditor';
import LyricsPublisher from '../components/LyricsPublisher';
import { getLyrics, saveLyrics } from '../services/api';
import { createArtworkUrl, refreshImageOnMobile } from '../utils/imageLoader';
import toast from 'react-hot-toast';

const NowPlaying = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { colors, gradient } = useAlbumColors();
  const { 
    currentTrack: storeCurrentTrack,
    isPlaying,
    currentTime,
    setCurrentTime,
    nextTrack,
    previousTrack,
    queue,
    currentQueueIndex,
    shuffle,
    repeat,
    setShuffle,
    setRepeat,
    togglePlayback,
    volume,
    setVolume,
    setSidebarOpen,
    seekToTime,
    duration
  } = useAppStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [showPublisher, setShowPublisher] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [autoSeek, setAutoSeek] = useState(true);
  const [showMobileLyrics, setShowMobileLyrics] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());

  // Fetch lyrics for current track
  const { data: lyricsData } = useQuery(
    ['lyrics', storeCurrentTrack?.id],
    () => getLyrics(storeCurrentTrack.id),
    {
      enabled: !!storeCurrentTrack?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const saveLyricsMutation = useMutation(
    ({ trackId, lyrics }) => saveLyrics(trackId, lyrics),
    {
      onSuccess: () => {
        toast.success('Lyrics saved successfully!');
        queryClient.invalidateQueries(['lyrics', storeCurrentTrack?.id]);
        queryClient.invalidateQueries('tracks');
        setShowEditor(false);
      },
      onError: (error) => {
        toast.error(`Failed to save lyrics: ${error.message}`);
      },
    }
  );


  const handleSeek = useCallback((time) => {
    seekToTime(time);
  }, [seekToTime]);

  const handleLyricsSeek = useCallback((time) => {
    if (autoSeek) {
      handleSeek(time);
    }
  }, [autoSeek, handleSeek]);

  const handleSaveLyrics = useCallback((lyricsData) => {
    if (storeCurrentTrack?.id) {
      saveLyricsMutation.mutate({
        trackId: storeCurrentTrack.id,
        lyrics: lyricsData.lyrics
      });
    }
  }, [storeCurrentTrack?.id, saveLyricsMutation]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const refreshImage = useCallback(() => {
    setImageVersion(Date.now());
  }, []);

  // Refresh images when track changes
  useEffect(() => {
    if (storeCurrentTrack?.artwork_path) {
      setImageVersion(Date.now());
    }
  }, [storeCurrentTrack?.id]);

  if (!storeCurrentTrack) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '60vh',
          height: 'calc(100vh - 200px)',
          textAlign: 'center',
          p: 3,
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }}
      >
        <MusicNoteIcon sx={{ fontSize: 80, mb: 2, color: 'var(--text-secondary)' }} />
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{ color: 'var(--text-primary)', mb: 2 }}
        >
          No Track Selected
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ mb: 3, color: 'var(--text-secondary)' }}
        >
          Select a track from your library to start playing
        </Typography>
        <Button 
          variant="contained" 
          href="/library"
          sx={{ 
            backgroundColor: 'var(--accent-primary)',
            '&:hover': { backgroundColor: 'var(--accent-hover)' }
          }}
        >
          Go to Library
        </Button>
      </Box>
    );
  }

  const lyrics = lyricsData?.lyrics;
  const hasLyrics = !!lyrics;
  const isSyncedLyrics = lyrics && lyrics.includes('[') && lyrics.match(/\[\d{2}:\d{2}\.\d{2,3}\]/);


  return (
    <Box sx={{ 
      height: isFullscreen ? '100vh' : 'auto',
      overflow: isFullscreen ? 'hidden' : 'visible',
      position: isFullscreen ? 'fixed' : 'relative',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: isFullscreen ? 9999 : 'auto',
      backgroundColor: isFullscreen ? 'var(--bg-primary)' : 'transparent',
      color: 'var(--text-primary)',
      minHeight: '60vh'
    }}>

      {isMobile ? (
        /* Mobile Music Player Layout */
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          height: showMobileLyrics ? 'auto' : '100vh',
          position: 'relative',
          boxSizing: 'border-box',
          overflow: showMobileLyrics ? 'visible' : 'hidden'
        }}>
          {/* Mobile Header with Navigation */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            p: 2,
            pt: 3,
            zIndex: 1000
          }}>
            <IconButton
              onClick={() => setSidebarOpen(true)}
              sx={{ 
                color: 'text.primary',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.2)' }
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Now Playing
            </Typography>
            <IconButton
              onClick={refreshImage}
              sx={{ 
                color: 'text.primary',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.2)' }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>

          {/* Player Content */}
          <Box sx={{ 
            flex: showMobileLyrics ? 'none' : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: showMobileLyrics ? 'flex-start' : 'center',
            p: 2,
            pt: 0
          }}>
          {/* Large Album Artwork */}
          <Box
            sx={{
              width: '85vw',
              height: '85vw',
              maxWidth: 350,
              maxHeight: 350,
              borderRadius: 3,
              overflow: 'hidden',
              mb: 3,
              backgroundColor: theme.palette.grey[200],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 12px 40px ${colors.primary}30, 0 8px 32px rgba(0, 0, 0, 0.15)`,
            }}
          >
            {storeCurrentTrack?.artwork_path ? (
              <img
                src={createArtworkUrl(storeCurrentTrack.artwork_path)}
                alt={`${storeCurrentTrack.album} artwork`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  // Prevent infinite retries - only retry once
                  if (!e.target.hasAttribute('data-retry-attempted')) {
                    e.target.setAttribute('data-retry-attempted', 'true');
                    console.warn('Artwork failed to load, retrying once...');
                    setTimeout(() => {
                      e.target.src = createArtworkUrl(storeCurrentTrack.artwork_path);
                      refreshImageOnMobile(e.target);
                    }, 2000);
                  } else {
                    console.warn('Artwork failed to load after retry, showing fallback');
                    e.target.style.display = 'none';
                  }
                }}
              />
            ) : (
              <MusicNoteIcon sx={{ fontSize: 120, color: theme.palette.grey[400] }} />
            )}
          </Box>

          {/* Track Info */}
          <Box sx={{ textAlign: 'center', mb: 3, width: '100%', px: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }} noWrap>
              {storeCurrentTrack?.title || storeCurrentTrack?.filename}
            </Typography>
            <Typography variant="h6" color="text.secondary" noWrap>
              {storeCurrentTrack?.artist || 'Unknown Artist'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {storeCurrentTrack?.album || 'Unknown Album'}
            </Typography>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ width: '100%', mb: 3, px: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
              </Typography>
              <Typography variant="caption">
                {Math.floor((duration || 0) / 60)}:{String(Math.floor((duration || 0) % 60)).padStart(2, '0')}
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                height: 4,
                backgroundColor: theme.palette.grey[300],
                borderRadius: 2,
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const newTime = percent * (duration || 0);
                handleSeek(newTime);
              }}
            >
              <Box
                sx={{
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  height: '100%',
                  backgroundColor: colors.primary,
                  borderRadius: 2,
                  boxShadow: `0 0 8px ${colors.primary}40`,
                }}
              />
            </Box>
          </Box>

          {/* Main Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mb: 3 }}>
            <IconButton
              onClick={previousTrack}
              disabled={queue.length <= 1 || currentQueueIndex <= 0}
              sx={{ 
                fontSize: 40,
                color: 'text.primary',
                '&.Mui-disabled': { color: 'text.disabled' }
              }}
            >
              <SkipPreviousIcon sx={{ fontSize: 40 }} />
            </IconButton>

            <IconButton
              onClick={() => togglePlayback()}
              sx={{
                backgroundColor: colors.primary,
                color: 'white',
                width: 72,
                height: 72,
                '&:hover': {
                  backgroundColor: colors.secondary,
                  transform: 'scale(1.05)',
                },
                boxShadow: `0 6px 20px ${colors.primary}40, 0 4px 16px rgba(0, 0, 0, 0.2)`,
                transition: 'all 0.3s ease',
              }}
            >
              {isPlaying ? (
                <PauseIcon sx={{ fontSize: 36 }} />
              ) : (
                <PlayIcon sx={{ fontSize: 36 }} />
              )}
            </IconButton>

            <IconButton
              onClick={nextTrack}
              disabled={queue.length <= 1 || currentQueueIndex >= queue.length - 1}
              sx={{ 
                fontSize: 40,
                color: 'text.primary',
                '&.Mui-disabled': { color: 'text.disabled' }
              }}
            >
              <SkipNextIcon sx={{ fontSize: 40 }} />
            </IconButton>
          </Box>

          {/* Secondary Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', px: 2, mb: 2 }}>
            <IconButton
              onClick={() => setShuffle(!shuffle)}
              sx={{ 
                color: shuffle ? colors.primary : 'text.secondary',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              <ShuffleIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
              <VolumeIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Box
                sx={{
                  flex: 1,
                  height: 4,
                  backgroundColor: theme.palette.grey[300],
                  borderRadius: 2,
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  setVolume(percent);
                }}
              >
                <Box
                  sx={{
                    width: `${volume * 100}%`,
                    height: '100%',
                    backgroundColor: colors.secondary,
                    borderRadius: 2,
                  }}
                />
              </Box>
            </Box>

            <IconButton
              onClick={() => {
                const nextRepeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
                setRepeat(nextRepeat);
              }}
              sx={{ 
                color: repeat !== 'off' ? colors.primary : 'text.secondary',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              {repeat === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
            </IconButton>
          </Box>

          {/* Lyrics Toggle Button */}
          <Button
            variant="outlined"
            onClick={() => setShowMobileLyrics(!showMobileLyrics)}
            sx={{ borderRadius: 2, mb: 2 }}
          >
            {showMobileLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
          </Button>

          {/* Mobile Lyrics */}
          {showMobileLyrics && (
            <Paper elevation={2} sx={{ 
              width: '100%', 
              height: '50vh', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Lyrics</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showTimestamps}
                        onChange={(e) => setShowTimestamps(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Timestamps"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </Box>
              <Box sx={{ flex: 1, p: 2 }}>
                <SyncedLyricsViewer
                  lyricsContent={lyrics}
                  currentTime={currentTime}
                  onSeek={handleLyricsSeek}
                  isPlaying={isPlaying}
                  showTimestamps={showTimestamps}
                  accentColor={colors.primary}
                />
              </Box>
            </Paper>
          )}
          </Box>
        </Box>
      ) : (
        /* Desktop Layout - Left/Right Split */
        <Box sx={{ 
          display: 'flex',
          gap: 3,
          height: isFullscreen ? '100vh' : 'calc(100vh - 120px)',
          width: '100%'
        }}>
          {/* Left Side - Audio Player & Controls */}
          <Box sx={{ 
            flex: '0 0 420px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {/* Desktop Audio Player UI */}
            <Paper elevation={3} sx={{ 
              flex: 1,
              background: theme.palette.mode === 'dark' 
                ? 'rgba(30, 30, 30, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ 
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                justifyContent: 'center'
              }}>
                {/* Large Album Artwork */}
                <Box
                  sx={{
                    width: 280,
                    height: 280,
                    borderRadius: 3,
                    overflow: 'hidden',
                    mb: 3,
                    background: theme.palette.grey[200],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 16px 48px ${colors.primary}40, 0 8px 32px rgba(0, 0, 0, 0.2)`,
                    position: 'relative'
                  }}
                >
                  {storeCurrentTrack?.artwork_path ? (
                    <img
                      src={createArtworkUrl(storeCurrentTrack.artwork_path)}
                      alt={`${storeCurrentTrack.album} artwork`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        refreshImageOnMobile(e.target);
                      }}
                    />
                  ) : (
                    <MusicNoteIcon sx={{ fontSize: 120, color: theme.palette.grey[500] }} />
                  )}
                </Box>

                {/* Track Info - Horizontal Layout */}
                <Box sx={{ textAlign: 'center', mb: 4, width: '100%' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }} noWrap>
                    {storeCurrentTrack?.title || storeCurrentTrack?.filename}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    sx={{ mb: 0.5 }}
                    noWrap
                  >
                    {storeCurrentTrack?.artist || 'Unknown Artist'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {storeCurrentTrack?.album || 'Unknown Album'}
                  </Typography>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ width: '100%', mb: 3 }}>
                  <Box
                    sx={{
                      width: '100%',
                      height: 6,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255,255,255,0.1)' 
                        : 'rgba(0,0,0,0.1)',
                      borderRadius: 3,
                      cursor: 'pointer',
                      position: 'relative',
                      '&:hover': {
                        '& .progress-thumb': {
                          opacity: 1,
                          transform: 'scale(1)',
                        }
                      }
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      const newTime = percent * (duration || 0);
                      handleSeek(newTime);
                    }}
                  >
                    <Box
                      sx={{
                        width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: colors.primary,
                        borderRadius: 3,
                        position: 'relative',
                        boxShadow: `0 0 12px ${colors.primary}50`,
                      }}
                    >
                      <Box
                        className="progress-thumb"
                        sx={{
                          position: 'absolute',
                          right: -6,
                          top: -3,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: `0 2px 8px ${colors.primary}60`,
                          opacity: 0,
                          transform: 'scale(0.8)',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.floor((duration || 0) / 60)}:{String(Math.floor((duration || 0) % 60)).padStart(2, '0')}
                    </Typography>
                  </Box>
                </Box>

                {/* Main Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
                  <IconButton
                    onClick={previousTrack}
                    disabled={queue.length <= 1 || currentQueueIndex <= 0}
                    sx={{
                      fontSize: 32,
                      color: 'text.primary',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'scale(1.1)',
                      },
                      '&.Mui-disabled': { color: 'text.disabled' },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <SkipPreviousIcon sx={{ fontSize: 32 }} />
                  </IconButton>

                  <IconButton
                    onClick={() => togglePlayback()}
                    sx={{
                      backgroundColor: colors.primary,
                      color: 'white',
                      width: 64,
                      height: 64,
                      '&:hover': {
                        backgroundColor: colors.secondary,
                        transform: 'scale(1.05)',
                      },
                      boxShadow: `0 8px 24px ${colors.primary}40, 0 4px 16px rgba(0, 0, 0, 0.2)`,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isPlaying ? (
                      <PauseIcon sx={{ fontSize: 28 }} />
                    ) : (
                      <PlayIcon sx={{ fontSize: 28 }} />
                    )}
                  </IconButton>

                  <IconButton
                    onClick={nextTrack}
                    disabled={queue.length <= 1 || currentQueueIndex >= queue.length - 1}
                    sx={{
                      fontSize: 32,
                      color: 'text.primary',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'scale(1.1)',
                      },
                      '&.Mui-disabled': { color: 'text.disabled' },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <SkipNextIcon sx={{ fontSize: 32 }} />
                  </IconButton>
                </Box>

                {/* Secondary Controls */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  width: '100%',
                  px: 2
                }}>
                  <IconButton
                    onClick={() => setShuffle(!shuffle)}
                    sx={{ 
                      color: shuffle ? colors.primary : 'text.secondary',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <ShuffleIcon fontSize="small" />
                  </IconButton>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mx: 3 }}>
                    <VolumeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Box
                      sx={{
                        flex: 1,
                        height: 4,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.1)' 
                          : 'rgba(0,0,0,0.1)',
                        borderRadius: 2,
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        setVolume(percent);
                      }}
                    >
                      <Box
                        sx={{
                          width: `${volume * 100}%`,
                          height: '100%',
                          backgroundColor: colors.secondary,
                          borderRadius: 2,
                        }}
                      />
                    </Box>
                  </Box>

                  <IconButton
                    onClick={() => {
                      const nextRepeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
                      setRepeat(nextRepeat);
                    }}
                    sx={{ 
                      color: repeat !== 'off' ? colors.primary : 'text.secondary',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    {repeat === 'one' ? <RepeatOneIcon fontSize="small" /> : <RepeatIcon fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>
            </Paper>
            
            {/* Fullscreen toggle */}
            <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              <Fab
                size="small"
                onClick={toggleFullscreen}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 1,
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </Fab>
            </Tooltip>
          </Box>

          {/* Right Side - Lyrics Section */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Paper elevation={3} sx={{ 
              flex: 1,
              display: 'flex', 
              flexDirection: 'column',
              background: theme.palette.mode === 'dark' 
                ? 'rgba(30, 30, 30, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
              borderRadius: 3,
              overflow: 'hidden'
            }}>
              {/* Lyrics Controls */}
              <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Lyrics View" />
                    {hasLyrics && <Tab label="Edit Lyrics" />}
                  </Tabs>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Settings */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showTimestamps}
                          onChange={(e) => setShowTimestamps(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Show timestamps"
                      sx={{ mr: 1 }}
                    />
                    
                    {/* Action buttons */}
                    {hasLyrics && (
                      <Tooltip title="Publish to LRCLIB">
                        <IconButton onClick={() => setShowPublisher(true)}>
                          <PublishIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    {!hasLyrics && (
                      <Tooltip title="Download lyrics">
                        <IconButton>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Lyrics Content */}
              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {activeTab === 0 && (
                  <Box sx={{ height: '100%', p: 3 }}>
                    <SyncedLyricsViewer
                      lyricsContent={lyrics}
                      currentTime={currentTime}
                      onSeek={handleLyricsSeek}
                      isPlaying={isPlaying}
                      showTimestamps={showTimestamps}
                      accentColor={colors.primary}
                    />
                  </Box>
                )}

                {activeTab === 1 && hasLyrics && (
                  <Box sx={{ height: '100%' }}>
                    <AdvancedLyricsEditor
                      track={storeCurrentTrack}
                      lyrics={lyrics}
                      onSave={handleSaveLyrics}
                      onCancel={() => setActiveTab(0)}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      onSeek={handleSeek}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Dialogs */}
      <LyricsPublisher
        open={showPublisher}
        onClose={() => setShowPublisher(false)}
        track={storeCurrentTrack}
        lyrics={!isSyncedLyrics ? lyrics : null}
        syncedLyrics={isSyncedLyrics ? lyrics : null}
      />
    </Box>
  );
};

export default NowPlaying;