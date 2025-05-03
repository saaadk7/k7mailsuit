# MailSuite Chrome Extension

A powerful Chrome extension for advanced email management, tracking, and analytics.

## Features

- Email tracking (opens, clicks)
- Mail merge with personalization
- Real-time notifications
- Analytics dashboard
- Smart follow-ups and reminders

## Tech Stack

### Frontend (Extension)
- HTML, CSS, JavaScript
- React.js (for UI components)
- Chrome Extension APIs

### Backend
- Node.js + Express
- MongoDB (for data storage)
- Socket.IO (for real-time notifications)

### APIs & Integrations
- Gmail API (OAuth2)
- Webhook System

## Project Structure

```
/mailSuit
  /extension          # Chrome extension code
    /public           # Static assets
    /src              # Source code
      /components     # React components
      /services       # API services
      /utils          # Utility functions
      /pages          # Extension pages (popup, options)
      /content        # Content scripts for Gmail integration
      /background     # Background scripts
    manifest.json     # Extension manifest
    package.json      # Frontend dependencies
  
  /server             # Backend server code
    /controllers      # API controllers
    /models           # Database models
    /routes           # API routes
    /services         # Business logic
    /utils            # Utility functions
    /config           # Configuration files
    server.js         # Main server file
    package.json      # Backend dependencies

  /docs               # Documentation
  README.md           # Project overview
```

## Setup Instructions

### Extension Setup
1. Navigate to the `extension` directory
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the `extension/build` directory

### Backend Setup
1. Navigate to the `server` directory
2. Run `npm install` to install dependencies
3. Create a `.env` file with required environment variables (see `.env.example`)
4. Run `npm start` to start the server

## Development

### Extension Development
- Run `npm run dev` in the `extension` directory for hot-reloading during development

### Backend Development
- Run `npm run dev` in the `server` directory to start the server with nodemon

## Deployment

### Extension
- Build the extension with `npm run build`
- Package and submit to the Chrome Web Store

### Backend
- Deploy to your preferred hosting service (Heroku, Vercel, AWS, etc.)

## License

MIT
