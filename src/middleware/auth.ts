import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    [key: string]: unknown;
  };
}

const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    logger.warn(`Auth failed: No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ 
      error: "Authentication token required",
      code: "MISSING_TOKEN"
    });
  }

  try {
    const user = jwt.verify(token, env.jwtSecret) as { id: string; email: string; [key: string]: unknown };
    if (!user || !user.id || !user.email) {
      logger.error('Auth failed: Invalid token payload');
      return res.status(403).json({ 
        error: "Invalid token payload",
        code: "INVALID_PAYLOAD"
      });
    }
    req.user = user;
    next();
  } catch (err: any) {
    logger.error(`JWT Verification Error for ${req.path}:`, err.message);
    const message = err.name === 'TokenExpiredError' 
      ? "Your session has expired. Please login again." 
      : "Invalid authentication token";
    
    return res.status(403).json({ 
      error: message,
      code: err.name === 'TokenExpiredError' ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
    });
  }
};

export default auth;
