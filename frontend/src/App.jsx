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
          p: 3,
          ml: sidebarOpen ? '240px' : '60px',
          mt: '64px', // Height of header
          transition: 'margin-left 0.3s ease',
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;