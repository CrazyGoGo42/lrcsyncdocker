import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LibraryMusic,
  MusicNote,
  Check,
  Error,
  Dashboard as DashboardIcon,
  TrendingUp,
  PlaylistPlay,
  Scanner as ScannerIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { getTracks } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: tracksData, isLoading, error } = useQuery('tracks', () => getTracks({ limit: 1000 })); // Get all tracks for stats

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load dashboard data: {error.message}
      </Alert>
    );
  }

  const tracks = tracksData?.tracks || [];
  const stats = tracks.length > 0 ? {
    total: tracks.length,
    withLyrics: tracks.filter(t => t.has_lyrics).length,
    withoutLyrics: tracks.filter(t => !t.has_lyrics).length,
    recentlyAdded: tracks.filter(t => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return new Date(t.created_at) > dayAgo;
    }).length,
  } : { total: 0, withLyrics: 0, withoutLyrics: 0, recentlyAdded: 0 };

  const StatCard = ({ title, value, icon, color = 'primary', trend, onClick }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ position: 'relative', overflow: 'hidden' }}>
        {/* Background gradient */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: (theme) => 
              `linear-gradient(135deg, ${theme.palette[color]?.main || theme.palette.primary.main}08 0%, ${theme.palette[color]?.main || theme.palette.primary.main}04 100%)`,
            zIndex: 0,
          }}
        />
        
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              color="text.secondary" 
              gutterBottom 
              variant="body2"
              sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              {value.toLocaleString()}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                  {trend}
                </Typography>
              </Box>
            )}
          </Box>
          <Box 
            sx={{ 
              color: `${color}.main`,
              backgroundColor: (theme) => `${theme.palette[color]?.main || theme.palette.primary.main}12`,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const completionRate = stats.total > 0 ? (stats.withLyrics / stats.total) * 100 : 0;

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 0, sm: 1, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DashboardIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Dashboard
          </Typography>
        </Box>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Welcome back! Here's what's happening with your music library.
        </Typography>

        {/* Progress Bar */}
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Library Completion
            </Typography>
            <Chip 
              label={`${Math.round(completionRate)}%`} 
              color="primary" 
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionRate}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              }
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {stats.withLyrics} of {stats.total} tracks have lyrics
          </Typography>
        </Paper>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Tracks"
            value={stats.total}
            icon={<LibraryMusic fontSize="large" />}
            color="primary"
            onClick={() => navigate('/library')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="With Lyrics"
            value={stats.withLyrics}
            icon={<Check fontSize="large" />}
            color="success"
            trend={completionRate > 75 ? "+12% this week" : undefined}
            onClick={() => navigate('/library')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Missing Lyrics"
            value={stats.withoutLyrics}
            icon={<Error fontSize="large" />}
            color="error"
            onClick={() => navigate('/library')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Recently Added"
            value={stats.recentlyAdded}
            icon={<MusicNote fontSize="large" />}
            color="info"
            trend={stats.recentlyAdded > 0 ? "New today" : undefined}
          />
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Actions
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {stats.total === 0 ? (
                <Grid item xs={12}>
                  <Alert 
                    severity="info" 
                    action={
                      <Button 
                        color="inherit" 
                        size="small"
                        startIcon={<ScannerIcon />}
                        onClick={() => navigate('/scanner')}
                      >
                        Scan Now
                      </Button>
                    }
                  >
                    No music files found. Start by scanning your music directory.
                  </Alert>
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PlaylistPlay />}
                      onClick={() => navigate('/library')}
                      sx={{ py: 1.5, justifyContent: 'flex-start' }}
                    >
                      Browse Library
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ScannerIcon />}
                      onClick={() => navigate('/scanner')}
                      sx={{ py: 1.5, justifyContent: 'flex-start' }}
                    >
                      Scan Music
                    </Button>
                  </Grid>

                  {stats.withoutLyrics > 0 && (
                    <Grid item xs={12}>
                      <Alert 
                        severity="warning"
                        action={
                          <Button 
                            color="inherit" 
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => navigate('/library')}
                          >
                            Download
                          </Button>
                        }
                      >
                        {stats.withoutLyrics} tracks are missing lyrics. Download them from the library.
                      </Alert>
                    </Grid>
                  )}

                  {completionRate === 100 && (
                    <Grid item xs={12}>
                      <Alert severity="success">
                        🎉 Congratulations! All your tracks have lyrics. Your library is complete!
                      </Alert>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Completion Donut */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Lyrics Coverage
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
              <Box position="relative" display="inline-flex">
                <CircularProgress
                  variant="determinate"
                  value={completionRate}
                  size={120}
                  thickness={8}
                  sx={{ 
                    color: completionRate === 100 ? 'success.main' : 'primary.main',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    }
                  }}
                />
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={120}
                  thickness={8}
                  sx={{ 
                    color: 'grey.200',
                    position: 'absolute',
                    left: 0,
                    zIndex: -1,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    }
                  }}
                />
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  bottom={0}
                  right={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="column"
                >
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {Math.round(completionRate)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Complete
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {stats.withLyrics} with lyrics • {stats.withoutLyrics} missing
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}