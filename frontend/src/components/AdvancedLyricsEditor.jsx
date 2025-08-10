import React, { useState, useEffect, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
  Box,
  Paper,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Tooltip,
  Card,
  CardContent,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Add as AddIcon,
  Timer as TimerIcon,
  Code as CodeIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

// Custom CodeMirror extension for LRC syntax highlighting
const lrcLanguage = () => {
  return EditorView.theme({
    '.lrc-timestamp': {
      color: '#0969da',
      fontWeight: 'bold',
    },
    '.lrc-metadata': {
      color: '#6f42c1',
      fontStyle: 'italic',
    },
    '.lrc-lyrics': {
      color: '#24292f',
    },
  });
};

const AdvancedLyricsEditor = ({ 
  track, 
  lyrics, 
  onSave, 
  onCancel,
  currentTime = 0,
  isPlaying = false,
  onSeek 
}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);
  
  const [editorContent, setEditorContent] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(theme.palette.mode === 'dark');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTimestampDialog, setShowTimestampDialog] = useState(false);
  const [pendingTimestamp, setPendingTimestamp] = useState('');
  const [selectedLineNumber, setSelectedLineNumber] = useState(null);
  const [autoSync, setAutoSync] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (lyrics) {
      setEditorContent(lyrics);
    } else {
      // Initialize with template
      const template = `[ti:${track?.title || 'Title'}]
[ar:${track?.artist || 'Artist'}]
[al:${track?.album || 'Album'}]
[length:${track?.duration ? formatTime(track.duration) : '00:00'}]

[00:00.00]Click "Add Timestamp" to start adding synchronized lyrics
[00:05.00]Use the audio player to navigate and add timestamps
[00:10.00]Each line should have a timestamp in [mm:ss.xx] format`;
      setEditorContent(template);
    }
  }, [lyrics, track]);

  // Auto-sync timestamp insertion
  useEffect(() => {
    if (autoSync && isPlaying && currentTime > 0) {
      const timestamp = formatTimeToLRC(currentTime);
      // Auto-insert timestamp if not already present
      // This is a simplified implementation - can be enhanced
    }
  }, [currentTime, autoSync, isPlaying]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeToLRC = (seconds) => {
    if (!seconds || isNaN(seconds)) return '[00:00.00]';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]`;
  };

  const parseLRCTime = (timeStr) => {
    const match = timeStr.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
    if (!match) return 0;
    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    const ms = parseInt(match[3]);
    return minutes * 60 + seconds + ms / 100;
  };

  const handleAddTimestamp = useCallback(() => {
    const timestamp = formatTimeToLRC(currentTime);
    setPendingTimestamp(timestamp);
    setShowTimestampDialog(true);
  }, [currentTime]);

  const handleInsertTimestamp = useCallback(() => {
    if (!editorRef.current) return;
    
    const view = editorRef.current.view;
    if (!view) return;

    const cursor = view.state.selection.main.head;
    const line = view.state.doc.lineAt(cursor);
    const lineStart = line.from;
    
    // Insert timestamp at the beginning of the current line
    const transaction = view.state.update({
      changes: {
        from: lineStart,
        to: lineStart,
        insert: pendingTimestamp
      }
    });
    
    view.dispatch(transaction);
    setShowTimestampDialog(false);
    setPendingTimestamp('');
  }, [pendingTimestamp]);

  const handleSyncToCurrentTime = useCallback(() => {
    if (!editorRef.current) return;
    
    const view = editorRef.current.view;
    if (!view) return;

    const cursor = view.state.selection.main.head;
    const line = view.state.doc.lineAt(cursor);
    const lineText = line.text;
    
    // Replace existing timestamp or add new one
    const newTimestamp = formatTimeToLRC(currentTime);
    const timestampRegex = /^\[(\d{2}):(\d{2})\.(\d{2})\]/;
    
    let newLineText;
    if (timestampRegex.test(lineText)) {
      newLineText = lineText.replace(timestampRegex, newTimestamp);
    } else {
      newLineText = newTimestamp + lineText;
    }
    
    const transaction = view.state.update({
      changes: {
        from: line.from,
        to: line.to,
        insert: newLineText
      }
    });
    
    view.dispatch(transaction);
  }, [currentTime]);

  const handleSeekToLine = useCallback(() => {
    if (!editorRef.current || !onSeek) return;
    
    const view = editorRef.current.view;
    if (!view) return;

    const cursor = view.state.selection.main.head;
    const line = view.state.doc.lineAt(cursor);
    const lineText = line.text;
    
    const timestampMatch = lineText.match(/^\[(\d{2}):(\d{2})\.(\d{2})\]/);
    if (timestampMatch) {
      const time = parseLRCTime(timestampMatch[0]);
      onSeek(time);
    }
  }, [onSeek]);

  const validateLRC = useCallback((content) => {
    const lines = content.split('\n');
    const errors = [];
    const warnings = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Check for malformed timestamps
      if (trimmedLine.includes('[') && trimmedLine.includes(']')) {
        const timestampMatch = trimmedLine.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
        if (trimmedLine.startsWith('[') && !timestampMatch) {
          const metadataMatch = trimmedLine.match(/\[[a-z]+:.*\]/);
          if (!metadataMatch) {
            errors.push(`Line ${index + 1}: Invalid timestamp format`);
          }
        }
      }
    });
    
    return { errors, warnings };
  }, []);

  const saveMutation = useMutation(
    (lyricsData) => {
      // Save lyrics - implement your save API call here
      return onSave?.(lyricsData);
    },
    {
      onSuccess: () => {
        toast.success('Lyrics saved successfully!');
        queryClient.invalidateQueries(['lyrics', track?.id]);
      },
      onError: (error) => {
        toast.error(`Failed to save lyrics: ${error.message}`);
      },
    }
  );

  const handleSave = useCallback(() => {
    const { errors } = validateLRC(editorContent);
    
    if (errors.length > 0) {
      toast.error(`Cannot save: ${errors.length} errors found`);
      return;
    }
    
    saveMutation.mutate({
      trackId: track?.id,
      lyrics: editorContent
    });
  }, [editorContent, track?.id, saveMutation, validateLRC]);

  const handleExport = useCallback(() => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track?.artist || 'Unknown'} - ${track?.title || 'Unknown'}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editorContent, track]);

  const handleImport = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditorContent(e.target.result);
      toast.success('LRC file imported successfully!');
    };
    reader.readAsText(file);
  }, []);

  const editorExtensions = [
    lrcLanguage(),
    keymap.of([
      {
        key: 'Ctrl-s',
        run: () => {
          handleSave();
          return true;
        },
      },
      {
        key: 'Ctrl-t',
        run: () => {
          handleAddTimestamp();
          return true;
        },
      },
      {
        key: 'Ctrl-j',
        run: () => {
          handleSeekToLine();
          return true;
        },
      },
    ]),
    EditorView.lineWrapping,
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Lyrics Editor - {track?.title || 'Unknown Track'}
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                size="small"
              />
            }
            label="Auto-sync"
            sx={{ mr: 2 }}
          />
          
          <Tooltip title="Add timestamp at current time (Ctrl+T)">
            <IconButton onClick={handleAddTimestamp} size="small">
              <AddIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Sync current line to playback time">
            <IconButton onClick={handleSyncToCurrentTime} size="small">
              <TimerIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Seek to current line timestamp (Ctrl+J)">
            <IconButton onClick={handleSeekToLine} size="small">
              <PlayIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Toggle preview mode">
            <IconButton 
              onClick={() => setIsPreviewMode(!isPreviewMode)} 
              size="small"
              color={isPreviewMode ? 'primary' : 'default'}
            >
              {isPreviewMode ? <EditIcon /> : <PreviewIcon />}
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <input
            accept=".lrc,.txt"
            style={{ display: 'none' }}
            id="import-lrc-file"
            type="file"
            onChange={handleImport}
          />
          <label htmlFor="import-lrc-file">
            <Tooltip title="Import LRC file">
              <IconButton component="span" size="small">
                <UploadIcon />
              </IconButton>
            </Tooltip>
          </label>
          
          <Tooltip title="Export as LRC file">
            <IconButton onClick={handleExport} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Save lyrics (Ctrl+S)">
            <IconButton 
              onClick={handleSave} 
              size="small"
              color="primary"
              disabled={saveMutation.isLoading}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Paper>

      {/* Editor Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {isPreviewMode ? (
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Preview Mode
              </Typography>
              {/* Show parsed lyrics preview here */}
              <Box sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                {editorContent}
              </Box>
            </CardContent>
          </Card>
        ) : (
          <CodeMirror
            ref={editorRef}
            value={editorContent}
            onChange={setEditorContent}
            theme={isDarkMode ? oneDark : undefined}
            extensions={editorExtensions}
            style={{ height: '100%' }}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightSelectionMatches: true,
              searchKeymap: true,
            }}
          />
        )}
      </Box>

      {/* Status Bar */}
      <Paper elevation={1}>
        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`Current Time: ${formatTimeToLRC(currentTime)}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={isPlaying ? 'Playing' : 'Paused'}
            size="small"
            color={isPlaying ? 'success' : 'default'}
            variant="outlined"
          />
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Ctrl+T: Add timestamp • Ctrl+S: Save • Ctrl+J: Seek to line
          </Typography>
        </Box>
      </Paper>

      {/* Add Timestamp Dialog */}
      <Dialog open={showTimestampDialog} onClose={() => setShowTimestampDialog(false)}>
        <DialogTitle>Add Timestamp</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Timestamp"
            value={pendingTimestamp}
            onChange={(e) => setPendingTimestamp(e.target.value)}
            placeholder="[00:00.00]"
            helperText="Format: [mm:ss.xx]"
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTimestampDialog(false)}>Cancel</Button>
          <Button onClick={handleInsertTimestamp} variant="contained">
            Insert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedLyricsEditor;