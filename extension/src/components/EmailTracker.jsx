import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, Chip, Divider, CircularProgress, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';

const EmailTracker = () => {
  const [trackedEmails, setTrackedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: ''
  });

  useEffect(() => {
    // Fetch tracked emails from storage or API
    fetchTrackedEmails();
  }, []);

  const fetchTrackedEmails = () => {
    setLoading(true);
    // In a real implementation, this would call your backend API
    // For now, we'll use mock data
    setTimeout(() => {
      const mockEmails = [
        {
          id: '1',
          recipient: 'john.doe@example.com',
          subject: 'Project Proposal',
          sentAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          opens: 2,
          clicks: 1,
          lastOpenedAt: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
        },
        {
          id: '2',
          recipient: 'jane.smith@example.com',
          subject: 'Meeting Follow-up',
          sentAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          opens: 3,
          clicks: 0,
          lastOpenedAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        },
        {
          id: '3',
          recipient: 'mike.johnson@example.com',
          subject: 'Product Demo Request',
          sentAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          opens: 0,
          clicks: 0,
          lastOpenedAt: null
        }
      ];
      
      setTrackedEmails(mockEmails);
      setLoading(false);
    }, 1000);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleTemplateChange = (e) => {
    const { name, value } = e.target;
    setNewTemplate({
      ...newTemplate,
      [name]: value
    });
  };

  const handleSaveTemplate = () => {
    // Save template to storage
    console.log('Saving template:', newTemplate);
    // Reset form and close dialog
    setNewTemplate({ name: '', subject: '', body: '' });
    setOpenDialog(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tracked Emails</Typography>
        <Box>
          <IconButton onClick={fetchTrackedEmails} size="small" sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button 
            variant="contained" 
            size="small" 
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            New Template
          </Button>
        </Box>
      </Box>

      {trackedEmails.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No tracked emails yet. Start sending emails with tracking enabled.
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<SendIcon />} 
            sx={{ mt: 2 }}
            onClick={() => window.open('https://mail.google.com', '_blank')}
          >
            Compose Email
          </Button>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper' }}>
          {trackedEmails.map((email, index) => (
            <React.Fragment key={email.id}>
              {index > 0 && <Divider variant="inset" component="li" />}
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar>
                    <EmailIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">{email.subject}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(email.sentAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      <Typography variant="body2" component="span" color="textPrimary">
                        To: {email.recipient}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          icon={<VisibilityIcon fontSize="small" />} 
                          label={`${email.opens} opens`} 
                          size="small" 
                          sx={{ mr: 1 }}
                          color={email.opens > 0 ? "primary" : "default"}
                          variant={email.opens > 0 ? "filled" : "outlined"}
                        />
                        <Chip 
                          icon={<LinkIcon fontSize="small" />} 
                          label={`${email.clicks} clicks`} 
                          size="small"
                          color={email.clicks > 0 ? "secondary" : "default"}
                          variant={email.clicks > 0 ? "filled" : "outlined"}
                        />
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        Last opened: {formatDate(email.lastOpenedAt)}
                      </Typography>
                    </React.Fragment>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* New Template Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create Email Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Template Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTemplate.name}
            onChange={handleTemplateChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="subject"
            label="Email Subject"
            type="text"
            fullWidth
            variant="outlined"
            value={newTemplate.subject}
            onChange={handleTemplateChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="body"
            label="Email Body"
            multiline
            rows={8}
            fullWidth
            variant="outlined"
            value={newTemplate.body}
            onChange={handleTemplateChange}
            helperText="You can use {{name}} as a placeholder for recipient's name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveTemplate} 
            variant="contained" 
            disabled={!newTemplate.name || !newTemplate.subject || !newTemplate.body}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailTracker;
