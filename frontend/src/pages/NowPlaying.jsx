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
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import AudioPlayer from '../components/AudioPlayer';
import SyncedLyricsViewer from '../components/SyncedLyricsViewer';
import AdvancedLyricsEditor from '../components/AdvancedLyricsEditor';
import LyricsPublisher from '../components/LyricsPublisher';
import { getLyrics, saveLyrics, searchLyrics } from '../services/api';
import toast from 'react-hot-toast';

const NowPlaying = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const storeCurrentTrack = useAppStore(state => state.currentTrack);
  const queryClient = useQueryClient();

  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [showPublisher, setShowPublisher] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [autoSeek, setAutoSeek] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(null);

  // Memoize track ID to prevent unnecessary re-renders
  const storeTrackId = useMemo(() => storeCurrentTrack?.id, [storeCurrentTrack?.id]);

  // Load current track from store with autoplay
  useEffect(() => {
    if (storeCurrentTrack && (!currentTrack || storeCurrentTrack.id !== currentTrack.id)) {
      setCurrentTrack(storeCurrentTrack);
      // Auto-start playback when a new track is loaded
      setTimeout(() => {
        setIsPlaying(true);
      }, 500); // Small delay to ensure audio is loaded
    }
  }, [storeTrackId]);

  // Fetch lyrics for current track
  const { data: lyricsData, isLoading: lyricsLoading, error: lyricsError } = useQuery(
    ['lyrics', currentTrack?.id],
    () => getLyrics(currentTrack.id),
    {
      enabled: !!currentTrack?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const saveLyricsMutation = useMutation(
    ({ trackId, lyrics }) => saveLyrics(trackId, lyrics),
    {
      onSuccess: () => {
        toast.success('Lyrics saved successfully!');
        queryClient.invalidateQueries(['lyrics', currentTrack?.id]);
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
    if (currentTrack?.id) {
      saveLyricsMutation.mutate({
        trackId: currentTrack.id,
        lyrics: lyricsData.lyrics
      });
    }
  }, [currentTrack?.id, saveLyricsMutation]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!currentTrack) {
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
      {/* Header */}
      {!isFullscreen && (
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

      <Grid container spacing={3} sx={{ height: isFullscreen ? '100%' : 'auto' }}>
        {/* Audio Player */}
        <Grid item xs={12} md={isFullscreen ? 12 : 12}>
          <Box sx={{ position: 'relative' }}>
            <AudioPlayer
              track={currentTrack}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              seeking={seeking}
              seekTime={seekTime}
              autoplay={isPlaying}
            />
            
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

        {/* Lyrics Section */}
        <Grid item xs={12} md={isFullscreen ? 12 : 12}>
          <Paper elevation={2} sx={{ height: isFullscreen ? 'calc(100vh - 200px)' : '60vh', display: 'flex', flexDirection: 'column' }}>
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
                    track={currentTrack}
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
        {!isMobile && !isFullscreen && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Track Information
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Title:</strong> {currentTrack.title || 'Unknown'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Artist:</strong> {currentTrack.artist || 'Unknown'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Album:</strong> {currentTrack.album || 'Unknown'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Duration:</strong> {currentTrack.duration ? `${Math.floor(currentTrack.duration / 60)}:${String(Math.floor(currentTrack.duration % 60)).padStart(2, '0')}` : 'Unknown'}
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

      {/* Dialogs */}
      <LyricsPublisher
        open={showPublisher}
        onClose={() => setShowPublisher(false)}
        track={currentTrack}
        lyrics={!isSyncedLyrics ? lyrics : null}
        syncedLyrics={isSyncedLyrics ? lyrics : null}
      />
    </Box>
  );
};

export default NowPlaying;