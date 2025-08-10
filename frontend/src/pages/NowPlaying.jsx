import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  VolumeOff as MuteIcon,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import SyncedLyricsViewer from '../components/SyncedLyricsViewer';
import AdvancedLyricsEditor from '../components/AdvancedLyricsEditor';
import LyricsPublisher from '../components/LyricsPublisher';
import { getLyrics, saveLyrics, searchLyrics } from '../services/api';
import toast from 'react-hot-toast';

const NowPlaying = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { 
    currentTrack: storeCurrentTrack,
    isPlaying,
    currentTime,
    setIsPlaying,
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
    setSidebarOpen
  } = useAppStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [showPublisher, setShowPublisher] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [autoSeek, setAutoSeek] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(null);
  const [showMobileLyrics, setShowMobileLyrics] = useState(false);

  // Fetch lyrics for current track
  const { data: lyricsData, isLoading: lyricsLoading, error: lyricsError } = useQuery(
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

  const handleTimeUpdate = useCallback((time) => {
    if (!seeking) {
      setCurrentTime(time);
    }
  }, [seeking]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((time) => {
    setSeeking(true);
    setSeekTime(time);
    setCurrentTime(time);
    
    // Clear seeking state after a short delay
    setTimeout(() => {
      setSeeking(false);
      setSeekTime(null);
    }, 100);
  }, []);

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

  if (!storeCurrentTrack) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '70vh',
          textAlign: 'center'
        }}
      >
        <MusicNoteIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" color="text.secondary" gutterBottom>
          No Track Selected
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Select a track from your library to start playing
        </Typography>
        <Button variant="contained" href="/library">
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
      backgroundColor: isFullscreen ? theme.palette.background.default : 'transparent'
    }}>
      {/* Header - only show on desktop */}
      {!isFullscreen && !isMobile && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Now Playing
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Synchronized lyrics player with editing capabilities
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

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
            <Box sx={{ width: 40 }} /> {/* Spacer for centering */}
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
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            }}
          >
            {storeCurrentTrack?.artwork_path ? (
              <img
                src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cache/artwork/${storeCurrentTrack.artwork_path.split('/').pop()}?v=${Date.now()}`}
                alt={`${storeCurrentTrack.album} artwork`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
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
                {Math.floor((storeCurrentTrack?.duration || 0) / 60)}:{String(Math.floor((storeCurrentTrack?.duration || 0) % 60)).padStart(2, '0')}
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
                const newTime = percent * (storeCurrentTrack?.duration || 0);
                handleSeek(newTime);
              }}
            >
              <Box
                sx={{
                  width: `${storeCurrentTrack?.duration ? (currentTime / storeCurrentTrack.duration) * 100 : 0}%`,
                  height: '100%',
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: 2,
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
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                width: 72,
                height: 72,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
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
                color: shuffle ? theme.palette.primary.main : 'text.secondary',
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
                    backgroundColor: theme.palette.primary.main,
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
                color: repeat !== 'off' ? theme.palette.primary.main : 'text.secondary',
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
                <Typography variant="h6">Lyrics</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 2 }}>
                <SyncedLyricsViewer
                  lyricsContent={lyrics}
                  currentTime={currentTime}
                  onSeek={handleLyricsSeek}
                  isPlaying={isPlaying}
                  showTimestamps={false}
                />
              </Box>
            </Paper>
          )}
          </Box>
        </Box>
      ) : (
        /* Desktop Layout - Left/Right Split */
        <Grid container spacing={3} sx={{ height: isFullscreen ? '100%' : 'auto' }}>
          {/* Left Side - Audio Player & Controls */}
          <Grid item xs={12} md={isFullscreen ? 12 : 5}>
            <Box sx={{ 
              position: 'relative',
              height: { md: isFullscreen ? 'auto' : '70vh' },
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Desktop Audio Player UI */}
              <Card elevation={2}>
                <CardContent>
                  {/* Track Info with Artwork */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
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
                      {storeCurrentTrack?.artwork_path ? (
                        <img
                          src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cache/artwork/${storeCurrentTrack.artwork_path.split('/').pop()}?v=${Date.now()}`}
                          alt={`${storeCurrentTrack.album} artwork`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <MusicNoteIcon sx={{ fontSize: 32, color: theme.palette.grey[500] }} />
                      )}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                        {storeCurrentTrack?.title || storeCurrentTrack?.filename}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {storeCurrentTrack?.artist}
                      </Typography>
                      {storeCurrentTrack?.album && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {storeCurrentTrack.album}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ mb: 2 }}>
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
                        const newTime = percent * (storeCurrentTrack?.duration || 0);
                        handleSeek(newTime);
                      }}
                    >
                      <Box
                        sx={{
                          width: `${storeCurrentTrack?.duration ? (currentTime / storeCurrentTrack.duration) * 100 : 0}%`,
                          height: '100%',
                          backgroundColor: theme.palette.primary.main,
                          borderRadius: 2,
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption">
                        {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                      </Typography>
                      <Typography variant="caption">
                        {Math.floor((storeCurrentTrack?.duration || 0) / 60)}:{String(Math.floor((storeCurrentTrack?.duration || 0) % 60)).padStart(2, '0')}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <IconButton
                      onClick={previousTrack}
                      disabled={queue.length <= 1 || currentQueueIndex <= 0}
                    >
                      <SkipPreviousIcon />
                    </IconButton>
                    
                    <IconButton
                      onClick={() => togglePlayback()}
                      sx={{
                        backgroundColor: theme.palette.primary.main,
                        color: 'white',
                        width: 56,
                        height: 56,
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark,
                        },
                      }}
                    >
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </IconButton>
                    
                    <IconButton
                      onClick={nextTrack}
                      disabled={queue.length <= 1 || currentQueueIndex >= queue.length - 1}
                    >
                      <SkipNextIcon />
                    </IconButton>
                  </Box>

                  {/* Secondary Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                    <IconButton
                      onClick={() => setShuffle(!shuffle)}
                      sx={{ color: shuffle ? theme.palette.primary.main : 'text.secondary' }}
                    >
                      <ShuffleIcon fontSize="small" />
                    </IconButton>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mx: 2 }}>
                      <VolumeIcon sx={{ fontSize: 18 }} />
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
                            backgroundColor: theme.palette.primary.main,
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
                      sx={{ color: repeat !== 'off' ? theme.palette.primary.main : 'text.secondary' }}
                    >
                      {repeat === 'one' ? <RepeatOneIcon fontSize="small" /> : <RepeatIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
              
              {/* Fullscreen toggle */}
              <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                <Fab
                  size="small"
                  onClick={toggleFullscreen}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                  }}
                >
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </Fab>
              </Tooltip>
            </Box>
          </Grid>

          {/* Right Side - Lyrics Section */}
          <Grid item xs={12} md={isFullscreen ? 12 : 7}>
            <Paper elevation={2} sx={{ 
              height: { 
                md: isFullscreen ? 'calc(100vh - 200px)' : '70vh' 
              }, 
              display: 'flex', 
              flexDirection: 'column' 
            }}>
              {/* Lyrics Controls */}
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
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
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoSeek}
                          onChange={(e) => setAutoSeek(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Auto seek"
                    />

                    {/* Action buttons */}
                    {hasLyrics && (
                      <>
                        <Tooltip title="Edit lyrics">
                          <IconButton onClick={() => setShowEditor(true)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Publish to LRCLIB">
                          <IconButton onClick={() => setShowPublisher(true)}>
                            <PublishIcon />
                          </IconButton>
                        </Tooltip>
                      </>
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
                  <Box sx={{ height: '100%', p: 2 }}>
                    <SyncedLyricsViewer
                      lyricsContent={lyrics}
                      currentTime={currentTime}
                      onSeek={handleLyricsSeek}
                      isPlaying={isPlaying}
                      showTimestamps={showTimestamps}
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
          </Grid>

          {/* Track Info Sidebar (only in desktop mode) */}
          {!isFullscreen && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Track Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Title:</strong> {storeCurrentTrack?.title || 'Unknown'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Artist:</strong> {storeCurrentTrack?.artist || 'Unknown'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Album:</strong> {storeCurrentTrack?.album || 'Unknown'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Duration:</strong> {storeCurrentTrack?.duration ? `${Math.floor(storeCurrentTrack.duration / 60)}:${String(Math.floor(storeCurrentTrack.duration % 60)).padStart(2, '0')}` : 'Unknown'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Has Lyrics:</strong> {hasLyrics ? (isSyncedLyrics ? 'Synchronized' : 'Plain text') : 'No'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
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