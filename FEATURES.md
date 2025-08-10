# Lyrics Sync Web - New Features

## 🎵 Audio Player & Synchronized Lyrics

The web version now includes comprehensive audio playback and lyrics synchronization capabilities that match the desktop LRCGET application.

### Key Features Implemented

#### 1. **Advanced Audio Player**
- Full HTML5 audio playback with Howler.js
- Support for all major audio formats (MP3, FLAC, M4A, AAC, OGG, WAV, WMA)
- Range request support for smooth seeking
- Volume control with mute functionality
- Real-time progress tracking (100ms intervals)
- Proper error handling and loading states

#### 2. **Real-time Synchronized Lyrics Display**
- Automatic LRC format parsing
- Real-time highlighting of current line during playback
- Click-to-seek functionality on synchronized lyrics
- Support for both synced and plain text lyrics
- Smooth animations and transitions
- Metadata display (title, artist, album from LRC)

#### 3. **Advanced Lyrics Editor**
- CodeMirror-based editor with syntax highlighting
- Real-time timestamp insertion at current playback position
- Keyboard shortcuts (Ctrl+T for timestamp, Ctrl+S for save, Ctrl+J for seek)
- Auto-sync mode for continuous timestamp insertion
- LRC format validation with error reporting
- Import/export LRC files
- Preview mode toggle

#### 4. **LRCLIB Publishing Integration**
- Complete proof-of-work challenge solver implementation
- Step-by-step publishing wizard
- Support for both plain and synchronized lyrics
- Challenge solving with progress indication
- Proper error handling for duplicate submissions
- Authentication token management

#### 5. **Now Playing Interface**
- Fullscreen mode for distraction-free listening
- Tabbed interface (Lyrics View / Edit Mode)
- Track information sidebar
- Settings toggles (show timestamps, auto-seek)
- Mobile-responsive design

### Technical Implementation

#### Audio Streaming
- Backend serves audio files with proper CORS headers
- Range request support for seeking
- MIME type detection based on file extensions
- Stream error handling

#### Lyrics Processing
- LRC parser with millisecond precision
- Support for metadata tags ([ti:], [ar:], [al:], etc.)
- Fallback to plain text for non-synchronized lyrics
- Real-time synchronization engine

#### Challenge Solving
- SHA-256 based proof-of-work implementation
- Efficient hash comparison algorithm
- Progress tracking and timeout protection
- Token generation and management

### Usage

1. **Select a track** from your library
2. **Navigate to Now Playing** to start the player
3. **Use the audio controls** to play/pause/seek
4. **Click on synchronized lyrics** to jump to specific timestamps
5. **Switch to Edit mode** to modify lyrics with live timestamps
6. **Publish to LRCLIB** to share your synchronized lyrics

### API Endpoints Added

- `GET /api/tracks/:id/audio` - Stream audio files
- `POST /api/publish/request-challenge` - Request LRCLIB challenge
- `POST /api/publish/solve-challenge` - Solve proof-of-work
- `POST /api/publish/lyrics` - Submit lyrics to LRCLIB
- `GET /api/lyrics/track/:id` - Get track lyrics

### Dependencies Added

- `howler` - Advanced audio library
- `@uiw/react-codemirror` - Code editor component
- `@codemirror/*` - Editor extensions and themes
- `lrc-parser` - LRC format parsing
- `react-audio-player` - Audio player fallback

### Keyboard Shortcuts

- **Ctrl+T** - Add timestamp at current position
- **Ctrl+S** - Save lyrics
- **Ctrl+J** - Seek to current line timestamp
- **Space** - Play/pause (when focused)

## 🚀 Getting Started

The enhanced features are now integrated into the existing web application. Simply:

1. Start the application with `docker-compose up -d`
2. Scan your music library
3. Navigate to "Now Playing" from the sidebar
4. Select a track and start enjoying synchronized lyrics!

## 🔧 Configuration

New settings available:
- Auto-sync timestamps during editing
- Show/hide timestamps in lyrics view
- Auto-seek when clicking lyrics lines
- LRCLIB publishing preferences

---

**The web version now provides feature parity with the desktop LRCGET application while maintaining the convenience of browser-based access!**