import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import env from './config/env';
import errorHandler from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import analyzeRoutes from './routes/analyze.routes';
import reportRoutes from './routes/report.routes';
import paymentRoutes from './routes/payment.routes';
import prisma from './config/prisma';
import { z } from 'zod';
import asyncHandler from './utils/asyncHandler';

const app = express();

// Trust Vercel/Cloudflare proxy for rate limiting
app.set('trust proxy', 1);

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...env.allowedOrigins, "*.vercel.app", "https://accounts.google.com", "https://www.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false, // Let the frontend/Vercel handle this
  crossOriginResourcePolicy: { policy: "cross-origin" }
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

// Debugging middleware for 405 errors
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.includes('google')) {
    console.log(`[Auth Debug] ${req.method} ${req.path}`);
  }
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
app.use('/api', analyzeRoutes); // Mounted at /api to support /api/analyze and /api/chat
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Waitlist (Public)
const WaitlistSchema = z.object({
  email: z.string().email(),
  source: z.string().optional()
});

app.post('/api/waitlist', asyncHandler(async (req: Request, res: Response) => {
  const { email, source } = WaitlistSchema.parse(req.body);
  const entry = await prisma.waitlist.upsert({
    where: { email },
    update: { source },
    create: { email, source }
  });
  res.json({ success: true, id: entry.id });
}));

// Error handling
app.use(errorHandler);

export default app;
