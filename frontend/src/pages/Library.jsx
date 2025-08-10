import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Checkbox,
  Toolbar,
  Button,
  CircularProgress,
  Alert,
  Fade,
  Card,
  CardContent,
  CardActions,
  useMediaQuery,
  useTheme,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  MusicNote as MusicNoteIcon,
  LibraryMusic as LibraryMusicIcon,
  FindInPage as FindInPageIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { getTracks, bulkDownloadLyrics, getSettings } from '../services/api';
import { useAppStore } from '../store/appStore';
import LyricsEditor from '../components/LyricsEditor';
import LyricsSearchDialog from '../components/LyricsSearchDialog';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Helper function to format duration
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function Library() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [lyricsEditorOpen, setLyricsEditorOpen] = useState(false);
  const [lyricsSearchOpen, setLyricsSearchOpen] = useState(false);
  const [trackForSearch, setTrackForSearch] = useState(null);
  
  const { selectedTracks, toggleTrackSelection, clearSelectedTracks, setSelectedTracks, setCurrentTrack, setQueue } = useAppStore();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const { data: tracksData = { tracks: [], pagination: { total: 0 } }, isLoading, error } = useQuery(
    ['tracks', { search: searchTerm, page, limit: rowsPerPage }],
    () => getTracks({ search: searchTerm, page: page + 1, limit: rowsPerPage }),
    { keepPreviousData: true }
  );

  const tracks = tracksData.tracks || [];
  const totalTracks = tracksData.pagination?.total || 0;

  const { data: settings } = useQuery('settings', getSettings);

  const bulkLyricsMutation = useMutation(
    ({ trackIds, embedLyrics }) => bulkDownloadLyrics(trackIds, embedLyrics),
    {
      onSuccess: (data) => {
        const { results } = data;
        toast.success(`Lyrics download completed! ${results.successful} successful, ${results.failed} failed`);
        queryClient.invalidateQueries('tracks');
        clearSelectedTracks();
      },
      onError: (error) => {
        toast.error(`Failed to download lyrics: ${error.message}`);
      },
    }
  );

  // Use server-side pagination - no client-side filtering needed
  const filteredTracks = tracks;

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelectedTracks(filteredTracks.map(track => track.id));
    } else {
      clearSelectedTracks();
    }
  };

  const isSelected = (trackId) => selectedTracks.includes(trackId);
  const numSelected = selectedTracks.length;

  const handleEditLyrics = (track) => {
    setSelectedTrack(track);
    setLyricsEditorOpen(true);
  };

  const handleCloseLyricsEditor = () => {
    setLyricsEditorOpen(false);
    setSelectedTrack(null);
  };

  const handleSearchLyrics = (track) => {
    setTrackForSearch(track);
    setLyricsSearchOpen(true);
  };

  const handleCloseLyricsSearch = () => {
    setLyricsSearchOpen(false);
    setTrackForSearch(null);
  };

  const handleLyricsApplied = () => {
    queryClient.invalidateQueries('tracks');
  };

  const handlePlayTrack = (track) => {
    // Set the current playing track and create a queue from all tracks
    setCurrentTrack(track);
    
    // Create queue from current page of tracks, with clicked track at current position
    if (tracksData?.tracks) {
      const trackIndex = tracksData.tracks.findIndex(t => t.id === track.id);
      setQueue(tracksData.tracks);
      // Update currentQueueIndex in store via playTrackFromQueue
      useAppStore.getState().playTrackFromQueue(trackIndex);
    }
    
    navigate('/now-playing');
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load library: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 0, sm: 1, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <LibraryMusicIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Music Library
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 2 }}>
        {/* Toolbar */}
        <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
          {numSelected > 0 ? (
            <>
              <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
                {numSelected} selected
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                disabled={bulkLyricsMutation.isLoading}
                onClick={() => {
                  const embedByDefault = settings?.settings?.['lyrics.embed_by_default']?.value || false;
                  bulkLyricsMutation.mutate({ 
                    trackIds: selectedTracks, 
                    embedLyrics: embedByDefault
                  });
                }}
              >
                {bulkLyricsMutation.isLoading ? 'Downloading...' : 'Download Lyrics'}
              </Button>
            </>
          ) : (
            <>
              <TextField
                placeholder="Search tracks..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ 
                  minWidth: { xs: 200, sm: 300 },
                  mr: { xs: 1, sm: 2 },
                  width: { xs: '100%', sm: 'auto' }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {filteredTracks.length} tracks
              </Typography>
            </>
          )}
        </Toolbar>

        {/* Responsive Content */}
        {isMobile ? (
          /* Mobile Card Layout */
          <Box sx={{ p: 1 }}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : filteredTracks.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                <MusicNoteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No tracks found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm ? 'Try adjusting your search' : 'Start by scanning your music directory'}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredTracks.map((track) => (
                  <Grid item xs={12} key={track.id}>
                    <Card 
                      sx={{ 
                        position: 'relative',
                        backgroundColor: selectedTracks.includes(track.id) ? 'action.selected' : 'background.paper',
                      }}
                    >
                      <CardContent sx={{ pb: 1 }}>
                        <Box display="flex" alignItems="flex-start" gap={2}>
                          <Checkbox
                            checked={selectedTracks.includes(track.id)}
                            onChange={() => toggleTrackSelection(track.id)}
                            size="small"
                          />
                          
                          {/* Album artwork for mobile */}
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 1.5,
                              overflow: 'hidden',
                              flexShrink: 0,
                              backgroundColor: 'grey.200',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {track.artwork_path ? (
                              <img
                                src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cache/artwork/${track.artwork_path.split('/').pop()}`}
                                alt={`${track.album} artwork`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <MusicNoteIcon sx={{ fontSize: 24, color: 'grey.500' }} />
                            )}
                          </Box>

                          <Box flex={1} minWidth={0}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                              {track.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {track.artist}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {track.album} • {formatDuration(track.duration)}
                            </Typography>
                            <Box mt={1}>
                              <Chip
                                size="small"
                                label={track.has_lyrics ? `Lyrics (${track.lyrics_source})` : 'No lyrics'}
                                color={track.has_lyrics ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                        <Tooltip title="Play track">
                          <IconButton
                            size="small"
                            onClick={() => handlePlayTrack(track)}
                            color="primary"
                          >
                            <PlayIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={() => handleEditLyrics(track)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleSearchLyrics(track)}
                          color="secondary"
                        >
                          <FindInPageIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : (
          /* Desktop Table Layout */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={numSelected > 0 && numSelected < filteredTracks.length}
                      checked={filteredTracks.length > 0 && numSelected === filteredTracks.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Artist</TableCell>
                  <TableCell>Album</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Lyrics</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredTracks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <MusicNoteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        No tracks found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm ? 'Try adjusting your search' : 'Start by scanning your music directory'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTracks.map((track) => {
                  const isItemSelected = isSelected(track.id);
                  return (
                    <TableRow key={track.id} hover selected={isItemSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onChange={() => toggleTrackSelection(track.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {track.title || track.filename}
                        </Typography>
                      </TableCell>
                      <TableCell>{track.artist || 'Unknown'}</TableCell>
                      <TableCell>{track.album || 'Unknown'}</TableCell>
                      <TableCell>
                        {track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={track.has_lyrics ? 'Yes' : 'No'}
                          color={track.has_lyrics ? 'success' : 'error'}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Play track">
                          <IconButton
                            size="small"
                            onClick={() => handlePlayTrack(track)}
                            color="primary"
                          >
                            <PlayIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={() => handleEditLyrics(track)}
                          color="primary"
                          title="Edit lyrics"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleSearchLyrics(track)}
                          color="secondary"
                          title="Search lyrics"
                        >
                          <FindInPageIcon />
                        </IconButton>
                        {!track.has_lyrics && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              // TODO: Download lyrics for single track
                              console.log('Download lyrics for:', track);
                            }}
                            title="Download lyrics"
                          >
                            <DownloadIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalTracks}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      {/* Lyrics Editor Dialog */}
      <LyricsEditor
        open={lyricsEditorOpen}
        onClose={handleCloseLyricsEditor}
        track={selectedTrack}
      />

      {/* Lyrics Search Dialog */}
      <LyricsSearchDialog
        open={lyricsSearchOpen}
        onClose={handleCloseLyricsSearch}
        track={trackForSearch}
        onLyricsApplied={handleLyricsApplied}
      />
    </Box>
  );
}