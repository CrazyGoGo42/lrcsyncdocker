# 🎵 Lyrics Sync Web

A modern, web-based music lyrics synchronization application that brings the power of desktop lyrics managers to your browser. Built as a web alternative to LRCGET/LRCLIB desktop applications.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)

## ✨ Features

### 🎯 Core Functionality
- **Music Library Management** - Scan and organize your music collection
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
- **Docker Compose Setup** - One-command deployment
- **PostgreSQL Database** - Reliable music metadata storage
- **Redis Caching** - Fast performance and job queuing
- **RESTful API** - Well-structured backend architecture
- **React Frontend** - Modern, component-based UI

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- At least 2GB RAM
- Music files directory

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lyrics-sync-web.git
   cd lyrics-sync-web
   ```

2. **Configure your music directory**
   Edit `docker-compose.yml` and update the music volume path:
   ```yaml
   volumes:
     - /your/music/path:/app/music  # Update this path
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web Interface: http://localhost:3000
   - API: http://localhost:5000

### First Steps
1. **Scan your music** - Go to Scanner page and scan your music directory
2. **Browse library** - Check your tracks in the Library page  
3. **Download lyrics** - Select tracks and download lyrics in bulk
4. **Edit lyrics** - Use the built-in editor to fine-tune synchronized lyrics

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Music files in a local directory (MP3, FLAC, M4A, etc.)

### Configuration

1. **Set your music directory:**
   ```bash
   cp .env.example .env
   # Edit .env and set MUSIC_DIRECTORY to your music folder path
   ```

2. **Update docker-compose.yml:**
   ```yaml
   backend:
     volumes:
       - /path/to/your/music:/app/music:ro  # Change this path
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Verify services are running:**
   ```bash
   docker-compose ps
   ```

### First Usage

1. Open http://localhost:3000
2. Go to Scanner tab and click "Start Scan" to index your music
3. Once scanning completes, visit Library to browse your tracks
4. Select tracks without lyrics and use "Download Lyrics" for bulk processing
5. Individual tracks can be edited manually if needed

## Troubleshooting

### Music files not found
- Ensure the music directory path is correct in docker-compose.yml
- Check that the Docker container has read access to your music folder
- Verify supported file formats: MP3, FLAC, M4A, AAC, OGG, WAV, WMA

### Database connection issues
- Check that PostgreSQL container is running: `docker-compose ps`
- View logs: `docker-compose logs db`
- Database will auto-create tables on first run

### Lyrics not downloading
- Verify internet connection for LRCLIB API access
- Check backend logs: `docker-compose logs backend`
- Some tracks may not have lyrics available in the database

### Performance issues
- Large music libraries (10k+ tracks) may take time to scan initially
- Consider limiting concurrent operations in bulk mode
- Monitor Docker resource usage: `docker stats`

## Development

See individual service README files:
- [Backend API](./backend/README.md)
- [Frontend App](./frontend/README.md)

## License

MIT License