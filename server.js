import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; // Added for security headers
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from "@google/genai";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { SYSTEM_PROMPTS } from './config/prompts.js';

// Constants and Environment Validation
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'STRIPE_SECRET_KEY'
];

const OPTIONAL_ENV_VARS = [
  'API_KEY',
  'GEMINI_API_KEY',
  'SARVAM_API_KEY',
  'OPENROUTER_API_KEY',
  'RESEND_API_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

// Validate environment variables
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("FATAL: JWT_SECRET must be at least 32 characters long");
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

validateEnvironment();

// Initialize Services with Error Handling
function initializeStripe() {
  try {
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'Greenli8 AI',
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    throw error;
  }
}

function initializePrisma() {
  try {
    const prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn']
        : ['error']
    });
    
    // Test connection
    prisma.$connect().then(() => {
      console.log('✅ Database connected successfully');
    }).catch(err => {
      console.error('Database connection failed:', err);
      process.exit(1);
    });
    
    return prisma;
  } catch (error) {
    console.error('Failed to initialize Prisma:', error);
    throw error;
  }
}

// Initialize services
const stripe = initializeStripe();
const prisma = initializePrisma();
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Export prisma for testing/other modules
export { prisma };

// App configuration
const app = express();
const PORT = process.env.PORT || 4242;
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Greenli8 AI <onboarding@resend.dev>';

// AI Configuration
const getGenAI = () => {
  const GEMINI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API_KEY is missing from environment variables");
  }
  return new GoogleGenAI(GEMINI_API_KEY);
};

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_URL = 'https://api.sarvam.ai/v1/chat/completions';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat:free",
  "mistralai/mistral-7b-instruct:free",
  "openrouter/auto"
];
const OPENROUTER_DEFAULT_MODEL = process.env.OPENROUTER_MODEL || OPENROUTER_MODELS[0];

// Security & CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// For Google Auth compatibility
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  validate: { xForwardedForHeader: true },
  skip: (req) => req.path === '/api/webhook', // Skip webhook
  handler: (req, res) => {
    res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil(req.rateLimit.resetTime - Date.now()) / 1000
    });
  }
});

// Body parsing - webhook needs raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Apply JSON parsing to all other routes
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf; // Store raw body for webhook verification if needed
  }
}));

// Apply rate limiting after webhook route
app.use('/api', apiLimiter);

// ---------------------------------------------------------
// AI Service Helpers
// ---------------------------------------------------------

async function callSarvamAI(prompt, systemInstruction, timeout = 30000) {
  if (!SARVAM_API_KEY) {
    throw new Error("Sarvam API key not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(SARVAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY
      },
      body: JSON.stringify({
        model: "sarvam-m",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Sarvam API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Sarvam AI request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

async function callOpenRouterAI(prompt, systemInstruction, model = OPENROUTER_DEFAULT_MODEL, timeout = 45000) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const tryModel = async (modelIndex) => {
    const currentModel = OPENROUTER_MODELS[modelIndex] || model;
    
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://greenli8.com',
          'X-Title': 'Greenli8 AI'
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        
        if (modelIndex < OPENROUTER_MODELS.length - 1) {
          console.warn(`Model ${currentModel} failed (${errorMsg}). Trying next...`);
          return tryModel(modelIndex + 1);
        }
        
        throw new Error(`OpenRouter Error ${response.status}: ${errorMsg}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (modelIndex < OPENROUTER_MODELS.length - 1) {
        return tryModel(modelIndex + 1);
      }
      throw err;
    }
  };

  try {
    const initialIndex = OPENROUTER_MODELS.indexOf(model);
    const result = await tryModel(initialIndex === -1 ? 0 : initialIndex);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`OpenRouter request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

function parseAIResponse(text) {
  try {
    // Try to parse directly first
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI response is not valid JSON");
    }
    return JSON.parse(jsonMatch[0]);
  }
}

// ---------------------------------------------------------
// Webhook Handler
// ---------------------------------------------------------

async function handleStripeWebhook(request, response) {
  const sig = request.headers['stripe-signature'];
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe webhook secret not configured');
    return response.status(500).json({ error: 'Webhook configuration error' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return response.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await processSuccessfulPayment(session);
    }
    
    response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    response.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function processSuccessfulPayment(session) {
  const customerEmail = session.customer_details?.email;
  const planType = session.metadata?.plan || 'single';
  const paymentStatus = session.payment_status;

  if (paymentStatus !== 'paid' || !customerEmail) {
    console.warn('Payment not completed or missing email:', { paymentStatus, customerEmail });
    return;
  }

  console.log(`✅ Payment verified for ${customerEmail}. Plan: ${planType}`);
  
  try {
    const updateData = getUpdateDataForPlan(planType);
    await prisma.user.update({
      where: { email: customerEmail },
      data: updateData
    });
    
    // Send confirmation email
    await sendPaymentConfirmationEmail(customerEmail, planType);
  } catch (dbError) {
    console.error('Database update failed after payment:', dbError);
    // TODO: Implement retry logic or alert system
  }
}

function getUpdateDataForPlan(planType) {
  switch (planType) {
    case 'lifetime':
    case 'pro':
      return { isPro: true };
    case 'maker':
      return { credits: { increment: 10 } };
    default:
      return { credits: { increment: 1 } };
  }
}

// ---------------------------------------------------------
// Email Service
// ---------------------------------------------------------

async function sendWelcomeEmail(email, name) {
  if (!resend) {
    console.warn('Resend not configured, skipping welcome email');
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Welcome to Greenli8! 🚀",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0f172a;">Welcome to Greenli8!</h2>
          <p>Thanks for signing up, ${name || 'there'}. You've taken the first step towards validating your startup ideas.</p>
          <p>You have <strong>3 free validation credits</strong> to get started.</p>
          <br/>
          <p style="color: #64748b; font-size: 14px;">Cheers,<br/>The Greenli8 Team</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - email failure shouldn't break signup
  }
}

async function sendPaymentConfirmationEmail(email, planType) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Payment Confirmed! 🎉",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0f172a;">Payment Confirmed!</h2>
          <p>Your ${planType} plan has been successfully activated.</p>
          <br/>
          <p style="color: #64748b; font-size: 14px;">Thank you for your purchase!<br/>The Greenli8 Team</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
  }
}

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: "Invalid or expired token",
        code: "INVALID_TOKEN"
      });
    }
    req.user = user;
    next();
  });
};

// Request validation middleware
const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.format()
    });
  }
  req.validatedData = result.data;
  next();
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ---------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------

const WaitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
  source: z.string().optional()
});

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional()
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

const AnalysisSchema = z.object({
  idea: z.string().min(1, "Idea is required").max(5000, "Idea is too long"),
  attachment: z.object({
    mimeType: z.string(),
    data: z.string()
  }).optional()
});

const ProfileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    theme: z.enum(['light', 'dark']).optional()
  }).optional()
}).strict();

// ---------------------------------------------------------
// Routes
// ---------------------------------------------------------

// Public Routes
app.post('/api/waitlist', 
  validateRequest(WaitlistSchema),
  asyncHandler(async (req, res) => {
    const { email, source } = req.validatedData;

    const entry = await prisma.waitlist.upsert({
      where: { email },
      update: { source, updatedAt: new Date() },
      create: { email, source }
    });

    res.json({ 
      success: true, 
      id: entry.id,
      message: "Successfully joined waitlist"
    });
  })
);

// Auth Routes
app.post('/api/auth/google', 
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Google token is required" });
    }

    // Verify Google token
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!userInfoRes.ok) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    
    const payload = await userInfoRes.json();
    const { email, name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          googleId,
          isPro: false,
          credits: 3,
          preferences: {
            emailNotifications: true,
            marketingEmails: false,
            theme: 'light'
          }
        }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId }
      });
    }

    const jwtToken = jwt.sign(
      { 
        email: user.email, 
        id: user.id,
        isPro: user.isPro 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    if (isNewUser) {
      await sendWelcomeEmail(email, name);
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      user: userWithoutPassword, 
      token: jwtToken,
      isNewUser 
    });
  })
);

app.post('/api/auth/signup',
  validateRequest(SignupSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.validatedData;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        credits: 3,
        preferences: {
          emailNotifications: true,
          marketingEmails: false,
          theme: 'light'
        }
      }
    });

    const token = jwt.sign(
      { email: user.email, id: user.id, isPro: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    await sendWelcomeEmail(email, user.name);

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ 
      user: userWithoutPassword, 
      token 
    });
  })
);

app.post('/api/auth/login',
  validateRequest(LoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validatedData;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ 
        error: "Please use Google login or reset your password" 
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: user.email, id: user.id, isPro: user.isPro },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      user: userWithoutPassword, 
      token 
    });
  })
);

// Protected Routes
app.post('/api/analyze',
  authenticateToken,
  validateRequest(AnalysisSchema),
  asyncHandler(async (req, res) => {
    const { idea, attachment } = req.validatedData;
    const email = req.user.email;

    // Start transaction for credit check and report creation
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error("User account not found");
      }

      if (!user.isPro && user.credits <= 0) {
        throw new Error("Insufficient credits");
      }

      // Perform AI analysis
      const systemPrompt = SYSTEM_PROMPTS.STARTUP_ADVISOR;
      let analysisResult;
      let usedProvider = 'gemini'; // default

      // Try Sarvam first (text-only)
      if (!attachment && SARVAM_API_KEY) {
        try {
          const response = await callSarvamAI(idea, systemPrompt);
          analysisResult = parseAIResponse(response);
          usedProvider = 'sarvam';
        } catch (error) {
          console.warn('Sarvam failed, trying fallback:', error.message);
        }
      }

      // Try OpenRouter if Sarvam failed
      if (!analysisResult && !attachment && OPENROUTER_API_KEY) {
        try {
          const response = await callOpenRouterAI(idea, systemPrompt);
          analysisResult = parseAIResponse(response);
          usedProvider = 'openrouter';
        } catch (error) {
          console.warn('OpenRouter failed:', error.message);
        }
      }

      // Fallback to Gemini
      if (!analysisResult) {
        const GEMINI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
          throw new Error("No AI services available");
        }

        try {
          const parts = [];
          if (attachment) {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data
              }
            });
          }
          parts.push({ text: idea });

          const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
          const response = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summaryVerdict: { 
                    type: Type.STRING, 
                    enum: ["Promising", "Risky", "Needs Refinement"] 
                  },
                  oneLineTakeaway: { type: Type.STRING },
                  marketReality: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  competitors: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        differentiation: { type: Type.STRING }
                      }
                    }
                  },
                  monetizationStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                  whyPeoplePay: { type: Type.STRING },
                  viabilityScore: { type: Type.INTEGER },
                  nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              systemInstruction: systemPrompt
            }
          });

          analysisResult = parseAIResponse(response.response.text());
        } catch (error) {
          console.error('Gemini analysis failed:', error);
          if (error.message?.includes('429') || error.status === 429) {
            throw new Error("AI services are currently over capacity. Please try again later.");
          }
          throw new Error("AI analysis failed");
        }
      }

      // Deduct credit if not pro
      let updatedCredits = user.credits;
      if (!user.isPro) {
        const updatedUser = await tx.user.update({
          where: { email },
          data: { credits: { decrement: 1 } }
        });
        updatedCredits = updatedUser.credits;
      }

      // Save report
      await tx.report.create({
        data: {
          userId: user.id,
          originalIdea: idea || "Attachment Analysis",
          summaryVerdict: analysisResult.summaryVerdict,
          viabilityScore: analysisResult.viabilityScore,
          oneLineTakeaway: analysisResult.oneLineTakeaway,
          marketReality: analysisResult.marketReality,
          fullReportData: analysisResult,
          provider: usedProvider
        }
      });

      return {
        analysis: analysisResult,
        credits: updatedCredits,
        isPro: user.isPro
      };
    });

    res.json({
      ...result.analysis,
      remainingCredits: result.isPro ? 'unlimited' : result.credits,
      isPro: result.isPro
    });
  })
);

app.post('/api/chat',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { message, context } = req.body;
    const email = req.user.email;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.isPro && user.credits <= 0) {
      return res.status(403).json({ error: "Insufficient credits" });
    }

    const systemPrompt = SYSTEM_PROMPTS.CHAT_COFOUNDER
      .replace('{{originalIdea}}', context?.originalIdea || '')
      .replace('{{reportSummary}}', JSON.stringify(context?.report || {}));

    let responseText;

    // Try providers in order
    if (SARVAM_API_KEY) {
      try {
        responseText = await callSarvamAI(message, systemPrompt);
      } catch (error) {
        console.warn('Sarvam chat failed:', error.message);
      }
    }

    if (!responseText && OPENROUTER_API_KEY) {
      try {
        responseText = await callOpenRouterAI(message, systemPrompt);
      } catch (error) {
        console.warn('OpenRouter chat failed:', error.message);
      }
    }

    if (!responseText) {
      const GEMINI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw new Error("No AI services available for chat");
      }

      try {
        const model = getGenAI().getGenerativeModel({ 
          model: "gemini-2.0-flash-exp",
          systemInstruction: systemPrompt
        });
        const result = await model.generateContent(message);
        responseText = result.response.text();
      } catch (error) {
        console.error('Gemini chat failed:', error);
        throw new Error("Chat service unavailable");
      }
    }

    // Deduct credit if not pro
    if (!user.isPro) {
      await prisma.user.update({
        where: { email },
        data: { credits: { decrement: 1 } }
      });
    }

    res.json({ text: responseText });
  })
);

// User Profile Routes
app.get('/api/users/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ 
      where: { email: req.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        isPro: true,
        credits: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  })
);

app.put('/api/users/profile',
  authenticateToken,
  validateRequest(ProfileUpdateSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { email: req.user.email },
      data: req.validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        isPro: true,
        credits: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  })
);

app.get('/api/reports',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
      include: {
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reports = user.reports.map(report => ({
      id: report.id,
      originalIdea: report.originalIdea,
      summaryVerdict: report.summaryVerdict,
      viabilityScore: report.viabilityScore,
      createdAt: report.createdAt,
      provider: report.provider,
      report: report.fullReportData || {}
    }));

    res.json(reports);
  })
);

app.delete('/api/users/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { email: req.user.email } });
    res.json({ success: true, message: "Account deleted successfully" });
  })
);

app.get('/api/verify-payment',
  asyncHandler(async (req, res) => {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid session_id' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      const email = session.customer_details?.email;
      const plan = session.metadata?.plan || 'single';
      
      if (email) {
        try {
          await prisma.user.update({
            where: { email },
            data: getUpdateDataForPlan(plan)
          });
        } catch (error) {
          console.warn('Failed to update user after payment verification:', error);
        }
      }

      return res.json({ 
        verified: true, 
        plan,
        customer_email: email
      });
    }

    res.json({ 
      verified: false, 
      status: session.payment_status 
    });
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  const statusCode = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
});

// Graceful shutdown
function setupGracefulShutdown() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      
      try {
        await prisma.$disconnect();
        console.log('Database connection closed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
}

// Start server
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Resend configured: ${!!resend}`);
    console.log(`🔐 Stripe configured: ${!!stripe}`);
    console.log(`🤖 AI Providers: ${[
      SARVAM_API_KEY && 'Sarvam',
      OPENROUTER_API_KEY && 'OpenRouter',
      (process.env.API_KEY || process.env.GEMINI_API_KEY) && 'Gemini'
    ].filter(Boolean).join(', ') || 'None'}`);
  });

  setupGracefulShutdown();
}

export default app;