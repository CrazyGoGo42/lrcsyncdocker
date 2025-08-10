# 🎵 Lyrics Sync Web

A modern, web-based music lyrics synchronization application that brings the power of desktop lyrics managers to your browser. Built as a web alternative to LRCGET/LRCLIB desktop applications with robust metadata extraction and XML sidecar support.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)

## ✨ Features

### 🎯 Core Functionality
- **Intelligent Music Library Management** - Scan and organize your music collection
- **Advanced Metadata Extraction** - XML sidecar files, ID3 tags, directory parsing
- **Multi-format Support** - MP3, FLAC, M4A, AAC, OGG, WAV, WMA
- **Lyrics Search & Download** - Fetch synchronized lyrics from LRCLIB API
- **Real-time Lyrics Editor** - Edit lyrics with time-synchronized playback
- **Bulk Operations** - Download lyrics for multiple tracks at once
- **Dual Storage Options** - Save as .lrc files or embed into audio files

### 🎨 Modern UI/UX
- **Dark/Light/Auto Themes** - Automatically adapts to system preferences
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Live progress tracking and notifications
- **Elegant Interface** - Clean, professional Material-UI design

### 🔧 Technical Features
- **Docker Compose Deployment** - One-command setup with all services
- **PostgreSQL Database** - Reliable music metadata storage
- **Redis Caching** - Fast performance and job queuing
- **RESTful API** - Well-structured backend architecture
- **React Frontend** - Modern, component-based UI
- **Audio Streaming** - Built-in FLAC/MP3 playback with range requests

## 🚀 Quick Deployment

### Prerequisites
- **Docker & Docker Compose** (v2.0+)
- **Minimum 2GB RAM**
- **Music collection** with supported formats

### One-Command Setup

1. **Clone and configure**
   ```bash
   git clone https://github.com/yourusername/lyrics-sync-web.git
   cd lyrics-sync-web
   ```

2. **Set your music directory**
   Edit `docker-compose.yml` line 39:
   ```yaml
   volumes:
     - /path/to/your/music:/app/music  # ← Update this path
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker compose up -d
   ```

4. **Access your application**
   - **Web Interface**: http://localhost:3000
   - **API Endpoint**: http://localhost:5000/api

### Initial Setup

1. **🔍 Scan Music Library**
   - Navigate to **Scanner** tab
   - Click **"Start Scan"** to index your music collection
   - Wait for completion (shows track count when done)

2. **📚 Browse Your Library**  
   - Visit **Library** tab to see your tracks
   - Verify metadata extraction (title, artist, album)

3. **🎵 Download Lyrics**
   - Select tracks without lyrics
   - Use **"Download Lyrics"** for bulk processing
   - Individual tracks can be edited manually if needed

## 🎯 Metadata Extraction Features

This application uses a sophisticated **4-tier metadata extraction system**:

### 1. XML Sidecar Files (Primary)
- Reads `.xml` files next to audio files
- Format: `<song><title>...</title><performingartist>...</performingartist></song>`
- Most reliable source for clean metadata

### 2. Audio Metadata (Secondary)
- Uses `music-metadata` library for native tag reading
- Handles MP3 ID3, FLAC blocks, M4A atoms
- Extracts duration, bitrate, and technical info

### 3. ID3 Tags (Fallback)
- Uses `node-id3` for embedded ID3 tags
- Works with FLAC files that have embedded ID3
- Handles problematic "Invalid FLAC preamble" files

### 4. Directory Structure (Final)
- Album: Extracted from parent directory (e.g., "Voyage (2021)" → "Voyage")
- Year: Parsed from directory names (e.g., "(2021)" → 2021)
- Track numbers: From filenames (e.g., "01 - Title.flac" → track 1)
- Multi-disc support: Handles "Digital Media 01", "CD 1", etc.

## 📁 Supported File Organization

The scanner intelligently handles various directory structures:

```
📁 Music/
├── 📁 Voyage (2021)/           # Album + Year extraction
│   ├── 01 - Song Title.flac    # Track number + Title
│   ├── 01 - Song Title.xml     # Metadata sidecar
│   └── ...
├── 📁 Thank You for the Music (1994)/
│   ├── 📁 Digital Media 01/    # Multi-disc album
│   │   ├── 01 - Track.flac
│   │   └── 01 - Track.xml
│   └── 📁 Digital Media 02/
└── ...
```

## 🐳 Docker Services & Storage

The application consists of 4 services with persistent storage:

| Service | Port | Purpose |
|---------|------|---------|
| **frontend** | 3000 | React web interface |
| **backend** | 5000 | Node.js API server |
| **db** | 5432 | PostgreSQL database |
| **redis** | 6379 | Cache & job queue |

### 📁 Volume Mounts

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `./music` → `/app/music` | **Music library** | Your audio files and metadata |
| `./cache` → `/app/cache` | **Performance cache** | Metadata, artwork, and temporary files |
| `postgres_data` | **Database storage** | PostgreSQL data files |
| `redis_data` | **Redis storage** | Cache and job queue data |

## 🚀 Cache System

The application includes an intelligent **4-tier caching system** for optimal performance:

### 📊 Cache Types

1. **Metadata Cache** (`cache/metadata/`)
   - Stores extracted track metadata to avoid re-processing
   - Invalidated when files are modified (based on size + mtime)
   - Dramatically speeds up subsequent scans

2. **Artwork Cache** (`cache/artwork/`)
   - Cached album artwork images
   - Deduplicates identical artwork across tracks
   - Serves artwork via `/cache/artwork/` endpoint

3. **Configuration Cache** (`cache/config/`)
   - User preferences and settings
   - Scanner configuration
   - Persists across container restarts

4. **Temporary Files** (`cache/temp/`)
   - Processing temporary files
   - Auto-cleanup after 24 hours
   - Download temporary files

### 🎯 Performance Benefits

- **🚀 Scanner Speed**: 5-10x faster rescans (cached metadata)
- **💾 Storage Efficiency**: Deduplicated artwork storage
- **⚡ Response Time**: Faster UI loading with cached data
- **🔄 Persistence**: Settings survive container restarts

## 🔧 Configuration

### Environment Variables

Backend supports these environment variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://lyrics_user:lyrics_password@db:5432/lyrics_sync
REDIS_URL=redis://redis:6379
PORT=5000
MUSIC_PATH=/app/music
```

### Scanner Settings

Configurable via web interface (Settings tab):

- **Max Depth**: Directory traversal depth limit
- **Include/Exclude Folders**: Fine-grained folder filtering
- **File Format Support**: Enable/disable specific audio formats

## 📊 API Endpoints

Core API routes available at `http://localhost:5000/api`:

### 🎵 Music & Lyrics
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service status check |
| `/scan/start` | POST | Start music library scan |
| `/tracks` | GET | List tracks with pagination |
| `/tracks/:id/audio` | GET | Stream audio file |
| `/lyrics/search` | GET | Search LRCLIB for lyrics |
| `/lyrics/download` | POST | Download and save lyrics |

### 🗂️ Cache Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cache/stats` | GET | Get cache statistics and sizes |
| `/cache/clear/:type` | DELETE | Clear cache (all/metadata/artwork/config/temp) |
| `/cache/cleanup-temp` | POST | Clean up old temporary files |

### 🖼️ Static Assets
| Endpoint | Purpose |
|----------|---------|
| `/cache/artwork/:filename` | Serve cached album artwork |
| `/cache/:type/:filename` | Serve cached files |

## 🛠️ Troubleshooting

### Music Files Not Detected
- **Check path**: Ensure docker-compose.yml has correct music directory path
- **Permissions**: Container needs read access to music files
- **Formats**: Only MP3, FLAC, M4A, AAC, OGG, WAV, WMA supported
- **Scanner logs**: Check `docker compose logs backend` for scan details

### Metadata Shows "Unknown"
- **XML files**: Check for corresponding `.xml` files with metadata
- **Directory names**: Ensure proper album folder naming (e.g., "Album (Year)")
- **File names**: Use format "01 - Title.extension" for track numbers
- **Rescan**: Clear database and rescan if changing file organization

### Database Connection Issues
```bash
# Check service status
docker compose ps

# View database logs
docker compose logs db

# Reset database (caution: removes all data)
docker compose down -v
docker compose up -d
```

### Cache Issues
```bash
# View cache statistics
curl http://localhost:5000/api/cache/stats

# Clear specific cache type
curl -X DELETE http://localhost:5000/api/cache/clear/metadata

# Clear all cache
curl -X DELETE http://localhost:5000/api/cache/clear/all

# Cleanup old temporary files
curl -X POST http://localhost:5000/api/cache/cleanup-temp
```

### Performance Optimization
- **Large libraries**: Initial scan of 10k+ tracks may take time
- **Memory**: Increase Docker memory limit for huge collections
- **Concurrent operations**: Bulk download uses controlled batching
- **Cache warming**: First scan creates cache, subsequent scans are 5-10x faster
- **Cache maintenance**: Periodically clear cache if experiencing issues

### Clean Restart
```bash
# Stop all services
docker compose down

# Remove volumes (loses database data)
docker compose down -v

# Remove cache only (keeps database)
rm -rf cache/*

# Rebuild and restart
docker compose up -d --build
```

## 🔄 Updates & Maintenance

### Updating the Application
```bash
git pull origin main
docker compose down
docker compose up -d --build
```

### Backup Your Data
```bash
# Backup database
docker compose exec db pg_dump -U lyrics_user lyrics_sync > backup.sql

# Backup configuration
cp docker-compose.yml docker-compose.yml.backup
```

## 🎼 Web Interface Overview

### 📊 Dashboard
- **Library statistics** (total tracks, lyrics coverage)
- **Recent scan results**
- **Quick action buttons**

### 🔍 Scanner
- **Directory scanning** with real-time progress
- **Scan statistics** and error reporting
- **Settings configuration**

### 📚 Library
- **Sortable track listing** with search/filter
- **Bulk lyrics download** with progress tracking
- **Individual track editing**

### ⚙️ Settings
- **Theme selection** (Dark/Light/Auto)
- **Scanner configuration**
- **LRCLIB API settings**

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**🎵 Enjoy your perfectly synchronized lyrics collection!**