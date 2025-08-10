import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Collapse,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

// Tree node component for individual folders
const FolderTreeNode = ({ 
  folder, 
  selectedFolders, 
  onToggle, 
  expandedFolders, 
  onExpandToggle,
  level = 0 
}) => {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedFolders.has(folder.path);
  const isSelected = selectedFolders.has(folder.path);
  
  // Check if all children are selected (for indeterminate state)
  const childrenSelected = hasChildren 
    ? folder.children.filter(child => selectedFolders.has(child.path)).length
    : 0;
  const isIndeterminate = hasChildren && childrenSelected > 0 && childrenSelected < folder.children.length;

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggle(folder.path, folder.children || []);
  };

  const handleExpand = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      onExpandToggle(folder.path);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          ml: level * 3,
          py: 0.5,
          '&:hover': { backgroundColor: 'action.hover' },
          borderRadius: 1
        }}
      >
        {/* Expand/collapse button */}
        <IconButton
          size="small"
          onClick={handleExpand}
          sx={{ 
            mr: 1, 
            visibility: hasChildren ? 'visible' : 'hidden',
            width: 24,
            height: 24
          }}
        >
          {hasChildren && isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        </IconButton>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpenIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
        ) : (
          <FolderIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
        )}

        {/* Checkbox and folder name */}
        <FormControlLabel
          control={
            <Checkbox
              checked={isSelected}
              indeterminate={isIndeterminate}
              onChange={handleToggle}
              size="small"
            />
          }
          label={
            <Typography variant="body2" component="span">
              {folder.name}
              {hasChildren && (
                <Typography variant="caption" color="text.secondary" component="span">
                  {' '}({folder.children.length} subfolder{folder.children.length !== 1 ? 's' : ''})
                </Typography>
              )}
            </Typography>
          }
          sx={{ flexGrow: 1, mr: 0 }}
        />
      </Box>

      {/* Children */}
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box>
            {folder.children.map((child) => (
              <FolderTreeNode
                key={child.path}
                folder={child}
                selectedFolders={selectedFolders}
                onToggle={onToggle}
                expandedFolders={expandedFolders}
                onExpandToggle={onExpandToggle}
                level={level + 1}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

// Main folder browser component
const FolderBrowser = ({ 
  title = "Select Folders",
  selectedPaths = [],
  onSelectionChange,
  mode = "include" // "include" or "exclude"
}) => {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFolders, setSelectedFolders] = useState(new Set(selectedPaths));
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Load folder structure when dialog opens
  useEffect(() => {
    if (open) {
      loadFolders();
    }
  }, [open]);

  // Update selected folders when props change
  useEffect(() => {
    setSelectedFolders(new Set(selectedPaths));
  }, [selectedPaths]);

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/scan/folders');
      setFolders(response.data.folders || []);
    } catch (err) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (folderPath, children) => {
    const newSelected = new Set(selectedFolders);
    
    if (selectedFolders.has(folderPath)) {
      // Deselect this folder and all its children
      newSelected.delete(folderPath);
      const removeChildren = (kids) => {
        kids.forEach(child => {
          newSelected.delete(child.path);
          if (child.children) {
            removeChildren(child.children);
          }
        });
      };
      removeChildren(children);
    } else {
      // Select this folder and all its children
      newSelected.add(folderPath);
      const addChildren = (kids) => {
        kids.forEach(child => {
          newSelected.add(child.path);
          if (child.children) {
            addChildren(child.children);
          }
        });
      };
      addChildren(children);
    }
    
    setSelectedFolders(newSelected);
  };

  const handleExpandToggle = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (expandedFolders.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSave = () => {
    onSelectionChange(Array.from(selectedFolders));
    setOpen(false);
  };

  const handleCancel = () => {
    setSelectedFolders(new Set(selectedPaths)); // Reset to original selection
    setOpen(false);
  };

  const handleExpandAll = () => {
    const allPaths = new Set();
    const addAllPaths = (folders) => {
      folders.forEach(folder => {
        if (folder.children && folder.children.length > 0) {
          allPaths.add(folder.path);
          addAllPaths(folder.children);
        }
      });
    };
    addAllPaths(folders);
    setExpandedFolders(allPaths);
  };

  const handleCollapseAll = () => {
    setExpandedFolders(new Set());
  };

  const selectedCount = selectedFolders.size;

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outlined"
        startIcon={<FolderIcon />}
        onClick={() => setOpen(true)}
        sx={{ mr: 1 }}
      >
        Browse Folders {selectedCount > 0 && `(${selectedCount} selected)`}
      </Button>

      {/* Folder browser dialog */}
      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {title} - {mode === "include" ? "Include" : "Exclude"} Folders
            </Typography>
            <Box>
              <Button size="small" onClick={handleExpandAll} sx={{ mr: 1 }}>
                Expand All
              </Button>
              <Button size="small" onClick={handleCollapseAll}>
                Collapse All
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              <Button onClick={loadFolders} size="small" sx={{ ml: 1 }}>
                Retry
              </Button>
            </Alert>
          ) : folders.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No subfolders found in music directory
            </Typography>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select folders to {mode}. Selecting a parent folder will automatically select all its subfolders.
              </Typography>
              
              {folders.map((folder) => (
                <FolderTreeNode
                  key={folder.path}
                  folder={folder}
                  selectedFolders={selectedFolders}
                  onToggle={handleToggle}
                  expandedFolders={expandedFolders}
                  onExpandToggle={handleExpandToggle}
                />
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {selectedCount} folder{selectedCount !== 1 ? 's' : ''} selected
            </Typography>
            <Box>
              <Button onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
                Apply Selection
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FolderBrowser;