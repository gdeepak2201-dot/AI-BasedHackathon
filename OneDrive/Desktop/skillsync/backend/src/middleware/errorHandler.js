const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.userId
  });

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.details });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique violation
        return res.status(409).json({ error: 'Resource already exists', detail: err.detail });
      case '23503': // foreign key violation
        return res.status(400).json({ error: 'Referenced resource not found' });
      case '23502': // not null violation
        return res.status(400).json({ error: 'Required field missing', column: err.column });
      case '42P01': // undefined table
        return res.status(500).json({ error: 'Database configuration error' });
    }
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
