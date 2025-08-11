import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./index.css";

// Components
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Scanner from "./pages/Scanner";
import Settings from "./pages/Settings";
import NowPlaying from "./pages/NowPlaying";
import ModernMiniPlayer from "./components/ModernMiniPlayer";
import GlobalAudioManager from "./components/GlobalAudioManager";
import AlbumBackdrop from "./components/AlbumBackdrop";

// Hooks and Context
import { useAppStore } from "./store/appStore";
import { AlbumColorProvider } from "./contexts/AlbumColorContext";

function App() {
  const { sidebarOpen, setSidebarOpen, currentTrack } = useAppStore();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isNowPlayingMobile = location.pathname === "/now-playing" && isMobile;

  return (
    <AlbumColorProvider>
      {/* Background */}
      <AlbumBackdrop />

      {/* App Container */}
      <div className="app-container">
        {/* Header */}
        {!isNowPlayingMobile && <Header />}

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className={`app-main ${sidebarOpen && !isMobile ? 'sidebar-open' : ''}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/now-playing" element={<NowPlaying />} />
          </Routes>
        </main>

        {/* Mini Player */}
        {currentTrack && location.pathname !== "/now-playing" && (
          <ModernMiniPlayer />
        )}
      </div>

      {/* Global Audio Manager */}
      <GlobalAudioManager />
    </AlbumColorProvider>
  );
}

export default App;