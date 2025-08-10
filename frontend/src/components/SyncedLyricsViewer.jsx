import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  useTheme,
  Fade,
  Chip,
} from '@mui/material';
import { MusicNote } from '@mui/icons-material';

// Parse LRC lyrics format
const parseLRC = (lrcContent) => {
  if (!lrcContent) return [];
  
  const lines = lrcContent.split('\n');
  const lyrics = [];
  const metadata = {};
  
  for (const line of lines) {
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      const milliseconds = parseInt(timeMatch[3].padEnd(3, '0'));
      const text = timeMatch[4].trim();
      
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      lyrics.push({
        time: timeInSeconds,
        text: text || '♪',
        id: `${timeInSeconds}-${text}`
      });
    } else {
      // Handle metadata tags like [ti:title] [ar:artist] [al:album]
      const metaMatch = line.match(/\[([a-z]+):(.*)\]/);
      if (metaMatch) {
        metadata[metaMatch[1]] = metaMatch[2];
      }
    }
  }
  
  // Sort by time
  lyrics.sort((a, b) => a.time - b.time);
  
  return { lyrics, metadata };
};

const SyncedLyricsViewer = ({ 
  lyricsContent, 
  currentTime = 0, 
  onSeek, 
  isPlaying = false,
  showTimestamps = false 
}) => {
  const theme = useTheme();
  const [activeLine, setActiveLine] = useState(-1);
  const [nextLine, setNextLine] = useState(-1);

  // Parse lyrics content
  const { lyrics, metadata } = useMemo(() => {
    if (!lyricsContent) return { lyrics: [], metadata: {} };
    
    // Check if it's synced lyrics (contains timestamps)
    if (lyricsContent.includes('[') && lyricsContent.match(/\[\d{2}:\d{2}\.\d{2,3}\]/)) {
      return parseLRC(lyricsContent);
    } else {
      // Plain text lyrics - split by lines
      const lines = lyricsContent.split('\n').filter(line => line.trim());
      return {
        lyrics: lines.map((text, index) => ({
          time: index * 3, // Fake timestamps for plain text
          text: text.trim(),
          id: `plain-${index}`
        })),
        metadata: {}
      };
    }
  }, [lyricsContent]);

  const isSyncedLyrics = useMemo(() => {
    return lyricsContent && lyricsContent.includes('[') && lyricsContent.match(/\[\d{2}:\d{2}\.\d{2,3}\]/);
  }, [lyricsContent]);

  // Find current and next lines based on current time
  useEffect(() => {
    if (!lyrics.length || !isSyncedLyrics) {
      setActiveLine(-1);
      setNextLine(-1);
      return;
    }

    let currentLineIndex = -1;
    let nextLineIndex = -1;

    // Find the current line (last line whose time has passed)
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        currentLineIndex = i;
        break;
      }
    }

    // Find the next line
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime < lyrics[i].time) {
        nextLineIndex = i;
        break;
      }
    }

    setActiveLine(currentLineIndex);
    setNextLine(nextLineIndex);
  }, [currentTime, lyrics, isSyncedLyrics]);

  const handleLineClick = useCallback((lineTime) => {
    if (onSeek && isSyncedLyrics) {
      onSeek(lineTime);
    }
  }, [onSeek, isSyncedLyrics]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  if (!lyricsContent) {
    return (
      <Paper 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          backgroundColor: theme.palette.grey[50],
          border: `1px dashed ${theme.palette.divider}`
        }}
      >
        <MusicNote sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No lyrics available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lyrics will appear here when you select a track with lyrics
        </Typography>
      </Paper>
    );
  }

  if (!lyrics.length) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Unable to parse lyrics content
        </Typography>
      </Paper>
    );
  }

  return (
    <Card elevation={1}>
      <CardContent>
        {/* Metadata display */}
        {Object.keys(metadata).length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {metadata.ti && (
              <Chip label={`Title: ${metadata.ti}`} size="small" variant="outlined" />
            )}
            {metadata.ar && (
              <Chip label={`Artist: ${metadata.ar}`} size="small" variant="outlined" />
            )}
            {metadata.al && (
              <Chip label={`Album: ${metadata.al}`} size="small" variant="outlined" />
            )}
          </Box>
        )}

        {/* Lyrics type indicator */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={isSyncedLyrics ? 'Synchronized Lyrics' : 'Plain Text Lyrics'}
            color={isSyncedLyrics ? 'primary' : 'default'}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Lyrics display */}
        <Box sx={{ 
          maxHeight: '60vh', 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.grey[200],
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.grey[400],
            borderRadius: 4,
            '&:hover': {
              backgroundColor: theme.palette.grey[600],
            }
          }
        }}>
          {lyrics.map((line, index) => {
            const isActive = isSyncedLyrics && index === activeLine;
            const isNext = isSyncedLyrics && index === nextLine;
            const isPast = isSyncedLyrics && index < activeLine;
            
            return (
              <Fade in={true} key={line.id} timeout={300}>
                <Box
                  onClick={() => handleLineClick(line.time)}
                  sx={{
                    p: 1.5,
                    my: 0.5,
                    borderRadius: 1,
                    cursor: isSyncedLyrics ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.3s ease',
                    backgroundColor: isActive 
                      ? theme.palette.primary.main + '20'
                      : isNext
                      ? theme.palette.warning.main + '10'
                      : 'transparent',
                    borderLeft: isActive 
                      ? `4px solid ${theme.palette.primary.main}`
                      : isNext
                      ? `4px solid ${theme.palette.warning.main}`
                      : '4px solid transparent',
                    opacity: isPast && isSyncedLyrics ? 0.6 : 1,
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    '&:hover': isSyncedLyrics ? {
                      backgroundColor: theme.palette.action.hover,
                      transform: 'scale(1.01)',
                    } : {}
                  }}
                >
                  {(showTimestamps && isSyncedLyrics) && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        minWidth: 60,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                      }}
                    >
                      {formatTime(line.time)}
                    </Typography>
                  )}
                  
                  <Typography 
                    variant="body1" 
                    sx={{
                      flex: 1,
                      fontWeight: isActive ? 600 : 400,
                      fontSize: isActive ? '1.1rem' : '1rem',
                      color: isActive 
                        ? theme.palette.primary.main
                        : isPast && isSyncedLyrics
                        ? theme.palette.text.secondary
                        : theme.palette.text.primary,
                      lineHeight: 1.6,
                    }}
                  >
                    {line.text || '♪'}
                  </Typography>
                </Box>
              </Fade>
            );
          })}
        </Box>

        {/* Footer info */}
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" color="text.secondary">
            {lyrics.length} lines • {isSyncedLyrics ? 'Click on lines to seek' : 'Static text display'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SyncedLyricsViewer;