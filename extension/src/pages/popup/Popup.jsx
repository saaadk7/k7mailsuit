import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Tabs, Tab, AppBar } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import AnalyticsIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';

// Import components (to be created later)
import EmailTracker from '../../components/EmailTracker';
import Analytics from '../../components/Analytics';
import Settings from '../../components/Settings';

const Popup = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated with Gmail API
    chrome.storage.local.get(['authToken'], (result) => {
      if (result.authToken) {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    });
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAuthenticate = () => {
    // Will implement OAuth authentication flow
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      
      if (token) {
        chrome.storage.local.set({ authToken: token }, () => {
          setIsAuthenticated(true);
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', width: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, height: '300px', width: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Welcome to MailSuite
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
          Please authenticate with your Gmail account to use MailSuite's features.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleAuthenticate}
          startIcon={<EmailIcon />}
        >
          Connect Gmail Account
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '400px', height: '500px' }}>
      <AppBar position="static" color="default">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<EmailIcon />} label="Email" />
          <Tab icon={<AnalyticsIcon />} label="Analytics" />
          <Tab icon={<SettingsIcon />} label="Settings" />
        </Tabs>
      </AppBar>
      <Box sx={{ p: 2 }}>
        {activeTab === 0 && <EmailTracker />}
        {activeTab === 1 && <Analytics />}
        {activeTab === 2 && <Settings />}
      </Box>
    </Box>
  );
};

export default Popup;
