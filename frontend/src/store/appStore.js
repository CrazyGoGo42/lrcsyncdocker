import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // UI State
      sidebarOpen: true,
      
      // Selected tracks for bulk operations
      selectedTracks: [],
      
      // Currently playing track
      currentTrack: null,
      
      // Queue system
      queue: [],
      currentQueueIndex: -1,
      shuffle: false,
      repeat: 'off', // 'off', 'all', 'one'
      
      // Audio playback state
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      
      // Current scan/job status
      currentScanJob: null,
      scanProgress: 0,
      
      // Library filters
      libraryFilters: {
        search: '',
        artist: '',
        album: '',
        hasLyrics: '',
        sortBy: 'title',
        sortOrder: 'ASC'
      },
      
      // Actions
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setSelectedTracks: (tracks) => set({ selectedTracks: tracks }),
      
      addSelectedTrack: (trackId) => set((state) => ({
        selectedTracks: [...new Set([...state.selectedTracks, trackId])]
      })),
      
      removeSelectedTrack: (trackId) => set((state) => ({
        selectedTracks: state.selectedTracks.filter(id => id !== trackId)
      })),
      
      clearSelectedTracks: () => set({ selectedTracks: [] }),
      
      setCurrentTrack: (track) => set({ currentTrack: track }),
      
      clearCurrentTrack: () => set({ currentTrack: null }),
      
      // Queue management actions
      setQueue: (tracks) => set({ queue: tracks, currentQueueIndex: 0 }),
      
      addToQueue: (track) => set((state) => ({ 
        queue: [...state.queue, track] 
      })),
      
      removeFromQueue: (index) => set((state) => ({
        queue: state.queue.filter((_, i) => i !== index),
        currentQueueIndex: state.currentQueueIndex > index 
          ? state.currentQueueIndex - 1 
          : state.currentQueueIndex
      })),
      
      playTrackFromQueue: (index) => set((state) => ({
        currentTrack: state.queue[index],
        currentQueueIndex: index,
        isPlaying: true
      })),
      
      nextTrack: () => set((state) => {
        const nextIndex = state.currentQueueIndex + 1;
        if (nextIndex < state.queue.length) {
          return {
            currentTrack: state.queue[nextIndex],
            currentQueueIndex: nextIndex,
            currentTime: 0
          };
        } else if (state.repeat === 'all') {
          return {
            currentTrack: state.queue[0],
            currentQueueIndex: 0,
            currentTime: 0
          };
        }
        return {};
      }),
      
      previousTrack: () => set((state) => {
        const prevIndex = state.currentQueueIndex - 1;
        if (prevIndex >= 0) {
          return {
            currentTrack: state.queue[prevIndex],
            currentQueueIndex: prevIndex,
            currentTime: 0
          };
        } else if (state.repeat === 'all') {
          const lastIndex = state.queue.length - 1;
          return {
            currentTrack: state.queue[lastIndex],
            currentQueueIndex: lastIndex,
            currentTime: 0
          };
        }
        return {};
      }),
      
      setShuffle: (shuffle) => set({ shuffle }),
      
      setRepeat: (repeat) => set({ repeat }),
      
      // Audio playback actions
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      
      setCurrentTime: (time) => set({ currentTime: time }),
      
      setDuration: (duration) => set({ duration: duration }),
      
      setVolume: (volume) => set({ volume: volume }),
      
      togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      toggleTrackSelection: (trackId) => set((state) => {
        const isSelected = state.selectedTracks.includes(trackId);
        return {
          selectedTracks: isSelected 
            ? state.selectedTracks.filter(id => id !== trackId)
            : [...state.selectedTracks, trackId]
        };
      }),
      
      setCurrentScanJob: (jobId) => set({ currentScanJob: jobId }),
      
      setScanProgress: (progress) => set({ scanProgress: progress }),
      
      setLibraryFilters: (filters) => set((state) => ({
        libraryFilters: { ...state.libraryFilters, ...filters }
      })),
      
      resetLibraryFilters: () => set({
        libraryFilters: {
          search: '',
          artist: '',
          album: '',
          hasLyrics: '',
          sortBy: 'title',
          sortOrder: 'ASC'
        }
      })
    }),
    {
      name: 'lyrics-sync-app-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        libraryFilters: state.libraryFilters,
        currentTrack: state.currentTrack,
        queue: state.queue,
        currentQueueIndex: state.currentQueueIndex,
        shuffle: state.shuffle,
        repeat: state.repeat,
        volume: state.volume
      })
    }
  )
);