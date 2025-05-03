/**
 * Gmail API Service
 * 
 * Provides functions for interacting with the Gmail API
 */

const API_BASE_URL = 'https://www.googleapis.com/gmail/v1/users/me';

/**
 * Get Gmail API token from Chrome storage
 * @returns {Promise<string>} - Promise that resolves with the token
 */
const getToken = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['authToken'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (!result.authToken) {
        reject(new Error('No auth token found'));
      } else {
        resolve(result.authToken);
      }
    });
  });
};

/**
 * Make an authenticated request to the Gmail API
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Promise that resolves with the API response
 */
const makeRequest = async (endpoint, options = {}) => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Gmail API request failed:', error);
    throw error;
  }
};

/**
 * Get user profile information
 * @returns {Promise<Object>} - Promise that resolves with the user profile
 */
export const getUserProfile = async () => {
  return await makeRequest('/profile');
};

/**
 * Get a list of emails
 * @param {Object} options - Query options
 * @param {number} options.maxResults - Maximum number of results to return
 * @param {string} options.labelIds - Comma-separated list of label IDs
 * @param {string} options.q - Search query
 * @returns {Promise<Object>} - Promise that resolves with the email list
 */
export const getEmails = async (options = {}) => {
  const queryParams = new URLSearchParams();
  
  if (options.maxResults) {
    queryParams.append('maxResults', options.maxResults);
  }
  
  if (options.labelIds) {
    queryParams.append('labelIds', options.labelIds);
  }
  
  if (options.q) {
    queryParams.append('q', options.q);
  }
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return await makeRequest(`/messages${query}`);
};

/**
 * Get a specific email by ID
 * @param {string} messageId - Email message ID
 * @returns {Promise<Object>} - Promise that resolves with the email details
 */
export const getEmail = async (messageId) => {
  return await makeRequest(`/messages/${messageId}`);
};

/**
 * Send an email
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (HTML)
 * @param {boolean} emailData.trackOpens - Whether to track email opens
 * @param {boolean} emailData.trackLinks - Whether to track link clicks
 * @returns {Promise<Object>} - Promise that resolves with the sent email details
 */
export const sendEmail = async (emailData) => {
  // Get settings
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get('mailSuiteSettings', (result) => {
      resolve(result.mailSuiteSettings || {});
    });
  });
  
  // Generate a unique tracking ID
  const trackingId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // Add tracking pixel if enabled
  let body = emailData.body;
  
  if (emailData.trackOpens && settings.trackEmailOpens) {
    const apiUrl = settings.apiUrl || 'https://api.mailsuite.example.com';
    const trackingPixel = `<img src="${apiUrl}/api/track/open?id=${trackingId}" width="1" height="1" alt="" style="display:none">`;
    body += trackingPixel;
  }
  
  // Process links if link tracking is enabled
  if (emailData.trackLinks && settings.trackLinkClicks) {
    const apiUrl = settings.apiUrl || 'https://api.mailsuite.example.com';
    
    // Simple regex to find links in HTML
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    
    let linkIndex = 0;
    body = body.replace(linkRegex, (match, url, text) => {
      // Skip tracking for certain links
      if (url.startsWith('#') || 
          url.startsWith('mailto:') || 
          url.startsWith('tel:') ||
          url.includes('/unsubscribe') ||
          url.includes('/api/track/')) {
        return match;
      }
      
      // Create tracking URL
      const trackingUrl = `${apiUrl}/api/track/click?id=${trackingId}&url=${encodeURIComponent(url)}&idx=${linkIndex++}`;
      
      // Replace the original URL with the tracking URL
      return match.replace(url, trackingUrl);
    });
  }
  
  // Construct email in RFC 2822 format
  const emailLines = [
    `To: ${emailData.to}`,
    `Subject: ${emailData.subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ];
  
  const email = emailLines.join('\r\n');
  
  // Encode the email in base64url format
  const encodedEmail = btoa(email)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Send the email via Gmail API
  const response = await makeRequest('/messages/send', {
    method: 'POST',
    body: JSON.stringify({
      raw: encodedEmail
    })
  });
  
  // Track the email in our system
  if (emailData.trackOpens || emailData.trackLinks) {
    try {
      // Notify background script to track this email
      chrome.runtime.sendMessage({
        type: 'TRACK_EMAIL',
        data: {
          id: trackingId,
          recipient: emailData.to,
          subject: emailData.subject,
          sentAt: new Date().toISOString()
        }
      });
      
      // If API URL is configured, also send to server
      if (settings.apiUrl) {
        await fetch(`${settings.apiUrl}/api/track/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getToken()}`
          },
          body: JSON.stringify({
            emailId: trackingId,
            recipient: emailData.to,
            subject: emailData.subject
          })
        });
      }
    } catch (error) {
      console.error('Error tracking email:', error);
      // Continue even if tracking fails
    }
  }
  
  return response;
};

/**
 * Get Gmail labels
 * @returns {Promise<Object>} - Promise that resolves with the labels
 */
export const getLabels = async () => {
  return await makeRequest('/labels');
};

/**
 * Create a draft email
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (HTML)
 * @returns {Promise<Object>} - Promise that resolves with the draft email details
 */
export const createDraft = async (emailData) => {
  // Construct email in RFC 2822 format
  const emailLines = [
    `To: ${emailData.to}`,
    `Subject: ${emailData.subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    emailData.body
  ];
  
  const email = emailLines.join('\r\n');
  
  // Encode the email in base64url format
  const encodedEmail = btoa(email)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Create the draft via Gmail API
  return await makeRequest('/drafts', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        raw: encodedEmail
      }
    })
  });
};

/**
 * Check if the user is authenticated with Gmail API
 * @returns {Promise<boolean>} - Promise that resolves with authentication status
 */
export const checkAuth = async () => {
  try {
    await getToken();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Authenticate with Gmail API
 * @returns {Promise<string>} - Promise that resolves with the auth token
 */
export const authenticate = () => {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (!token) {
        reject(new Error('Failed to get auth token'));
      } else {
        chrome.storage.local.set({ authToken: token }, () => {
          resolve(token);
        });
      }
    });
  });
};

/**
 * Revoke Gmail API authentication
 * @returns {Promise<void>} - Promise that resolves when auth is revoked
 */
export const revokeAuth = async () => {
  try {
    const token = await getToken();
    
    // Revoke token with Google
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    
    // Clear token from storage
    chrome.storage.local.remove(['authToken']);
    
    return true;
  } catch (error) {
    console.error('Error revoking auth:', error);
    throw error;
  }
};
