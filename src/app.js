import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import analyzeRoutes from './routes/analyze.routes.js';
import reportRoutes from './routes/report.routes.js';

import paymentRoutes from './routes/payment.routes.js';

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...env.allowedOrigins, "*.vercel.app", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || env.allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

// 1. Stripe Webhook (MUST be before express.json())
app.use('/api/payments', paymentRoutes);

// 2. General Body parsing
app.use(express.json({ limit: '10mb' }));

// For Google Auth compatibility
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Rate limiting
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: { error: "Too many requests, please try again later." }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Error handling
app.use(errorHandler);

export default app;
