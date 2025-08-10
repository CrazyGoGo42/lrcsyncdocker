import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';

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
  const { sidebarOpen } = useAppStore();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header */}
      <Header />
      
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 }, // Responsive padding
          ml: { 
            xs: 0, // No margin on mobile
            md: sidebarOpen ? '240px' : '60px' // Only apply margin on desktop
          },
          mr: { xs: 0, md: 3 }, // Add right margin to balance left margin
          mt: '64px', // Height of header
          transition: 'margin-left 0.3s ease',
          width: { 
            xs: '100%', 
            md: sidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 60px)' 
          },
          overflow: 'hidden', // Prevent horizontal scroll
          backgroundColor: 'background.default', // Ensure proper background
          minHeight: 'calc(100vh - 64px)', // Full height minus header
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