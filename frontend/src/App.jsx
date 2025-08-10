import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, Backdrop, useMediaQuery, useTheme } from '@mui/material';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import Scanner from './pages/Scanner';
import Settings from './pages/Settings';
import NowPlaying from './pages/NowPlaying';
import MiniAudioPlayer from './components/MiniAudioPlayer';
import GlobalAudioManager from './components/GlobalAudioManager';

// Hooks
import { useAppStore } from './store/appStore';

function App() {
  const { sidebarOpen, setSidebarOpen, currentTrack } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  
  const isNowPlayingMobile = location.pathname === '/now-playing' && isMobile;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header - hide on mobile Now Playing */}
      {!isNowPlayingMobile && <Header />}
      
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <Backdrop
          open={sidebarOpen}
          onClick={() => setSidebarOpen(false)}
          sx={{ 
            zIndex: 1250,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isNowPlayingMobile ? 0 : { xs: 1, sm: 2, md: 3 }, // No padding on mobile Now Playing
          pb: currentTrack && !isNowPlayingMobile ? { xs: 10, sm: 12 } : isNowPlayingMobile ? 0 : { xs: 1, sm: 2, md: 3 },
          ml: { 
            xs: 0, // No margin on mobile
            md: sidebarOpen ? '240px' : '0px' // Margin only on desktop
          },
          mt: isNowPlayingMobile ? 0 : '64px', // No margin top on mobile Now Playing
          transition: 'margin-left 0.3s ease',
          width: { 
            xs: '100%', 
            md: sidebarOpen ? 'calc(100% - 240px)' : '100%' 
          },
          overflow: 'hidden',
          backgroundColor: 'background.default',
          minHeight: isNowPlayingMobile ? '100vh' : 'calc(100vh - 64px)',
          height: isNowPlayingMobile ? '100vh' : 'auto'
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/now-playing" element={<NowPlaying />} />
        </Routes>
      </Box>

      {/* Mini Audio Player - show when not on Now Playing page and there's a current track */}
      {currentTrack && location.pathname !== '/now-playing' && (
        <MiniAudioPlayer />
      )}
      
      {/* Global Audio Manager - handles all audio playback */}
      <GlobalAudioManager />
    </Box>
  );
}

export default App;