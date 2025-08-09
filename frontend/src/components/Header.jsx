import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MusicNote,
  Refresh,
  LightMode,
  DarkMode,
  SettingsBrightness,
} from '@mui/icons-material';
import { useQuery } from 'react-query';

import { useAppStore } from '../store/appStore';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';

const Header = () => {
  const { toggleSidebar, selectedTracks } = useAppStore();
  const { mode, themeMode, toggleTheme } = useTheme();

  // Fetch health status
  const { data: healthData } = useQuery(
    'health',
    () => api.get('/health').then(res => res.data),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      retry: 1
    }
  );

  const isHealthy = healthData?.status === 'healthy';
  const totalTracks = healthData?.stats?.total_tracks || 0;
  const tracksWithLyrics = healthData?.stats?.tracks_with_lyrics || 0;

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light': return <LightMode />;
      case 'dark': return <DarkMode />;
      case 'auto': return <SettingsBrightness />;
      default: return <LightMode />;
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light Mode';
      case 'dark': return 'Dark Mode';
      case 'auto': return 'Auto Mode';
      default: return 'Light Mode';
    }
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: (theme) => 
          mode === 'dark' 
            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: (theme) => 
          mode === 'dark' 
            ? '1px solid rgba(148, 163, 184, 0.1)'
            : '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Toolbar sx={{ px: 2 }}>
        {/* Menu Toggle */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={toggleSidebar}
          sx={{ 
            mr: 2,
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* App Title */}
        <MusicNote sx={{ mr: 1.5 }} />
        <Typography
          variant="h5"
          noWrap
          component="div"
          sx={{ 
            flexGrow: 1, 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #ffffff 30%, rgba(255,255,255,0.8) 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Lyrics Sync Web
        </Typography>

        {/* Status Chips */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {/* Selection Count */}
          {selectedTracks.length > 0 && (
            <Chip
              label={`${selectedTracks.length} selected`}
              color="secondary"
              size="small"
              sx={{ 
                color: 'white', 
                fontWeight: 500,
                backgroundColor: 'rgba(236, 72, 153, 0.2)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}
            />
          )}

          {/* Library Stats */}
          {totalTracks > 0 && (
            <Chip
              label={`${tracksWithLyrics}/${totalTracks} with lyrics`}
              variant="outlined"
              size="small"
              sx={{ 
                color: 'white', 
                fontWeight: 500,
                borderColor: 'rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }
              }}
            />
          )}

          {/* Health Status */}
          <Chip
            icon={<Refresh sx={{ fontSize: 16 }} />}
            label={isHealthy ? 'Online' : 'Offline'}
            size="small"
            variant="outlined"
            sx={{ 
              color: 'white',
              fontWeight: 500,
              borderColor: isHealthy ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              backgroundColor: isHealthy ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              '&:hover': {
                backgroundColor: isHealthy ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              }
            }}
          />

          {/* Theme Toggle */}
          <Tooltip title={`Switch to ${getThemeLabel()}`}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              sx={{ 
                ml: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1) rotate(10deg)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {getThemeIcon()}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;