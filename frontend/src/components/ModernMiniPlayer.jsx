import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { createArtworkUrl } from "../utils/imageLoader";

// YouTube Music Player Icons
const PlayIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M8,5.14V19.14L19,12.14L8,5.14Z" fill="currentColor"/>
  </svg>
);

const PauseIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M14,19H18V5H14M6,19H10V5H6V19Z" fill="currentColor"/>
  </svg>
);

const SkipNextIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M16,18H18V6H16M6,18L14.5,12L6,6V18Z" fill="currentColor"/>
  </svg>
);

const SkipPrevIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z" fill="currentColor"/>
  </svg>
);


const ModernMiniPlayer = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayback,
    nextTrack,
    previousTrack,
    queue,
    currentQueueIndex,
  } = useAppStore();

  const handleOpenFullPlayer = () => {
    navigate("/now-playing");
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTogglePlayback = (e) => {
    e.stopPropagation();
    if (!isLoading) {
      togglePlayback();
    }
  };

  const handleNextTrack = (e) => {
    e.stopPropagation();
    if (!isLoading) {
      setIsLoading(true);
      nextTrack();
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handlePreviousTrack = (e) => {
    e.stopPropagation();
    if (!isLoading) {
      setIsLoading(true);
      previousTrack();
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  if (!currentTrack) return null;

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;
  const canGoPrevious = !isLoading && queue.length > 1 && currentQueueIndex > 0;
  const canGoNext = !isLoading && queue.length > 1 && currentQueueIndex < queue.length - 1;

  return (
    <div className="mini-player">
      {/* Progress Bar */}
      <div className="progress-container">
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="player-content">
        {/* Song Info Section */}
        <div className="player-info" onClick={handleOpenFullPlayer}>
          <div className="player-artwork">
            {currentTrack.artwork_path ? (
              <img
                src={createArtworkUrl(currentTrack.artwork_path)}
                alt={`${currentTrack.album} artwork`}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-elevated)'
              }}>
                <svg height="24" width="24" viewBox="0 0 24 24">
                  <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13C7.79,13 6,14.79 6,17S7.79,21 10,21S14,19.21 14,17V7H18V3H12Z" fill="var(--text-disabled)"/>
                </svg>
              </div>
            )}
          </div>
          <div className="player-details">
            <div className="player-title">
              {currentTrack.title || currentTrack.filename}
            </div>
            <div className="player-artist">
              {currentTrack.artist || "Unknown Artist"}
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="player-controls">
          <button
            onClick={handlePreviousTrack}
            disabled={!canGoPrevious}
            className="player-btn"
            title="Previous"
          >
            <SkipPrevIcon />
          </button>

          <button
            onClick={handleTogglePlayback}
            disabled={isLoading}
            className="player-btn play-pause"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>

          <button
            onClick={handleNextTrack}
            disabled={!canGoNext}
            className="player-btn"
            title="Next"
          >
            <SkipNextIcon />
          </button>
        </div>

        {/* Right Section - Time Display */}
        <div className="player-info-right">
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default ModernMiniPlayer;