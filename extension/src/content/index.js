// Content script for MailSuite extension
// This script runs in the context of Gmail and interacts with its interface

// Initialize when the page loads
window.addEventListener('load', () => {
  console.log('MailSuite content script loaded');
  initMailSuite();
});

// Main initialization function
function initMailSuite() {
  // Check if we're on Gmail
  if (!window.location.hostname.includes('mail.google.com')) {
    return;
  }

  // Wait for Gmail to fully load (it's a SPA)
  const checkGmailLoaded = setInterval(() => {
    if (document.querySelector('div[role="main"]')) {
      clearInterval(checkGmailLoaded);
      console.log('Gmail interface detected');
      setupMailSuite();
    }
  }, 1000);
}

// Setup MailSuite features
function setupMailSuite() {
  // Load settings
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    
    // Only proceed if tracking is enabled
    if (settings.trackEmailOpens || settings.trackLinkClicks) {
      // Observe compose window
      observeComposeWindow();
      
      // Add custom styles
      addCustomStyles();
    }
  });
}

// Observe for new compose windows
function observeComposeWindow() {
  // Create a mutation observer to detect when a compose window appears
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for compose window
            const composeBox = node.querySelector('div[role="dialog"] form');
            if (composeBox) {
              enhanceComposeWindow(composeBox);
            }
          }
        }
      }
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Enhance compose window with tracking features
function enhanceComposeWindow(composeBox) {
  console.log('Enhancing compose window');
  
  // Find the send button
  const sendButton = composeBox.querySelector('div[role="button"][data-tooltip^="Send"]');
  if (!sendButton) return;
  
  // Create tracking toggle button
  const trackingButton = document.createElement('div');
  trackingButton.className = 'mailsuite-tracking-button';
  trackingButton.setAttribute('role', 'button');
  trackingButton.setAttribute('data-tooltip', 'Toggle email tracking');
  trackingButton.innerHTML = `
    <div style="display: flex; align-items: center; padding: 8px;">
      <img src="${chrome.runtime.getURL('/public/icons/icon16.png')}" alt="Track" style="width: 16px; height: 16px;">
      <span style="margin-left: 4px;">Track</span>
    </div>
  `;
  
  // Get current tracking state from storage
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    let isTracking = settings.trackEmailOpens;
    
    // Update button state
    updateTrackingButtonState(trackingButton, isTracking);
    
    // Add click handler
    trackingButton.addEventListener('click', () => {
      isTracking = !isTracking;
      updateTrackingButtonState(trackingButton, isTracking);
    });
  });
  
  // Insert button before send button
  sendButton.parentNode.insertBefore(trackingButton, sendButton);
  
  // Intercept send button click
  sendButton.addEventListener('click', handleSendEmail.bind(null, composeBox), true);
}

// Update tracking button state
function updateTrackingButtonState(button, isTracking) {
  if (isTracking) {
    button.classList.add('mailsuite-tracking-enabled');
    button.querySelector('span').textContent = 'Tracking On';
  } else {
    button.classList.remove('mailsuite-tracking-enabled');
    button.querySelector('span').textContent = 'Tracking Off';
  }
}

// Handle send email event
function handleSendEmail(composeBox, event) {
  // Check if tracking is enabled for this email
  const trackingButton = composeBox.querySelector('.mailsuite-tracking-button');
  if (!trackingButton) return;
  
  const isTracking = trackingButton.classList.contains('mailsuite-tracking-enabled');
  if (!isTracking) return;
  
  // Get email details
  const recipientField = composeBox.querySelector('input[name="to"]');
  const subjectField = composeBox.querySelector('input[name="subjectbox"]');
  const bodyField = composeBox.querySelector('div[role="textbox"][aria-label^="Message Body"]');
  
  if (!recipientField || !subjectField || !bodyField) return;
  
  const recipient = recipientField.value;
  const subject = subjectField.value;
  const originalBody = bodyField.innerHTML;
  
  // Generate a unique tracking ID
  const trackingId = generateTrackingId();
  
  // Load settings
  chrome.storage.sync.get('mailSuiteSettings', (result) => {
    const settings = result.mailSuiteSettings || {};
    const apiUrl = settings.apiUrl || 'https://api.mailsuite.example.com'; // Default or configured API URL
    
    let modifiedBody = originalBody;
    
    // Add tracking pixel if enabled
    if (settings.trackEmailOpens) {
      const trackingPixel = `<img src="${apiUrl}/api/track/open?id=${trackingId}" width="1" height="1" alt="" style="display:none">`;
      modifiedBody += trackingPixel;
    }
    
    // Process links if link tracking is enabled
    if (settings.trackLinkClicks) {
      modifiedBody = processLinks(modifiedBody, trackingId, apiUrl);
    }
    
    // Update email body with tracking elements
    bodyField.innerHTML = modifiedBody;
    
    // Track this email
    chrome.runtime.sendMessage({
      type: 'TRACK_EMAIL',
      data: {
        id: trackingId,
        recipient,
        subject,
        sentAt: new Date().toISOString()
      }
    });
  });
}

// Generate a unique tracking ID
function generateTrackingId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Process links to make them trackable
function processLinks(html, emailId, apiUrl) {
  // Create a temporary element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Find all links
  const links = tempDiv.querySelectorAll('a');
  
  links.forEach((link, index) => {
    const originalUrl = link.getAttribute('href');
    if (originalUrl && !originalUrl.includes('/api/track/click')) {
      // Create tracking URL
      const trackingUrl = `${apiUrl}/api/track/click?id=${emailId}&link=${encodeURIComponent(originalUrl)}&index=${index}`;
      link.setAttribute('href', trackingUrl);
    }
  });
  
  return tempDiv.innerHTML;
}

// Add custom styles for MailSuite elements
function addCustomStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .mailsuite-tracking-button {
      cursor: pointer;
      margin-right: 8px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      color: #5f6368;
      font-size: 14px;
    }
    
    .mailsuite-tracking-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    .mailsuite-tracking-enabled {
      color: #1a73e8;
      font-weight: 500;
    }
  `;
  
  document.head.appendChild(style);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INJECT_TRACKING') {
    // Handle injecting tracking into compose window
    sendResponse({ success: true });
    return true;
  }
});
