# Lyrics Sync Web - Backend API

Node.js backend API for the Lyrics Sync Web application.

## Features

- 🔍 Music library scanning with metadata extraction
- 🎵 Track management with PostgreSQL database
- 🎤 Lyrics search and download from LRCLIB
- 📝 Custom lyrics editing and saving
- 📦 Bulk operations with Redis job queue
- 🚀 RESTful API with Express.js

## API Endpoints

### Health Check
- `GET /api/health` - Service health status

### Music Scanning
- `POST /api/scan/start` - Start directory scan
- `GET /api/scan/status/:jobId` - Get scan job status
- `GET /api/scan/stats` - Get library statistics

### Track Management
- `GET /api/tracks` - List tracks (with pagination & filters)
- `GET /api/tracks/:id` - Get single track
- `GET /api/tracks/filters/artists` - Get unique artists
- `GET /api/tracks/filters/albums` - Get albums (optionally by artist)

### Lyrics Operations
- `GET /api/lyrics/search` - Search lyrics by artist/title
- `GET /api/lyrics/track/:id` - Get existing lyrics for track
- `POST /api/lyrics/download` - Download lyrics for single track
- `POST /api/lyrics/save` - Save custom lyrics
- `POST /api/lyrics/bulk-download` - Bulk download lyrics

## Environment Variables

See `.env.example` for required configuration.

## Database Schema

The application creates the following main tables:
- `tracks` - Music file metadata
- `lyrics_jobs` - Processing job status
- `user_settings` - Application configuration
- `lyrics_cache` - Temporary lyrics storage

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm install --production
npm start
```