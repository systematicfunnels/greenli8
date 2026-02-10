import logger from '../utils/logger.js';
import env from '../config/env.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = undefined;

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors;
  }

  if (statusCode === 500) {
    logger.error(`${req.method} ${req.path}:`, err);
    
    // Catch Prisma/DB errors
    if (err.code?.startsWith('P') || err.message?.includes('prisma') || err.message?.includes('database')) {
       return res.status(503).json({
         error: 'Database connection issue. Please wait a moment and refresh.',
         code: 'DATABASE_ERROR'
       });
    }
  } else {
    logger.warn(`${req.method} ${req.path} (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    error: message,
    code: err.code,
    details: details || (env.nodeEnv === 'development' ? err.stack : undefined)
  });
};

export default errorHandler;
