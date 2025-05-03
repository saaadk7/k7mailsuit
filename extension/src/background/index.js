// Background script for MailSuite extension
// This runs in the background and handles events even when the popup is closed

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      mailSuiteSettings: {
        apiUrl: '',
        trackEmailOpens: true,
        trackLinkClicks: true,
        enableNotifications: true,
        notificationSound: true,
        autoFollowUp: false,
        followUpDays: 3,
        followUpTemplate: 'Just following up on my previous email. Did you have a chance to review it?'
      }
    });
    
    // Open onboarding page
    chrome.tabs.create({
      url: 'onboarding.html'
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRACK_EMAIL') {
    // Track email send event
    trackEmail(message.data);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'EMAIL_OPENED') {
    // Track email open event
    trackEmailOpen(message.data);
    
    // Show notification if enabled
    showNotification(message.data);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'LINK_CLICKED') {
    // Track link click event
    trackLinkClick(message.data);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'CHECK_AUTH') {
    // Check if user is authenticated
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      sendResponse({ authenticated: !!token, token });
    });
    return true; // Required for async response
  }
});

// Handle alarms for follow-ups
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('followup_')) {
    const emailId = alarm.name.replace('followup_', '');
    handleFollowUp(emailId);
  }
});

// Track email send event
function trackEmail(data) {
  // Get settings
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    
    if (settings.trackEmailOpens) {
      // Add tracking pixel to email
      // This would be handled by the content script
      console.log('Tracking email:', data);
      
      // Store email data
      chrome.storage.local.get(['trackedEmails'], (result) => {
        const trackedEmails = result.trackedEmails || [];
        trackedEmails.push({
          id: Date.now().toString(),
          ...data,
          sentAt: new Date().toISOString(),
          opens: 0,
          clicks: 0,
          lastOpenedAt: null
        });
        
        chrome.storage.local.set({ trackedEmails });
      });
      
      // Set follow-up alarm if enabled
      if (settings.autoFollowUp) {
        const emailId = Date.now().toString();
        const followUpDays = settings.followUpDays || 3;
        
        chrome.alarms.create(`followup_${emailId}`, {
          delayInMinutes: followUpDays * 24 * 60 // Convert days to minutes
        });
      }
    }
  });
}

// Track email open event
function trackEmailOpen(data) {
  console.log('Email opened:', data);
  
  // Update storage with open event
  chrome.storage.local.get(['trackedEmails'], (result) => {
    const trackedEmails = result.trackedEmails || [];
    const emailIndex = trackedEmails.findIndex(email => email.id === data.emailId);
    
    if (emailIndex !== -1) {
      trackedEmails[emailIndex].opens += 1;
      trackedEmails[emailIndex].lastOpenedAt = new Date().toISOString();
      
      chrome.storage.local.set({ trackedEmails });
    }
  });
  
  // If API URL is configured, send data to server
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    
    if (settings.apiUrl) {
      // Send data to server
      fetch(`${settings.apiUrl}/api/track/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('Error sending tracking data:', err));
    }
  });
}

// Track link click event
function trackLinkClick(data) {
  console.log('Link clicked:', data);
  
  // Update storage with click event
  chrome.storage.local.get(['trackedEmails'], (result) => {
    const trackedEmails = result.trackedEmails || [];
    const emailIndex = trackedEmails.findIndex(email => email.id === data.emailId);
    
    if (emailIndex !== -1) {
      trackedEmails[emailIndex].clicks += 1;
      
      chrome.storage.local.set({ trackedEmails });
    }
  });
  
  // If API URL is configured, send data to server
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    
    if (settings.apiUrl) {
      // Send data to server
      fetch(`${settings.apiUrl}/api/track/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('Error sending tracking data:', err));
    }
  });
}

// Show notification for email open
function showNotification(data) {
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    
    if (settings.enableNotifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/public/icons/icon128.png',
        title: 'Email Opened',
        message: `Your email to ${data.recipient} was just opened!`,
        priority: 2
      });
      
      if (settings.notificationSound) {
        // Play notification sound
        const audio = new Audio('/public/sounds/notification.mp3');
        audio.play().catch(err => console.error('Error playing sound:', err));
      }
    }
  });
}

// Handle follow-up for email
function handleFollowUp(emailId) {
  chrome.storage.local.get(['trackedEmails'], (result) => {
    const trackedEmails = result.trackedEmails || [];
    const email = trackedEmails.find(email => email.id === emailId);
    
    if (email && email.opens === 0) {
      // Email hasn't been opened, send follow-up
      chrome.storage.sync.get('mailSuiteSettings', (result) => {
        const settings = result.mailSuiteSettings || {};
        
        if (settings.autoFollowUp) {
          // Show notification to user about follow-up
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '/public/icons/icon128.png',
            title: 'Follow-up Reminder',
            message: `Your email to ${email.recipient} hasn't been opened. Consider sending a follow-up.`,
            priority: 2,
            buttons: [
              { title: 'Send Follow-up' },
              { title: 'Dismiss' }
            ]
          });
        }
      });
    }
  });
}

// Check for email opens periodically (if using server-side tracking)
chrome.alarms.create('check_email_opens', {
  periodInMinutes: 15 // Check every 15 minutes
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check_email_opens') {
    checkEmailOpens();
  }
});

function checkEmailOpens() {
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    
    if (settings.apiUrl) {
      // Get auth token
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          // Fetch email open data from server
          fetch(`${settings.apiUrl}/api/track/updates`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          .then(response => response.json())
          .then(data => {
            // Process updates
            if (data.opens && data.opens.length > 0) {
              data.opens.forEach(openEvent => {
                trackEmailOpen(openEvent);
              });
            }
            
            if (data.clicks && data.clicks.length > 0) {
              data.clicks.forEach(clickEvent => {
                trackLinkClick(clickEvent);
              });
            }
          })
          .catch(err => console.error('Error checking for updates:', err));
        }
      });
    }
  });
}
