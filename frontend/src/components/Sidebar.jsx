import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Chip,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  LibraryMusic as LibraryIcon,
  Scanner as ScannerIcon,
  Settings as SettingsIcon,
  MusicNote as MusicNoteIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/appStore';

const drawerWidth = 240;

const navigationItems = [
  { title: 'Dashboard', icon: <DashboardIcon />, path: '/', description: 'Overview & Stats' },
  { title: 'Music Library', icon: <LibraryIcon />, path: '/library', description: 'Browse & Edit' },
  { title: 'Now Playing', icon: <PlayIcon />, path: '/now-playing', description: 'Audio Player & Lyrics' },
  { title: 'Scanner', icon: <ScannerIcon />, path: '/scanner', description: 'Scan Music Files' },
  { title: 'Settings', icon: <SettingsIcon />, path: '/settings', description: 'App Configuration' },
];

export default function Sidebar({ open }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useCustomTheme();
  const { setSidebarOpen } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: { xs: open ? '100%' : 0, md: open ? drawerWidth : 0 }, // Full width on mobile
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: { xs: '100%', md: drawerWidth }, // Full width on mobile
          boxSizing: 'border-box',
          zIndex: { xs: 1300, md: 1200 }, // Higher z-index on mobile to overlay content
          borderRight: (theme) => mode === 'dark' 
            ? '1px solid rgba(148, 163, 184, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.12)',
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <Box sx={{ 
        overflow: 'auto', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo/Title */}
        <Box sx={{ p: 3, pt: 10 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              borderRadius: 2,
              p: 1,
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MusicNoteIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Lyrics Sync
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 6 }}>
            Music Library Manager
          </Typography>
        </Box>
        
        <Divider sx={{ mx: 2, opacity: 0.6 }} />

        {/* Navigation */}
        <List sx={{ px: 2, pt: 2 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  // Close sidebar on mobile after navigation
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  '&.Mui-selected': {
                    background: (theme) => 
                      `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    color: 'primary.main',
                    border: 1,
                    borderColor: alpha('#6366f1', 0.2),
                    '&:hover': {
                      background: (theme) => 
                        `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                  '&:hover': {
                    backgroundColor: alpha('#6366f1', 0.04),
                    transform: 'translateX(4px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        {/* Footer */}
        <Box sx={{ p: 3 }}>
          <Divider sx={{ mb: 2, opacity: 0.6 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Version 1.0.0
            </Typography>
            <Chip 
              label="Beta" 
              size="small" 
              color="secondary" 
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 16 }}
            />
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}