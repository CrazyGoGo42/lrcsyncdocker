import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Backdrop, useMediaQuery, useTheme } from '@mui/material';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import Scanner from './pages/Scanner';
import Settings from './pages/Settings';
import NowPlaying from './pages/NowPlaying';

// Hooks
import { useAppStore } from './store/appStore';

function App() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header */}
      <Header />
      
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
          p: { xs: 2, sm: 3, md: 3 }, // Better mobile padding
          ml: { 
            xs: 0, // No margin on mobile
            md: sidebarOpen ? '240px' : '0px' // Margin only on desktop
          },
          mt: '64px', // Height of header
          transition: 'margin-left 0.3s ease',
          width: { 
            xs: '100%', 
            md: sidebarOpen ? 'calc(100% - 240px)' : '100%' 
          },
          overflow: 'hidden',
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
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
    </Box>
  );
}

export default App;