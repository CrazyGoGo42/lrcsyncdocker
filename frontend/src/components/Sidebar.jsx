import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";

// Lyrics Sync App Navigation Icons
const DashboardIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M3,13H11V3H3M3,21H11V15H3M13,21H21V11H13M13,3V9H21V3" fill="currentColor"/>
  </svg>
);

const NowPlayingIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M8,5.14V19.14L19,12.14L8,5.14Z" fill="currentColor"/>
  </svg>
);

const LibraryIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13C7.79,13 6,14.79 6,17S7.79,21 10,21S14,19.21 14,17V7H18V3H12Z" fill="currentColor"/>
  </svg>
);

const ScannerIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M4,4H10V10H4V4M20,4V10H14V4H20M14,15H16V13H14V11H16V13H18V11H20V13H18V15H20V18H18V20H16V18H13V20H11V16H14V15M16,15V18H18V15H16M4,20V14H10V20H4M6,6V8H8V6H6M16,6V8H18V6H16M6,16V18H8V16H6M4,11H6V13H4V11M9,11H13V15H11V13H9V11M11,6H13V10H11V6M2,2V6H0V2A2,2 0 0,1 2,0H6V2H2M22,0A2,2 0 0,1 24,2V6H22V2H18V0H22M2,18V22H6V24H2A2,2 0 0,1 0,22V18H2M22,22V18H24V22A2,2 0 0,1 22,24H18V22H22Z" fill="currentColor"/>
  </svg>
);

const SettingsIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" fill="currentColor"/>
  </svg>
);

const navigationItems = [
  {
    title: "Dashboard",
    icon: <DashboardIcon />,
    path: "/",
  },
  {
    title: "Now Playing", 
    icon: <NowPlayingIcon />,
    path: "/now-playing",
  },
  {
    title: "Library",
    icon: <LibraryIcon />,
    path: "/library",
  },
  {
    title: "Scanner",
    icon: <ScannerIcon />,
    path: "/scanner",
  },
  {
    title: "Settings",
    icon: <SettingsIcon />,
    path: "/settings",
  },
];

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSidebarOpen } = useAppStore();

  const handleNavigation = (path) => {
    navigate(path);
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <nav className={`app-sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Navigation</div>
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.path)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-item-icon">{item.icon}</div>
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;