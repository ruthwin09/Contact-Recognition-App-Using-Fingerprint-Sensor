const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const db = require('./config/db');

const app = express();

// Security Headers & Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limiter
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Contact Recognition API',
    version: '1.0.0',
    mode: process.env.FINGERPRINT_MODE || 'mock',
    database: db.isMock() ? 'in-memory (mock fallback)' : 'mysql (connected)'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Contact Recognition App Using Fingerprint Sensor API',
    version: '1.0.0',
    status: 'online',
    documentation: '/api/docs'
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    console.error('[SERVER ERROR]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
