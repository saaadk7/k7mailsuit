import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Divider, 
  TextField, Switch, FormControlLabel, Button, 
  Grid, Snackbar, Alert, Card, CardContent
} from '@mui/material';

const Options = () => {
  const [settings, setSettings] = useState({
    apiUrl: '',
    trackEmailOpens: true,
    trackLinkClicks: true,
    enableNotifications: true,
    notificationSound: true,
    autoFollowUp: false,
    followUpDays: 3,
    followUpTemplate: 'Just following up on my previous email. Did you have a chance to review it?'
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    // Load saved settings from Chrome storage
    chrome.storage.sync.get('mailSuiteSettings', (result) => {
      if (result.mailSuiteSettings) {
        setSettings(result.mailSuiteSettings);
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    const newValue = e.target.type === 'checkbox' ? checked : value;
    
    setSettings({
      ...settings,
      [name]: newValue
    });
  };

  const saveSettings = () => {
    chrome.storage.sync.set({ mailSuiteSettings: settings }, () => {
      setSnackbar({
        open: true,
        message: 'Settings saved successfully!',
        severity: 'success'
      });
    });
  };

  const resetSettings = () => {
    const defaultSettings = {
      apiUrl: '',
      trackEmailOpens: true,
      trackLinkClicks: true,
      enableNotifications: true,
      notificationSound: true,
      autoFollowUp: false,
      followUpDays: 3,
      followUpTemplate: 'Just following up on my previous email. Did you have a chance to review it?'
    };
    
    setSettings(defaultSettings);
    chrome.storage.sync.set({ mailSuiteSettings: defaultSettings }, () => {
      setSnackbar({
        open: true,
        message: 'Settings reset to defaults!',
        severity: 'info'
      });
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        MailSuite Settings
      </Typography>
      <Divider sx={{ mb: 4 }} />
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Server Configuration
        </Typography>
        <Box sx={{ mb: 3 }}>
          <TextField
            label="API Server URL"
            name="apiUrl"
            value={settings.apiUrl}
            onChange={handleChange}
            fullWidth
            margin="normal"
            helperText="Enter the URL of your MailSuite backend server"
          />
        </Box>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Tracking Settings
        </Typography>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.trackEmailOpens}
                onChange={handleChange}
                name="trackEmailOpens"
                color="primary"
              />
            }
            label="Track Email Opens"
          />
          <Typography variant="body2" color="textSecondary" sx={{ ml: 4 }}>
            Insert tracking pixels to detect when emails are opened
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.trackLinkClicks}
                onChange={handleChange}
                name="trackLinkClicks"
                color="primary"
              />
            }
            label="Track Link Clicks"
          />
          <Typography variant="body2" color="textSecondary" sx={{ ml: 4 }}>
            Convert links in emails to track when they are clicked
          </Typography>
        </Box>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Notification Settings
        </Typography>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableNotifications}
                onChange={handleChange}
                name="enableNotifications"
                color="primary"
              />
            }
            label="Enable Notifications"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notificationSound}
                onChange={handleChange}
                name="notificationSound"
                color="primary"
                disabled={!settings.enableNotifications}
              />
            }
            label="Play Notification Sound"
          />
        </Box>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Follow-up Settings
        </Typography>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoFollowUp}
                onChange={handleChange}
                name="autoFollowUp"
                color="primary"
              />
            }
            label="Enable Automatic Follow-ups"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Follow-up After (days)"
            name="followUpDays"
            type="number"
            value={settings.followUpDays}
            onChange={handleChange}
            disabled={!settings.autoFollowUp}
            InputProps={{ inputProps: { min: 1, max: 30 } }}
            sx={{ width: '200px' }}
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Default Follow-up Template"
            name="followUpTemplate"
            value={settings.followUpTemplate}
            onChange={handleChange}
            multiline
            rows={4}
            fullWidth
            disabled={!settings.autoFollowUp}
          />
        </Box>
      </Paper>
      
      <Grid container spacing={2} justifyContent="flex-end">
        <Grid item>
          <Button variant="outlined" color="secondary" onClick={resetSettings}>
            Reset to Defaults
          </Button>
        </Grid>
        <Grid item>
          <Button variant="contained" color="primary" onClick={saveSettings}>
            Save Settings
          </Button>
        </Grid>
      </Grid>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Options;
