/**
 * Centralized error handler. Maps known Prisma error codes and custom
 * AppError instances to friendly HTTP responses.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
        meta: err.meta,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Requested record was not found',
    });
  }

  // JWT errors that slip through
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  // Custom operational errors
  const statusCode = err.statusCode || 500;
  const message =
    err.isOperational || statusCode < 500
      ? err.message
      : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { errorHandler, notFoundHandler, AppError };
