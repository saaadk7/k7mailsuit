/**
 * MailSuite Backend Server
 * 
 * Main server file that initializes Express, connects to MongoDB,
 * sets up middleware, and defines API routes.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { createLogger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const trackingRoutes = require('./routes/tracking.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const templateRoutes = require('./routes/template.routes');
const userRoutes = require('./routes/user.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

// Initialize logger
const logger = createLogger('server');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Set up global socket.io instance
app.set('io', io);

// Environment variables
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailsuite';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/templates', authMiddleware, templateRoutes);
app.use('/api/users', authMiddleware, userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: NODE_ENV });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'MailSuite API Server' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);
  
  socket.on('authenticate', (token) => {
    // Authenticate socket connection
    try {
      // Verify token logic would go here
      socket.join('authenticated');
      logger.info(`Socket ${socket.id} authenticated`);
    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't crash the server in production
  if (NODE_ENV === 'development') {
    process.exit(1);
  }
});

module.exports = { app, server };
