import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { useAppStore } from "../store/appStore";
import { api } from "../services/api";

// App Icons
const MenuIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" fill="currentColor"/>
  </svg>
);

const LogoIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13C7.79,13 6,14.79 6,17S7.79,21 10,21S14,19.21 14,17V7H18V3H12Z" fill="currentColor"/>
  </svg>
);

const SearchIcon = () => (
  <svg height="20" viewBox="0 0 24 24" width="20">
    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" fill="currentColor"/>
  </svg>
);

const SunIcon = () => (
  <svg height="16" viewBox="0 0 24 24" width="16">
    <path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" fill="currentColor"/>
  </svg>
);

const MoonIcon = () => (
  <svg height="16" viewBox="0 0 24 24" width="16">
    <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z" fill="currentColor"/>
  </svg>
);

const AutoIcon = () => (
  <svg height="16" viewBox="0 0 24 24" width="16">
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20V4Z" fill="currentColor"/>
  </svg>
);

const Header = () => {
  const { toggleSidebar, selectedTracks } = useAppStore();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'auto';
  });

  // Fetch health status
  const { data: healthData } = useQuery(
    "health",
    () => api.get("/health").then((res) => res.data),
    {
      refetchInterval: 30000,
      retry: 1,
    }
  );

  const isHealthy = healthData?.status === "healthy";
  const totalTracks = healthData?.stats?.total_tracks || 0;

  const applyTheme = (newTheme) => {
    let actualTheme = newTheme;
    
    if (newTheme === 'auto') {
      // Use system preference
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Apply theme to both html and document element
    document.documentElement.setAttribute('data-theme', actualTheme);
    document.body.setAttribute('data-theme', actualTheme);
    
    // Force re-render by updating CSS custom properties directly
    const root = document.documentElement;
    if (actualTheme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-elevated', 'rgba(255, 255, 255, 0.9)');
      root.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--bg-surface', '#f5f5f5');
      root.style.setProperty('--bg-hover', 'rgba(0, 0, 0, 0.04)');
      root.style.setProperty('--text-primary', '#202124');
      root.style.setProperty('--text-secondary', '#5f6368');
      root.style.setProperty('--text-disabled', '#9aa0a6');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
    } else {
      root.style.setProperty('--bg-primary', '#121212');
      root.style.setProperty('--bg-secondary', '#1e1e1e');
      root.style.setProperty('--bg-elevated', 'rgba(42, 42, 42, 0.95)');
      root.style.setProperty('--bg-glass', 'rgba(37, 37, 37, 0.85)');
      root.style.setProperty('--bg-surface', '#242424');
      root.style.setProperty('--bg-hover', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b3b3b3');
      root.style.setProperty('--text-disabled', '#8a8a8a');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.12)');
    }
  };

  const toggleTheme = () => {
    let newTheme;
    if (theme === 'light') {
      newTheme = 'dark';
    } else if (theme === 'dark') {
      newTheme = 'auto';
    } else {
      newTheme = 'light';
    }
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Initialize theme on mount and listen for system changes
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Listen for system theme changes when in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (savedTheme === 'auto') {
        applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Re-apply theme when theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Left Section - Menu & Logo */}
        <div className="header-left">
          {/* Menu Button */}
          <button
            className="btn btn-icon"
            onClick={toggleSidebar}
            aria-label="Menu"
          >
            <MenuIcon />
          </button>

          {/* App Logo */}
          <a href="/" className="app-logo">
            <div className="logo-icon">
              <LogoIcon />
            </div>
            <span>LyricsSync</span>
          </a>
        </div>

        {/* Center Section - Search */}
        <div className="header-center">
          <div className="search-container">
            <div className="search-icon">
              <SearchIcon />
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Search songs, artists, albums..."
              aria-label="Search"
            />
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="header-right">
          {/* Selection Count Badge */}
          {selectedTracks.length > 0 && (
            <div className="status-indicator online">
              {selectedTracks.length} selected
            </div>
          )}

          {/* Library Stats */}
          {totalTracks > 0 && (
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)' 
            }}>
              {totalTracks} songs
            </span>
          )}

          {/* Connection Status Indicator */}
          <div className={`status-indicator ${isHealthy ? 'online' : 'offline'}`}>
            <div className="status-dot" />
            <span>{isHealthy ? 'Online' : 'Offline'}</span>
          </div>

          {/* Theme Toggle */}
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Theme: ${theme} (click to cycle)`}
          >
            <div className="theme-toggle-thumb">
              {theme === 'light' ? <SunIcon /> : theme === 'dark' ? <MoonIcon /> : <AutoIcon />}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;