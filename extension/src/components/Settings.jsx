import React, { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemIcon,
  Switch, Divider, Button, TextField, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import DeleteIcon from '@mui/icons-material/Delete';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    action: null
  });

  useEffect(() => {
    // Fetch user info and settings
    fetchUserInfo();
  }, []);

  const fetchUserInfo = () => {
    setLoading(true);
    // In a real implementation, this would fetch from Chrome storage or your API
    setTimeout(() => {
      const mockUserInfo = {
        email: 'user@example.com',
        name: 'Demo User',
        accountType: 'Free',
        trackingEnabled: true,
        dataRetentionDays: 30,
        syncEnabled: true
      };
      
      setUserInfo(mockUserInfo);
      setLoading(false);
    }, 1000);
  };

  const handleToggleChange = (setting) => {
    setUserInfo({
      ...userInfo,
      [setting]: !userInfo[setting]
    });

    // In a real implementation, save to Chrome storage
    chrome.storage.sync.set({ [setting]: !userInfo[setting] });
  };

  const handleDataRetentionChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 365) {
      setUserInfo({
        ...userInfo,
        dataRetentionDays: value
      });

      // In a real implementation, save to Chrome storage
      chrome.storage.sync.set({ dataRetentionDays: value });
    }
  };

  const handleLogout = () => {
    setConfirmDialog({
      open: true,
      title: 'Confirm Logout',
      content: 'Are you sure you want to log out? You will need to re-authenticate to use MailSuite.',
      action: () => {
        // Clear auth token
        chrome.storage.local.remove(['authToken'], () => {
          // Reload extension
          chrome.runtime.reload();
        });
      }
    });
  };

  const handleClearData = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear All Data',
      content: 'This will delete all your tracking data and settings. This action cannot be undone. Are you sure?',
      action: () => {
        // Clear all data
        chrome.storage.local.clear(() => {
          chrome.storage.sync.clear(() => {
            // Reload extension
            chrome.runtime.reload();
          });
        });
      }
    });
  };

  const handleCloseDialog = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action) {
      confirmDialog.action();
    }
    handleCloseDialog();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Settings</Typography>
      
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {/* Account Section */}
        <ListItem>
          <ListItemIcon>
            <AccountCircleIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Account" 
            secondary={userInfo.email} 
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Account Type" 
            secondary={userInfo.accountType} 
            sx={{ pl: 9 }}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary={<Button color="primary" onClick={handleLogout}>Logout</Button>} 
            sx={{ pl: 9 }}
          />
        </ListItem>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Tracking Settings */}
        <ListItem>
          <ListItemIcon>
            <SecurityIcon />
          </ListItemIcon>
          <ListItemText primary="Email Tracking" />
          <Switch
            edge="end"
            checked={userInfo.trackingEnabled}
            onChange={() => handleToggleChange('trackingEnabled')}
          />
        </ListItem>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Data Retention */}
        <ListItem>
          <ListItemIcon>
            <StorageIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Data Retention" 
            secondary="How long to keep your tracking data"
          />
        </ListItem>
        <ListItem>
          <Box sx={{ pl: 9, width: '100%', display: 'flex', alignItems: 'center' }}>
            <TextField
              label="Days"
              type="number"
              value={userInfo.dataRetentionDays}
              onChange={handleDataRetentionChange}
              InputProps={{ inputProps: { min: 1, max: 365 } }}
              size="small"
              sx={{ width: '100px' }}
            />
            <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
              days (1-365)
            </Typography>
          </Box>
        </ListItem>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Sync Settings */}
        <ListItem>
          <ListItemIcon>
            <CloudSyncIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Sync Data" 
            secondary="Sync your data across devices"
          />
          <Switch
            edge="end"
            checked={userInfo.syncEnabled}
            onChange={() => handleToggleChange('syncEnabled')}
          />
        </ListItem>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Clear Data */}
        <ListItem>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText 
            primary={
              <Button color="error" onClick={handleClearData}>
                Clear All Data
              </Button>
            } 
            secondary="Delete all your tracking data and settings"
          />
        </ListItem>
      </List>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseDialog}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmAction} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
