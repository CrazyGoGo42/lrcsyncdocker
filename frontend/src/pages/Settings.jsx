import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  RestoreFromTrash as ResetIcon,
  Settings as SettingsIcon,
  Folder as FolderIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { getSettings, updateSetting, resetSetting } from '../services/api';
import toast from 'react-hot-toast';
import FolderBrowser from '../components/FolderBrowser';

export default function Settings() {
  const [localSettings, setLocalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery(
    'settings',
    getSettings,
    {
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      staleTime: 0, // Always consider data stale
      cacheTime: 0, // Don't cache the data
      onSuccess: (data) => {
        console.log('Settings loaded:', data);
        console.log('Settings structure:', data?.settings);
        setLocalSettings(data?.settings || {});
      },
      onError: (error) => {
        console.error('Settings loading error:', error);
      }
    }
  );

  const updateMutation = useMutation(
    ({ key, value }) => updateSetting(key, value),
    {
      onSuccess: (data, variables) => {
        toast.success(`Setting "${variables.key}" updated successfully`);
        queryClient.invalidateQueries('settings');
        setHasChanges(false);
      },
      onError: (error, variables) => {
        toast.error(`Failed to update "${variables.key}": ${error.message}`);
      },
    }
  );

  const resetMutation = useMutation(
    (key) => resetSetting(key),
    {
      onSuccess: (data, key) => {
        toast.success(`Setting "${key}" reset to default`);
        queryClient.invalidateQueries('settings');
        setHasChanges(false);
      },
      onError: (error, key) => {
        toast.error(`Failed to reset "${key}": ${error.message}`);
      },
    }
  );

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const promises = [];
    
    for (const [key, setting] of Object.entries(localSettings)) {
      if (settings.settings[key]?.value !== setting.value) {
        promises.push(updateMutation.mutateAsync({ key, value: setting.value }));
      }
    }

    try {
      await Promise.all(promises);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleReset = (key) => {
    resetMutation.mutate(key);
  };

  const renderSettingControl = (key, setting) => {
    const { value, type, description } = setting;

    // Special handling for lyrics storage method
    if (key === 'lyrics.storage_method') {
      return (
        <FormControl fullWidth size="small">
          <InputLabel>Storage Method</InputLabel>
          <Select
            value={value}
            label="Storage Method"
            onChange={(e) => handleSettingChange(key, e.target.value)}
          >
            <MenuItem value="lrc_files">📄 Save as .lrc files</MenuItem>
            <MenuItem value="embedded">🎵 Embed in audio files</MenuItem>
            <MenuItem value="both">📄🎵 Both: .lrc files + embedded</MenuItem>
          </Select>
          <FormHelperText>{description}</FormHelperText>
        </FormControl>
      );
    }

    // Special handling for folder include/exclude settings
    if (key === 'scanner.include_subfolders' || key === 'scanner.exclude_subfolders') {
      const folders = Array.isArray(value) ? value : [];
      const mode = key.includes('include') ? 'include' : 'exclude';
      
      return (
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <FolderBrowser
              title={mode === 'include' ? 'Include Folders' : 'Exclude Folders'}
              selectedPaths={folders}
              onSelectionChange={(selectedPaths) => handleSettingChange(key, selectedPaths)}
              mode={mode}
            />
          </Box>
          
          {/* Show selected folders as chips */}
          {folders.length > 0 && (
            <Box mt={1}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Selected folders ({folders.length}):
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {folders.slice(0, 10).map((folder, index) => (
                  <Chip
                    key={index}
                    label={folder}
                    size="small"
                    variant="outlined"
                    onDelete={() => {
                      const newFolders = folders.filter((_, i) => i !== index);
                      handleSettingChange(key, newFolders);
                    }}
                  />
                ))}
                {folders.length > 10 && (
                  <Chip
                    label={`+${folders.length - 10} more`}
                    size="small"
                    variant="outlined"
                    color="secondary"
                  />
                )}
              </Box>
            </Box>
          )}
          
          <FormHelperText>{description}</FormHelperText>
        </Box>
      );
    }

    switch (type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value}
                onChange={(e) => handleSettingChange(key, e.target.checked)}
                color="primary"
              />
            }
            label={description}
          />
        );
      
      case 'string':
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            helperText={description}
            variant="outlined"
            size="small"
          />
        );
      
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(key, parseFloat(e.target.value))}
            helperText={description}
            variant="outlined"
            size="small"
          />
        );
      
      default:
        return (
          <TextField
            fullWidth
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleSettingChange(key, parsed);
              } catch (error) {
                handleSettingChange(key, e.target.value);
              }
            }}
            helperText={description}
            variant="outlined"
            size="small"
            multiline
            rows={3}
          />
        );
    }
  };

  const groupSettings = (settings) => {
    const groups = {};
    
    console.log('Grouping settings:', settings);
    
    Object.entries(settings).forEach(([key, setting]) => {
      const [category] = key.split('.');
      if (!groups[category]) {
        groups[category] = {};
      }
      groups[category][key] = setting;
    });
    
    console.log('Settings groups:', groups);
    return groups;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ flexGrow: 1, p: { xs: 0, sm: 1, md: 3 } }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load settings: {error.message}
        </Alert>

        {/* System Information fallback */}
        <Paper sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Configuration
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText
                primary="Music Directory"
                secondary="/app/music (mounted from host)"
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemIcon>
                <StorageIcon />
              </ListItemIcon>
              <ListItemText
                primary="Database"
                secondary="PostgreSQL - lyrics_sync database"
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemIcon>
                <CloudIcon />
              </ListItemIcon>
              <ListItemText
                primary="Lyrics Source"
                secondary="LRCLIB.net API for synchronized lyrics"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    );
  }

  const settingsGroups = groupSettings(localSettings);
  
  console.log('Rendering Settings:', { 
    localSettings, 
    settingsGroups, 
    hasSettings: Object.keys(localSettings).length > 0,
    settingsKeys: Object.keys(localSettings)
  });

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 0, sm: 1, md: 3 } }}>
      <Box display="flex" alignItems="center" mb={3}>
        <SettingsIcon sx={{ mr: 2 }} />
        <Typography variant="h4">
          Settings
        </Typography>
      </Box>

      {hasChanges && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={updateMutation.isLoading}
            >
              Save Changes
            </Button>
          }
        >
          You have unsaved changes
        </Alert>
      )}

      <Grid container spacing={3}>
        {Object.entries(settingsGroups).map(([category, categorySettings]) => (
          <Grid item xs={12} md={6} key={category}>
            <Card>
              <CardHeader 
                title={category.charAt(0).toUpperCase() + category.slice(1)}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                {Object.entries(categorySettings).map(([key, setting], index) => (
                  <Box key={key}>
                    {index > 0 && <Divider sx={{ my: 2 }} />}
                    
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2" component="label">
                        {key.split('.').pop().replace(/_/g, ' ')}
                      </Typography>
                      
                      <Button
                        size="small"
                        startIcon={<ResetIcon />}
                        onClick={() => handleReset(key)}
                        disabled={resetMutation.isLoading}
                        sx={{ minWidth: 'auto' }}
                      >
                        Reset
                      </Button>
                    </Box>
                    
                    {renderSettingControl(key, setting)}
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {/* System Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="System Information"
              titleTypographyProps={{ variant: 'h6' }}
            />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Version"
                    secondary="1.0.0"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Music Directory"
                    secondary="/app/music"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CloudIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Lyrics Source"
                    secondary="LRCLIB.net API"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
        {hasChanges && (
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={updateMutation.isLoading}
            sx={{
              borderRadius: '28px',
              px: 3,
              boxShadow: 3,
            }}
          >
            {updateMutation.isLoading ? 'Saving...' : 'Save All Changes'}
          </Button>
        )}
      </Box>
    </Box>
  );
}