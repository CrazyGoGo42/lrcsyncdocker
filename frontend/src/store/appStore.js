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
        libraryFilters: state.libraryFilters
      })
    }
  )
);