import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import axios from 'axios';

const LyricsPublisher = ({ open, onClose, track, lyrics, syncedLyrics }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    trackName: track?.title || '',
    artistName: track?.artist || '',
    albumName: track?.album || '',
    duration: track?.duration || 0,
  });
  const [publishOptions, setPublishOptions] = useState({
    publishPlain: !!lyrics && !syncedLyrics,
    publishSynced: !!syncedLyrics,
    overwriteExisting: false,
  });
  const [challengeData, setChallengeData] = useState(null);
  const [publishToken, setPublishToken] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [publishResult, setPublishResult] = useState(null);

  const steps = [
    {
      label: 'Review Track Information',
      description: 'Verify the track details before publishing',
    },
    {
      label: 'Solve Challenge',
      description: 'Complete proof-of-work challenge',
    },
    {
      label: 'Publish Lyrics',
      description: 'Submit lyrics to LRCLIB database',
    },
  ];

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && track) {
      setActiveStep(0);
      setFormData({
        trackName: track.title || '',
        artistName: track.artist || '',
        albumName: track.album || '',
        duration: track.duration || 0,
      });
      setPublishOptions({
        publishPlain: !!lyrics && !syncedLyrics,
        publishSynced: !!syncedLyrics,
        overwriteExisting: false,
      });
      setChallengeData(null);
      setPublishToken(null);
      setError(null);
      setPublishResult(null);
    }
  }, [open, track, lyrics, syncedLyrics]);

  const requestChallengeMutation = useMutation(
    () => axios.post('/api/publish/request-challenge'),
    {
      onSuccess: (response) => {
        setChallengeData(response.data);
        setActiveStep(1);
        // Automatically start solving challenge
        solveChallengeMutation.mutate(response.data);
      },
      onError: (error) => {
        setError(`Failed to request challenge: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const solveChallengeMutation = useMutation(
    (challengeData) => axios.post('/api/publish/solve-challenge', challengeData),
    {
      onSuccess: (response) => {
        setPublishToken(response.data.token);
        toast.success(`Challenge solved in ${response.data.duration}ms!`);
        setActiveStep(2);
      },
      onError: (error) => {
        setError(`Failed to solve challenge: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const publishLyricsMutation = useMutation(
    (publishData) => axios.post('/api/publish/lyrics', publishData),
    {
      onSuccess: (response) => {
        setPublishResult(response.data);
        toast.success('Lyrics published successfully!');
      },
      onError: (error) => {
        const errorMsg = error.response?.data?.message || error.message;
        setError(`Failed to publish lyrics: ${errorMsg}`);
        
        if (error.response?.status === 409) {
          toast.error('Lyrics already exist for this track');
        } else if (error.response?.status === 401) {
          toast.error('Authentication failed. Please try again.');
        } else {
          toast.error('Publishing failed');
        }
      },
    }
  );

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionsChange = (field, value) => {
    setPublishOptions(prev => ({ ...prev, [field]: value }));
  };

  const handleStartPublishing = useCallback(() => {
    if (!formData.trackName.trim() || !formData.artistName.trim()) {
      toast.error('Track name and artist name are required');
      return;
    }

    if (!publishOptions.publishPlain && !publishOptions.publishSynced) {
      toast.error('Please select at least one lyrics type to publish');
      return;
    }

    setError(null);
    setIsProcessing(true);
    requestChallengeMutation.mutate();
  }, [formData, publishOptions, requestChallengeMutation]);

  const handlePublishLyrics = useCallback(() => {
    if (!publishToken) {
      toast.error('No publish token available');
      return;
    }

    const publishData = {
      trackName: formData.trackName.trim(),
      artistName: formData.artistName.trim(),
      albumName: formData.albumName.trim() || undefined,
      duration: formData.duration || undefined,
      token: publishToken,
    };

    if (publishOptions.publishPlain && lyrics) {
      publishData.plainLyrics = lyrics;
    }

    if (publishOptions.publishSynced && syncedLyrics) {
      publishData.syncedLyrics = syncedLyrics;
    }

    publishLyricsMutation.mutate(publishData);
  }, [publishToken, formData, publishOptions, lyrics, syncedLyrics, publishLyricsMutation]);

  const handleClose = () => {
    setIsProcessing(false);
    onClose();
  };

  const isLoading = requestChallengeMutation.isLoading || 
                   solveChallengeMutation.isLoading || 
                   publishLyricsMutation.isLoading;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '500px' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <UploadIcon />
          <Typography variant="h6">
            Publish Lyrics to LRCLIB
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {publishResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Lyrics published successfully! Your contribution helps other users find synchronized lyrics.
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 1: Review Information */}
          <Step>
            <StepLabel>
              {steps[0].label}
              {activeStep > 0 && <CheckIcon color="success" sx={{ ml: 1 }} />}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {steps[0].description}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                <TextField
                  label="Track Name"
                  value={formData.trackName}
                  onChange={(e) => handleFormChange('trackName', e.target.value)}
                  required
                  fullWidth
                  disabled={isLoading}
                />
                <TextField
                  label="Artist Name"
                  value={formData.artistName}
                  onChange={(e) => handleFormChange('artistName', e.target.value)}
                  required
                  fullWidth
                  disabled={isLoading}
                />
                <TextField
                  label="Album Name (Optional)"
                  value={formData.albumName}
                  onChange={(e) => handleFormChange('albumName', e.target.value)}
                  fullWidth
                  disabled={isLoading}
                />
                <TextField
                  label="Duration (seconds)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleFormChange('duration', parseFloat(e.target.value) || 0)}
                  fullWidth
                  disabled={isLoading}
                />
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                What to publish:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={publishOptions.publishPlain}
                      onChange={(e) => handleOptionsChange('publishPlain', e.target.checked)}
                      disabled={!lyrics || isLoading}
                    />
                  }
                  label="Plain text lyrics"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={publishOptions.publishSynced}
                      onChange={(e) => handleOptionsChange('publishSynced', e.target.checked)}
                      disabled={!syncedLyrics || isLoading}
                    />
                  }
                  label="Synchronized lyrics (with timestamps)"
                />
              </Box>

              {/* Preview */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Publishing Preview:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label={`Track: ${formData.trackName || 'N/A'}`} size="small" />
                    <Chip label={`Artist: ${formData.artistName || 'N/A'}`} size="small" />
                    {formData.albumName && (
                      <Chip label={`Album: ${formData.albumName}`} size="small" />
                    )}
                    {formData.duration > 0 && (
                      <Chip label={`Duration: ${Math.floor(formData.duration / 60)}:${String(Math.floor(formData.duration % 60)).padStart(2, '0')}`} size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>

              <Button 
                variant="contained" 
                onClick={handleStartPublishing}
                disabled={isLoading || !formData.trackName.trim() || !formData.artistName.trim()}
                startIcon={<SecurityIcon />}
              >
                Start Publishing Process
              </Button>
            </StepContent>
          </Step>

          {/* Step 2: Solve Challenge */}
          <Step>
            <StepLabel>
              {steps[1].label}
              {solveChallengeMutation.isSuccess && <CheckIcon color="success" sx={{ ml: 1 }} />}
              {solveChallengeMutation.isError && <ErrorIcon color="error" sx={{ ml: 1 }} />}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {steps[1].description}
              </Typography>
              
              {requestChallengeMutation.isLoading && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Requesting challenge from LRCLIB...
                  </Typography>
                </Box>
              )}

              {challengeData && solveChallengeMutation.isLoading && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Solving proof-of-work challenge... This may take a few moments.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Challenge prefix: {challengeData.prefix}
                  </Typography>
                </Box>
              )}

              {publishToken && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Challenge solved successfully! Ready to publish.
                </Alert>
              )}
            </StepContent>
          </Step>

          {/* Step 3: Publish Lyrics */}
          <Step>
            <StepLabel>
              {steps[2].label}
              {publishResult && <CheckIcon color="success" sx={{ ml: 1 }} />}
              {publishLyricsMutation.isError && <ErrorIcon color="error" sx={{ ml: 1 }} />}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {steps[2].description}
              </Typography>

              {publishLyricsMutation.isLoading && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Publishing lyrics to LRCLIB database...
                  </Typography>
                </Box>
              )}

              {publishToken && !publishResult && !publishLyricsMutation.isLoading && (
                <Button 
                  variant="contained" 
                  onClick={handlePublishLyrics}
                  startIcon={<UploadIcon />}
                  color="primary"
                >
                  Publish to LRCLIB
                </Button>
              )}

              {publishResult && (
                <Alert severity="success">
                  <Typography variant="subtitle2">
                    Publishing Complete!
                  </Typography>
                  <Typography variant="body2">
                    Your lyrics have been successfully submitted to the LRCLIB database. 
                    Thank you for contributing to the community!
                  </Typography>
                </Alert>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {publishResult ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LyricsPublisher;