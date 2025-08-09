import React, { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  MusicNote as MusicNoteIcon,
  AccessTime as AccessTimeIcon,
  Album as AlbumIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { searchLyrics, saveLyrics } from '../services/api';
import toast from 'react-hot-toast';

const LyricsSearchDialog = ({ open, onClose, track, onLyricsApplied }) => {
  const [searchQuery, setSearchQuery] = useState({
    artist: track?.artist || '',
    title: track?.title || '',
    album: track?.album || '',
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Update search query when track changes
  useEffect(() => {
    if (track) {
      setSearchQuery({
        artist: track.artist || '',
        title: track.title || '',
        album: track.album || '',
      });
    }
  }, [track]);

  // Auto-search when dialog opens with track info
  useEffect(() => {
    if (open && track && track.artist && track.title) {
      // Clear previous results and auto-search
      setSearchResults([]);
      setIsSearching(true);
      searchMutation.mutate({
        artist: track.artist,
        title: track.title,
        album: track.album,
        duration: track.duration,
      });
    }
  }, [open, track]);

  const searchMutation = useMutation(
    (params) => searchLyrics(params),
    {
      onSuccess: (data) => {
        setSearchResults(data.results || []);
        if (data.results?.length === 0) {
          toast.error('No lyrics found for this search');
        } else {
          toast.success(`Found ${data.results.length} lyrics results`);
        }
        setIsSearching(false);
      },
      onError: (error) => {
        toast.error(`Search failed: ${error.message}`);
        setIsSearching(false);
        setSearchResults([]);
      },
    }
  );

  const applyMutation = useMutation(
    ({ trackId, lyrics }) => saveLyrics(trackId, lyrics),
    {
      onSuccess: () => {
        toast.success('Lyrics applied successfully!');
        onLyricsApplied?.();
        onClose();
      },
      onError: (error) => {
        toast.error(`Failed to apply lyrics: ${error.message}`);
      },
    }
  );

  const handleSearch = () => {
    if (!searchQuery.artist || !searchQuery.title) {
      toast.error('Artist and title are required');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    searchMutation.mutate({
      artist: searchQuery.artist,
      title: searchQuery.title,
      album: searchQuery.album,
      duration: track?.duration,
    });
  };

  const handleApplyLyrics = (lyrics) => {
    if (!track) {
      toast.error('No track selected');
      return;
    }

    const lyricsText = lyrics.syncedLyrics || lyrics.plainLyrics;
    if (!lyricsText) {
      toast.error('No lyrics content available');
      return;
    }

    applyMutation.mutate({
      trackId: track.id,
      lyrics: lyricsText,
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLyricsPreview = (lyrics) => {
    const text = lyrics.syncedLyrics || lyrics.plainLyrics;
    if (!text) return 'No lyrics content';
    
    const lines = text.split('\n').slice(0, 3);
    return lines.map(line => {
      // Remove LRC timestamps for preview
      return line.replace(/^\[\d{2}:\d{2}\.\d{2}\]\s*/, '');
    }).join('\n');
  };

  const getLyricsType = (lyrics) => {
    if (lyrics.syncedLyrics) return 'Synchronized';
    if (lyrics.plainLyrics) return 'Plain Text';
    return 'Unknown';
  };

  const getLyricsTypeColor = (lyrics) => {
    if (lyrics.syncedLyrics) return 'primary';
    if (lyrics.plainLyrics) return 'secondary';
    return 'default';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          maxHeight: '80vh',
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
            Search Lyrics
          </Typography>
          {track && (
            <Typography variant="body2" color="text.secondary">
              For: {track.artist} - {track.title}
            </Typography>
          )}
        </Box>
        
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Search Form */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Artist"
                value={searchQuery.artist}
                onChange={(e) => setSearchQuery(prev => ({ ...prev, artist: e.target.value }))}
                variant="outlined"
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Title"
                value={searchQuery.title}
                onChange={(e) => setSearchQuery(prev => ({ ...prev, title: e.target.value }))}
                variant="outlined"
                InputProps={{
                  startAdornment: <MusicNoteIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Album (optional)"
                value={searchQuery.album}
                onChange={(e) => setSearchQuery(prev => ({ ...prev, album: e.target.value }))}
                variant="outlined"
                InputProps={{
                  startAdornment: <AlbumIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
          </Grid>
          
          <Button
            variant="contained"
            startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.artist || !searchQuery.title}
            sx={{ mt: 2 }}
            size="large"
          >
            {isSearching ? 'Searching...' : 'Search Lyrics'}
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Search Results */}
        <Box sx={{ height: 'calc(80vh - 280px)', overflow: 'auto' }}>
          {searchResults.length > 0 ? (
            <Grid container spacing={2}>
              {searchResults.map((lyrics, index) => (
                <Grid item xs={12} key={index}>
                  <Card 
                    sx={{ 
                      position: 'relative',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: (theme) => theme.shadows[4],
                      }
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {lyrics.artistName} - {lyrics.trackName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {lyrics.albumName || 'Unknown Album'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip 
                            label={getLyricsType(lyrics)} 
                            color={getLyricsTypeColor(lyrics)}
                            size="small"
                            variant="outlined"
                          />
                          {lyrics.duration && (
                            <Tooltip title={`Duration: ${formatDuration(lyrics.duration)}`}>
                              <Chip 
                                icon={<AccessTimeIcon />}
                                label={formatDuration(lyrics.duration)}
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>

                      {/* Lyrics Preview */}
                      <Box sx={{ 
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        p: 2,
                        mb: 2,
                        maxHeight: 120,
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-line',
                            lineHeight: 1.4,
                          }}
                        >
                          {renderLyricsPreview(lyrics)}
                        </Typography>
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 20,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.05))',
                          }}
                        />
                      </Box>
                    </CardContent>

                    <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleApplyLyrics(lyrics)}
                        disabled={applyMutation.isLoading}
                        size="small"
                        sx={{ ml: 'auto' }}
                      >
                        {applyMutation.isLoading ? 'Applying...' : 'Apply Lyrics'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : isSearching ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 4 
            }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Searching for lyrics...
              </Typography>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Enter artist and title to search for lyrics. Multiple results will be shown for you to choose from.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LyricsSearchDialog;