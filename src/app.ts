import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import env from './config/env.ts';
import errorHandler from './middleware/errorHandler.ts';

// Routes
import authRoutes from './routes/auth.routes.ts';
import userRoutes from './routes/user.routes.ts';
import analyzeRoutes from './routes/analyze.routes.ts';
import reportRoutes from './routes/report.routes.ts';
import paymentRoutes from './routes/payment.routes.ts';
import prisma from './config/prisma.ts';
import { z } from 'zod';
import asyncHandler from './utils/asyncHandler.ts';

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
app.use((_req: Request, res: Response, next: NextFunction) => {
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
