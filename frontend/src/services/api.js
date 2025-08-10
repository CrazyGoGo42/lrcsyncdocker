import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Handle different error types
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout - server may be busy');
    } else if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      
      if (error.response.status >= 500) {
        toast.error(`Server error: ${message}`);
      } else if (error.response.status === 404) {
        toast.error('Resource not found');
      } else if (error.response.status >= 400) {
        toast.error(message);
      }
    } else if (error.request) {
      // Network error
      toast.error('Unable to connect to server');
    } else {
      toast.error('An unexpected error occurred');
    }
    
    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // Health check
  getHealth: () => api.get('/health'),

  // Scanning
  startScan: (directory = null) => api.post('/scan/start', { directory }),
  getScanStatus: (jobId) => api.get(`/scan/status/${jobId}`),
  getScanStats: () => api.get('/scan/stats'),

  // Tracks
  getTracks: (params = {}) => api.get('/tracks', { params }).then(response => response.data),
  getTrack: (id) => api.get(`/tracks/${id}`),
  getArtists: () => api.get('/tracks/filters/artists'),
  getAlbums: (artist = null) => api.get('/tracks/filters/albums', { 
    params: artist ? { artist } : {} 
  }),

  // Lyrics
  searchLyrics: (params) => api.get('/lyrics/search', { params }).then(response => response.data),
  getTrackLyrics: (trackId) => api.get(`/lyrics/track/${trackId}`).then(response => response.data),
  downloadLyrics: (trackId, lyricsId, source = 'lrclib') => 
    api.post('/lyrics/download', { trackId, lyricsId, source }),
  saveLyrics: (trackId, lyrics) => api.post('/lyrics/save', { trackId, lyrics }),
  bulkDownloadLyrics: (trackIds) => api.post('/lyrics/bulk-download', { trackIds }),

  // Job status
  getJobStatus: (jobId) => api.get(`/scan/status/${jobId}`), // Generic job status endpoint
  
  // Settings
  getSettings: () => api.get('/settings').then(response => response.data),
  updateSetting: (key, value) => api.put(`/settings/${key}`, { value }),
  resetSetting: (key) => api.delete(`/settings/${key}`),
  
  // Publishing
  requestChallenge: () => api.post('/publish/request-challenge').then(response => response.data),
  solveChallenge: (challengeData) => api.post('/publish/solve-challenge', challengeData).then(response => response.data),
  publishLyrics: (publishData) => api.post('/publish/lyrics', publishData).then(response => response.data),
  
  // Enhanced lyrics functions
  getLyrics: (trackId) => api.get(`/lyrics/track/${trackId}`).then(response => response.data)
};

// Named exports for easier importing
export const getTracks = apiService.getTracks;
export const getTrack = apiService.getTrack;
export const startScan = apiService.startScan;
export const getScanStatus = apiService.getScanStatus;
export const searchLyrics = apiService.searchLyrics;
export const downloadLyrics = apiService.downloadLyrics;
export const bulkDownloadLyrics = apiService.bulkDownloadLyrics;
export const getSettings = apiService.getSettings;
export const updateSetting = apiService.updateSetting;
export const resetSetting = apiService.resetSetting;
export const getTrackLyrics = apiService.getTrackLyrics;
export const saveLyrics = apiService.saveLyrics;
export const getLyrics = apiService.getLyrics;
export const requestChallenge = apiService.requestChallenge;
export const solveChallenge = apiService.solveChallenge;
export const publishLyrics = apiService.publishLyrics;

export { api, apiService };