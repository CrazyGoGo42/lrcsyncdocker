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
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  MusicNote as MusicNoteIcon,
  LibraryMusic as LibraryMusicIcon,
  FindInPage as FindInPageIcon,
} from '@mui/icons-material';
import { getTracks, bulkDownloadLyrics, getSettings } from '../services/api';
import { useAppStore } from '../store/appStore';
import LyricsEditor from '../components/LyricsEditor';
import LyricsSearchDialog from '../components/LyricsSearchDialog';
import toast from 'react-hot-toast';

export default function Library() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [lyricsEditorOpen, setLyricsEditorOpen] = useState(false);
  const [lyricsSearchOpen, setLyricsSearchOpen] = useState(false);
  const [trackForSearch, setTrackForSearch] = useState(null);
  
  const { selectedTracks, toggleTrackSelection, clearSelectedTracks, setSelectedTracks } = useAppStore();
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading, error } = useQuery(
    ['tracks', { search: searchTerm, page, limit: rowsPerPage }],
    () => getTracks({ search: searchTerm, page: page + 1, limit: rowsPerPage }),
    { keepPreviousData: true }
  );

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

  const filteredTracks = tracks.filter(track =>
    track.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.album?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load library: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
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
                sx={{ minWidth: 300, mr: 2 }}
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

        {/* Table */}
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
                filteredTracks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((track) => {
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

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredTracks.length}
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