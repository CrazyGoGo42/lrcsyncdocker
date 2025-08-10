import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Scanner as ScannerIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { startScan } from '../services/api';
import toast from 'react-hot-toast';

export default function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanResults, setScanResults] = useState(null);

  const queryClient = useQueryClient();

  const scanMutation = useMutation(startScan, {
    onSuccess: (data) => {
      setIsScanning(false);
      setScanResults(data.results || data);
      queryClient.invalidateQueries(['tracks']);
      queryClient.refetchQueries(['tracks']);
      toast.success(`Scan completed! Found ${data.results?.tracksFound || 0} tracks`);
    },
    onError: (error) => {
      setIsScanning(false);
      toast.error(`Failed to start scan: ${error.message}`);
    },
  });

  // Direct scan - no polling needed

  const handleStartScan = () => {
    setScanResults(null);
    setScanProgress(0);
    setScanStatus('Scanning...');
    setIsScanning(true);
    scanMutation.mutate();
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Music Scanner
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Scan your music directory to index tracks and extract metadata.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <ScannerIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Directory Scanner
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            The scanner will search for music files in your mounted directory,
            extract metadata (title, artist, album, duration), and check for existing lyrics files.
          </Typography>

          {isScanning && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {scanStatus}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={scanProgress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {Math.round(scanProgress)}% complete
              </Typography>
            </Box>
          )}

          {scanResults && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Scan completed! Found {scanResults.tracksFound} music files.
                {scanResults.newTracks > 0 && ` Added ${scanResults.newTracks} new tracks.`}
                {scanResults.updatedTracks > 0 && ` Updated ${scanResults.updatedTracks} existing tracks.`}
              </Typography>
            </Alert>
          )}
        </CardContent>
        
        <CardActions>
          <Button
            variant="contained"
            size="large"
            startIcon={<ScannerIcon />}
            onClick={handleStartScan}
            disabled={isScanning || scanMutation.isLoading}
          >
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Button>
        </CardActions>
      </Card>

      {/* Scan Information */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          How it works
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <FolderIcon />
            </ListItemIcon>
            <ListItemText
              primary="Directory Traversal"
              secondary="Recursively searches the mounted music directory for audio files"
            />
          </ListItem>
          
          <Divider variant="inset" component="li" />
          
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText
              primary="Metadata Extraction"
              secondary="Reads ID3 tags and other metadata from audio files (MP3, FLAC, M4A, etc.)"
            />
          </ListItem>
          
          <Divider variant="inset" component="li" />
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText
              primary="Lyrics Detection"
              secondary="Checks for existing .lrc files and embedded lyrics in audio files"
            />
          </ListItem>
          
          <Divider variant="inset" component="li" />
          
          <ListItem>
            <ListItemIcon>
              <ErrorIcon />
            </ListItemIcon>
            <ListItemText
              primary="Database Update"
              secondary="Stores track information and lyrics status in the database"
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Supported formats:</strong> MP3, FLAC, M4A, AAC, OGG, WAV, WMA
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
}