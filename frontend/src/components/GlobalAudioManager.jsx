import { useEffect, useRef } from "react";
import { Howl } from "howler";
import { useAppStore } from "../store/appStore";
import toast from "react-hot-toast";

const GlobalAudioManager = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    repeat,
    queue,
    currentQueueIndex,
    seekTime,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    nextTrack,
  } = useAppStore();

  const howlRef = useRef(null);
  const intervalRef = useRef(null);
  const loadingTrackIdRef = useRef(null); // Track which track is currently loading
  const wakeLockRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize audio context on user interaction
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
      } catch (e) {
        console.warn("AudioContext initialization failed:", e);
      }
    }
  };

  // Wake lock for mobile devices
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake lock acquired");
      }
    } catch (err) {
      console.warn("Wake lock request failed:", err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log("Wake lock released");
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      releaseWakeLock();
    };
  }, []);

  // Load new track - FIXED to prevent infinite loops
  useEffect(() => {
    if (!currentTrack?.id) {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      loadingTrackIdRef.current = null;
      return;
    }

    // CRITICAL FIX: Prevent loading the same track multiple times
    if (loadingTrackIdRef.current === currentTrack.id) {
      console.log("Track already loading, skipping:", currentTrack.id);
      return;
    }

    // CRITICAL FIX: Check if we already have this track loaded
    if (
      howlRef.current &&
      howlRef.current._src &&
      howlRef.current._src.includes(currentTrack.id)
    ) {
      console.log("Track already loaded, skipping reload:", currentTrack.id);
      return;
    }

    console.log("Loading new track:", currentTrack.id, currentTrack.title);
    loadingTrackIdRef.current = currentTrack.id;

    // Unload previous track with proper cleanup
    if (howlRef.current) {
      console.log("Unloading previous track");
      howlRef.current.unload();
      howlRef.current = null;
    }

    // Create audio URL - use backend URL
    const audioUrl = `${
      import.meta.env.VITE_API_URL || "http://localhost:5000"
    }/api/tracks/${currentTrack.id}/audio`;
    const fileExtension = currentTrack.filename
      ? currentTrack.filename.split(".").pop().toLowerCase()
      : "mp3";

    // Initialize audio context before creating Howl
    initAudioContext();

    // Use Web Audio API for better format support, fallback to HTML5 for FLAC
    const useHtml5 =
      fileExtension === "flac" ||
      fileExtension === "ape" ||
      fileExtension === "wv";

    console.log("Creating new Howl instance for:", audioUrl);

    howlRef.current = new Howl({
      src: [audioUrl],
      format: [fileExtension],
      html5: useHtml5,
      volume: volume || 0.8,
      onload: () => {
        console.log("✅ Audio loaded successfully:", currentTrack.title);
        const duration = howlRef.current.duration();
        setDuration(duration);
        setCurrentTime(0);
        loadingTrackIdRef.current = null; // Clear loading state

        // Auto-start playback if we were already playing
        if (isPlaying && howlRef.current) {
          try {
            howlRef.current.play();
            requestWakeLock();
          } catch (error) {
            console.warn("Auto-play blocked, user interaction required");
            setIsPlaying(false);
          }
        }
      },
      onloaderror: (_, error) => {
        console.error("❌ Failed to load audio:", error);
        console.error("Track details:", {
          filename: currentTrack.filename,
          extension: fileExtension,
          audioUrl,
        });

        loadingTrackIdRef.current = null; // Clear loading state

        // Check if it's a format issue
        if (fileExtension === "flac") {
          console.warn("⚠️ FLAC files may not be supported in all browsers");
          toast.error(
            `Cannot play FLAC file: ${currentTrack.filename}. Try converting to MP3.`
          );
        } else {
          toast.error(`Failed to load audio: ${currentTrack.filename}`);
        }

        setIsPlaying(false);

        // FIXED: More controlled auto-skip with delay and checks
        const canSkip =
          queue.length > 1 && currentQueueIndex < queue.length - 1;
        console.log("Auto-skip check:", {
          queueLength: queue.length,
          currentIndex: currentQueueIndex,
          canSkip,
        });

        if (canSkip) {
          console.log("Auto-skipping to next track due to audio error");
          // Add delay and make sure we don't skip if user manually changed tracks
          setTimeout(() => {
            if (
              loadingTrackIdRef.current === null &&
              currentTrack.id === loadingTrackIdRef.current
            ) {
              console.log("Executing auto-skip...");
              nextTrack();
            }
          }, 1500);
        }
      },
      onplayerror: (_, error) => {
        console.error("❌ Failed to play audio:", error);
        toast.error(`Playback error: ${currentTrack.filename}`);
        setIsPlaying(false);
        loadingTrackIdRef.current = null; // Clear loading state
      },
      onend: () => {
        console.log("🔄 Track ended");
        if (repeat === "one") {
          howlRef.current.seek(0);
          howlRef.current.play();
          setCurrentTime(0);
        } else if (
          queue.length > 1 &&
          (currentQueueIndex < queue.length - 1 || repeat === "all")
        ) {
          // Small delay to prevent rapid track changes
          setTimeout(nextTrack, 100);
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      },
    });
  }, [currentTrack?.id]); // ONLY depend on track ID, not other state

  // Handle play/pause
  useEffect(() => {
    if (!howlRef.current || loadingTrackIdRef.current !== null) return;

    try {
      if (isPlaying) {
        howlRef.current.play();
        requestWakeLock();
      } else {
        howlRef.current.pause();
        releaseWakeLock();
      }
    } catch (error) {
      console.error("Playback state change error:", error);
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (howlRef.current && loadingTrackIdRef.current === null) {
      howlRef.current.volume(volume || 0.8);
    }
  }, [volume]);

  // Update current time - FIXED to prevent excessive updates
  useEffect(() => {
    if (isPlaying && howlRef.current && loadingTrackIdRef.current === null) {
      intervalRef.current = setInterval(() => {
        if (howlRef.current) {
          const time = howlRef.current.seek();
          if (typeof time === "number" && !isNaN(time)) {
            setCurrentTime(time);
          }
        }
      }, 250); // Reduced frequency to prevent excessive updates

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isPlaying, loadingTrackIdRef.current]);

  // Handle seeking - FIXED to prevent loops
  useEffect(() => {
    if (
      seekTime !== null &&
      howlRef.current &&
      typeof seekTime === "number" &&
      loadingTrackIdRef.current === null
    ) {
      try {
        howlRef.current.seek(seekTime);
        setCurrentTime(seekTime);
      } catch (error) {
        console.error("Seek error:", error);
      }
    }
  }, [seekTime]);

  // This component doesn't render anything
  return null;
};

export default GlobalAudioManager;
