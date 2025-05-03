/**
 * API Service
 * 
 * Provides functions for interacting with the MailSuite backend API
 */

/**
 * Get API base URL from settings
 * @returns {Promise<string>} - Promise that resolves with the API base URL
 */
const getApiUrl = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get('mailSuiteSettings', (result) => {
      const settings = result.mailSuiteSettings || {};
      const apiUrl = settings.apiUrl || 'https://api.mailsuite.example.com';
      resolve(apiUrl);
    });
  });
};

/**
 * Get auth token from storage
 * @returns {Promise<string>} - Promise that resolves with the auth token
 */
const getAuthToken = async () => {
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
 * Make an authenticated request to the API
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Promise that resolves with the API response
 */
const makeRequest = async (endpoint, options = {}) => {
  try {
    const apiUrl = await getApiUrl();
    const token = await getAuthToken();
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Promise that resolves with the registration response
 */
export const register = async (userData) => {
  const apiUrl = await getApiUrl();
  
  const response = await fetch(`${apiUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Registration failed');
  }
  
  return await response.json();
};

/**
 * Login a user
 * @param {Object} credentials - User login credentials
 * @returns {Promise<Object>} - Promise that resolves with the login response
 */
export const login = async (credentials) => {
  const apiUrl = await getApiUrl();
  
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Login failed');
  }
  
  const data = await response.json();
  
  // Save token to storage
  chrome.storage.local.set({ authToken: data.token });
  
  return data;
};

/**
 * Get user profile
 * @returns {Promise<Object>} - Promise that resolves with the user profile
 */
export const getUserProfile = async () => {
  return await makeRequest('/api/auth/me');
};

/**
 * Get tracking data for a specific email
 * @param {string} emailId - Email tracking ID
 * @returns {Promise<Object>} - Promise that resolves with the tracking data
 */
export const getEmailTracking = async (emailId) => {
  return await makeRequest(`/api/track/${emailId}`);
};

/**
 * Get all tracking data
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} - Promise that resolves with the tracking data
 */
export const getAllTracking = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.page) {
    queryParams.append('page', filters.page);
  }
  
  if (filters.limit) {
    queryParams.append('limit', filters.limit);
  }
  
  if (filters.recipient) {
    queryParams.append('recipient', filters.recipient);
  }
  
  if (filters.campaignId) {
    queryParams.append('campaignId', filters.campaignId);
  }
  
  if (filters.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  
  if (filters.endDate) {
    queryParams.append('endDate', filters.endDate);
  }
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return await makeRequest(`/api/track${query}`);
};

/**
 * Create a tracking record
 * @param {Object} trackingData - Tracking data
 * @returns {Promise<Object>} - Promise that resolves with the created tracking record
 */
export const createTracking = async (trackingData) => {
  return await makeRequest('/api/track/create', {
    method: 'POST',
    body: JSON.stringify(trackingData)
  });
};

/**
 * Get analytics summary
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} - Promise that resolves with the analytics summary
 */
export const getAnalyticsSummary = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  
  if (filters.endDate) {
    queryParams.append('endDate', filters.endDate);
  }
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return await makeRequest(`/api/analytics/summary${query}`);
};

/**
 * Get email activity over time
 * @param {string} period - Time period ('day', 'week', 'month', 'year')
 * @returns {Promise<Object>} - Promise that resolves with the activity data
 */
export const getActivityOverTime = async (period = 'week') => {
  return await makeRequest(`/api/analytics/activity?period=${period}`);
};

/**
 * Get device analytics
 * @returns {Promise<Object>} - Promise that resolves with the device analytics
 */
export const getDeviceAnalytics = async () => {
  return await makeRequest('/api/analytics/devices');
};

/**
 * Get geographic analytics
 * @returns {Promise<Object>} - Promise that resolves with the geographic analytics
 */
export const getGeographicAnalytics = async () => {
  return await makeRequest('/api/analytics/geography');
};

/**
 * Get top performing emails
 * @returns {Promise<Object>} - Promise that resolves with the top emails
 */
export const getTopEmails = async () => {
  return await makeRequest('/api/analytics/top-emails');
};

/**
 * Get all email templates
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} - Promise that resolves with the templates
 */
export const getTemplates = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.page) {
    queryParams.append('page', filters.page);
  }
  
  if (filters.limit) {
    queryParams.append('limit', filters.limit);
  }
  
  if (filters.category) {
    queryParams.append('category', filters.category);
  }
  
  if (filters.tag) {
    queryParams.append('tag', filters.tag);
  }
  
  if (filters.active !== undefined) {
    queryParams.append('active', filters.active);
  }
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return await makeRequest(`/api/templates${query}`);
};

/**
 * Get a specific template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} - Promise that resolves with the template
 */
export const getTemplate = async (templateId) => {
  return await makeRequest(`/api/templates/${templateId}`);
};

/**
 * Create a new template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} - Promise that resolves with the created template
 */
export const createTemplate = async (templateData) => {
  return await makeRequest('/api/templates', {
    method: 'POST',
    body: JSON.stringify(templateData)
  });
};

/**
 * Update a template
 * @param {string} templateId - Template ID
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} - Promise that resolves with the updated template
 */
export const updateTemplate = async (templateId, templateData) => {
  return await makeRequest(`/api/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(templateData)
  });
};

/**
 * Delete a template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} - Promise that resolves with the deletion response
 */
export const deleteTemplate = async (templateId) => {
  return await makeRequest(`/api/templates/${templateId}`, {
    method: 'DELETE'
  });
};

/**
 * Get user settings
 * @returns {Promise<Object>} - Promise that resolves with the user settings
 */
export const getUserSettings = async () => {
  return await makeRequest('/api/users/settings');
};

/**
 * Update user settings
 * @param {Object} settingsData - Settings data
 * @returns {Promise<Object>} - Promise that resolves with the updated settings
 */
export const updateUserSettings = async (settingsData) => {
  return await makeRequest('/api/users/settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData)
  });
};
