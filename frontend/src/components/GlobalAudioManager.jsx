import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { useAppStore } from '../store/appStore';

const GlobalAudioManager = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    repeat,
    queue,
    currentQueueIndex,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    nextTrack
  } = useAppStore();
  
  const howlRef = useRef(null);
  const intervalRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load new track
  useEffect(() => {
    if (!currentTrack?.id) {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // Unload previous track
    if (howlRef.current) {
      howlRef.current.unload();
    }

    // Create audio URL
    const audioUrl = `/api/tracks/${currentTrack.id}/audio`;
    const fileExtension = currentTrack.filename ? currentTrack.filename.split('.').pop().toLowerCase() : 'mp3';

    howlRef.current = new Howl({
      src: [audioUrl],
      format: [fileExtension],
      html5: true,
      volume: volume || 0.8,
      onload: () => {
        setDuration(howlRef.current.duration());
      },
      onloaderror: (id, error) => {
        console.error('Failed to load audio:', error);
        setIsPlaying(false);
      },
      onplayerror: (id, error) => {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
      },
      onend: () => {
        if (repeat === 'one') {
          howlRef.current.seek(0);
          howlRef.current.play();
          setCurrentTime(0);
        } else if (queue.length > 1 && (currentQueueIndex < queue.length - 1 || repeat === 'all')) {
          nextTrack();
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }
    });

  }, [currentTrack?.id]);

  // Handle play/pause
  useEffect(() => {
    if (!howlRef.current) return;

    if (isPlaying) {
      howlRef.current.play();
    } else {
      howlRef.current.pause();
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(volume || 0.8);
    }
  }, [volume]);

  // Update current time
  useEffect(() => {
    if (isPlaying && howlRef.current) {
      intervalRef.current = setInterval(() => {
        const time = howlRef.current.seek();
        if (typeof time === 'number') {
          setCurrentTime(time);
        }
      }, 100);

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
  }, [isPlaying]);

  // This component doesn't render anything
  return null;
};

export default GlobalAudioManager;