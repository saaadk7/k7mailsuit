import React, { useState } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Button, 
  Paper, Container, TextField, CircularProgress,
  Checkbox, FormControlLabel
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { authenticate } from '../../services/gmail.service';

const steps = ['Welcome', 'Connect Gmail', 'Configure Settings', 'Ready'];

const Onboarding = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [settings, setSettings] = useState({
    trackEmailOpens: true,
    trackLinkClicks: true,
    enableNotifications: true,
    notificationSound: true,
    autoFollowUp: false,
    followUpDays: 3
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleConnectGmail = async () => {
    setLoading(true);
    try {
      await authenticate();
      handleNext();
    } catch (error) {
      console.error('Gmail authentication error:', error);
      alert('Failed to connect to Gmail. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (event) => {
    const { name, value, checked, type } = event.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveSettings = () => {
    // Save settings to Chrome storage
    chrome.storage.sync.set({
      mailSuiteSettings: {
        apiUrl,
        ...settings
      }
    }, () => {
      handleNext();
    });
  };

  const handleFinish = () => {
    // Close the onboarding tab
    window.close();
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <img 
              src="/public/icons/icon128.svg" 
              alt="MailSuite Logo" 
              style={{ width: 128, height: 128, marginBottom: 24 }}
            />
            <Typography variant="h4" gutterBottom>
              Welcome to MailSuite!
            </Typography>
            <Typography variant="body1" paragraph>
              MailSuite helps you track and analyze your email communications.
            </Typography>
            <Typography variant="body1" paragraph>
              Let's get you set up in just a few steps.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleNext}
              sx={{ mt: 2 }}
            >
              Get Started
            </Button>
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EmailIcon sx={{ fontSize: 64, color: '#1A73E8', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Connect Your Gmail Account
            </Typography>
            <Typography variant="body1" paragraph>
              MailSuite needs permission to access your Gmail account to track emails.
            </Typography>
            <Typography variant="body1" paragraph>
              We only request the minimum permissions needed for email tracking.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              onClick={handleConnectGmail}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              sx={{ mt: 2 }}
            >
              {loading ? 'Connecting...' : 'Connect Gmail'}
            </Button>
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom align="center">
              Configure Settings
            </Typography>
            <Typography variant="body1" paragraph align="center">
              Customize how MailSuite works for you.
            </Typography>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Server Configuration
              </Typography>
              <TextField
                label="API Server URL (Optional)"
                name="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                fullWidth
                margin="normal"
                helperText="Leave blank to use the default server"
              />
            </Paper>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tracking Settings
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.trackEmailOpens}
                    onChange={handleSettingChange}
                    name="trackEmailOpens"
                    color="primary"
                  />
                }
                label="Track Email Opens"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.trackLinkClicks}
                    onChange={handleSettingChange}
                    name="trackLinkClicks"
                    color="primary"
                  />
                }
                label="Track Link Clicks"
              />
            </Paper>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Notification Settings
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.enableNotifications}
                    onChange={handleSettingChange}
                    name="enableNotifications"
                    color="primary"
                  />
                }
                label="Enable Notifications"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.notificationSound}
                    onChange={handleSettingChange}
                    name="notificationSound"
                    color="primary"
                    disabled={!settings.enableNotifications}
                  />
                }
                label="Play Notification Sound"
              />
            </Paper>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Follow-up Settings
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.autoFollowUp}
                    onChange={handleSettingChange}
                    name="autoFollowUp"
                    color="primary"
                  />
                }
                label="Enable Automatic Follow-ups"
              />
              <Box sx={{ ml: 4, mt: 1 }}>
                <TextField
                  label="Follow-up After (days)"
                  name="followUpDays"
                  type="number"
                  value={settings.followUpDays}
                  onChange={handleSettingChange}
                  disabled={!settings.autoFollowUp}
                  InputProps={{ inputProps: { min: 1, max: 30 } }}
                  size="small"
                />
              </Box>
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                onClick={handleSaveSettings}
                sx={{ minWidth: 200 }}
              >
                Save Settings
              </Button>
            </Box>
          </Box>
        );
      
      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#4CAF50', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              You're All Set!
            </Typography>
            <Typography variant="body1" paragraph>
              MailSuite is now ready to help you track and analyze your emails.
            </Typography>
            <Typography variant="body1" paragraph>
              Click the MailSuite icon in your browser toolbar to get started.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              onClick={handleFinish}
              sx={{ mt: 2 }}
            >
              Finish
            </Button>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ mt: 4, mb: 4, p: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderStepContent(activeStep)}
        
        {activeStep !== 0 && activeStep !== 3 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
            <Button onClick={handleBack} disabled={loading}>
              Back
            </Button>
            {activeStep !== 1 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                disabled={loading}
              >
                Next
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Onboarding;
