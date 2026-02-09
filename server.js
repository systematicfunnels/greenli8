import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from "@google/genai";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { rateLimit } from 'express-rate-limit';
import { SYSTEM_PROMPTS } from './config/prompts.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');
const app = express();
const PORT = process.env.PORT || 4242;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

// Initialize Gemini on Backend
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || 'dummy_api_key' });

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: "Too many requests, please try again later."
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// Webhook must be defined before express.json() parser
app.post('/api/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    const planType = session.metadata?.plan || 'single';
    const paymentStatus = session.payment_status;

    if (paymentStatus === 'paid' && customerEmail) {
      console.log(`✅ Payment verified for ${customerEmail}. Plan: ${planType}`);
      
      try {
        if (planType === 'lifetime' || planType === 'pro') {
          await prisma.user.update({
            where: { email: customerEmail },
            data: { isPro: true }
          });
        } else if (planType === 'maker') {
          await prisma.user.update({
            where: { email: customerEmail },
            data: { credits: { increment: 10 } }
          });
        } else {
          // Default to single
          await prisma.user.update({
            where: { email: customerEmail },
            data: { credits: { increment: 1 } }
          });
        }
      } catch (dbError) {
        console.error("Database update failed after payment:", dbError);
      }
    }
  }

  response.json({received: true});
});

app.use(express.json({ limit: '50mb' })); 

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ---------------------------------------------------------
// Marketing / Waitlist Routes (Public)
// ---------------------------------------------------------

app.post('/api/waitlist', async (req, res) => {
  const { email, source } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  try {
    const entry = await prisma.waitlist.upsert({
      where: { email },
      update: { source }, 
      create: { email, source }
    });

    // Send Welcome Email via Resend
    try {
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Greenli8 AI <onboarding@resend.dev>', // Update this with your verified domain later
                to: email,
                subject: "You're on the list! (Wait time: ~48 hours) 🚀",
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
                    
                    <h2 style="color: #0f172a;">You're on the list!</h2>
                    
                    <p>Thanks for joining. We are letting in <strong>50 founders a day</strong> to ensure server stability.</p>
                    
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 24px 0;">
                        <p style="margin: 0; color: #166534; font-weight: 500;">🚀 <strong>Want to skip the line?</strong></p>
                        <p style="margin: 8px 0 0 0; font-size: 14px; color: #15803d;">
                            Reply to this email right now with your <strong>#1 startup idea</strong> (just one sentence). 
                            I'll personally review it and bump you to the front of the queue.
                        </p>
                    </div>

                    <p>Otherwise, keep an eye on your inbox. We'll send your access link in about 2 days.</p>
                    
                    <br/>
                    <p style="color: #64748b; font-size: 14px;">Cheers,<br/>The Greenli8 Team</p>
                  </div>
                `
            });
        }
    } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the request if email fails
    }

    res.json({ success: true, id: entry.id });
  } catch (error) {
    console.error("Waitlist Error:", error);
    res.status(500).json({ 
      error: "Failed to join waitlist.", 
      details: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// ---------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------

app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  try {
    // Verify Access Token by fetching user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!userInfoRes.ok) {
        throw new Error("Failed to validate Google token");
    }
    
    const payload = await userInfoRes.json();
    const { email, name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
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
    } else {
        if (!user.googleId) {
            user = await prisma.user.update({
                where: { email },
                data: { googleId }
            });
        }
    }

    const jwtToken = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token: jwtToken });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Invalid email or password (min 6 chars)" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        preferences: {
          emailNotifications: true,
          marketingEmails: false,
          theme: 'light'
        }
      }
    });

    const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Don't return password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!user.password) {
       return res.status(400).json({ error: "Please reset your password or login via original method" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(403).json({ error: "Invalid password" });
    }

    const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ---------------------------------------------------------
// AI Routes (Protected)
// ---------------------------------------------------------

app.post('/api/analyze', authenticateToken, async (req, res) => {
  const { idea, attachment } = req.body;
  const email = req.user.email; // From Token

  try {
    // 1. SECURITY CHECK: Verify Credits
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) return res.status(404).json({ error: "User account not found." });

    if (!user.isPro && user.credits <= 0) {
      return res.status(403).json({ error: "Insufficient credits. Please upgrade or purchase more." });
    }

    // 2. Perform Analysis
    const systemPrompt = SYSTEM_PROMPTS.STARTUP_ADVISOR;

    const parts = [];
    if (attachment) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }
    if (idea) parts.push({ text: idea });

    const modelName = attachment ? 'gemini-2.0-flash-exp' : 'gemini-2.0-flash-thinking-exp-1219';

    const response = await genAI.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryVerdict: { type: Type.STRING, enum: ["Promising", "Risky", "Needs Refinement"] },
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
        }
      }
    });

    const analysisResult = JSON.parse(response.text());

    // 3. TRANSACTION: Deduct Credit & Save Report
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { email } });
      
      if (!u.isPro && u.credits <= 0) {
          throw new Error("Insufficient credits");
      }

      if (!u.isPro) {
        await tx.user.update({
          where: { email },
          data: { credits: { decrement: 1 } }
        });
      }

      await tx.report.create({
          data: {
              userId: u.id,
              originalIdea: idea || "Attachment Analysis",
              summaryVerdict: analysisResult.summaryVerdict,
              viabilityScore: analysisResult.viabilityScore,
              oneLineTakeaway: analysisResult.oneLineTakeaway,
              marketReality: analysisResult.marketReality,
              fullReportData: analysisResult
          }
      });
    });

    res.json(analysisResult);

  } catch (error) {
    console.error("Gemini/DB Error:", error);
    if (error.message === "Insufficient credits") {
        res.status(403).json({ error: "Insufficient credits." });
    } else {
        res.status(500).json({ error: error.message || "AI Analysis Failed" });
    }
  }
});

app.post('/api/chat', authenticateToken, async (req, res) => {
    const { message, context } = req.body;
    
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            systemInstruction: SYSTEM_PROMPTS.CHAT_COFOUNDER
                .replace('{{originalIdea}}', context.originalIdea)
                .replace('{{reportSummary}}', JSON.stringify(context.report))
        });

        const result = await model.generateContent(message);
        res.json({ text: result.response.text() });
    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Chat failed" });
    }
});

// ---------------------------------------------------------
// User Routes (Protected)
// ---------------------------------------------------------

app.get('/api/users/me', authenticateToken, async (req, res) => {
  const email = req.user.email;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const email = req.user.email;
  const data = req.body;
  
  // Security: Block sensitive field updates
  delete data.id;
  delete data.email;
  delete data.password;
  delete data.createdAt;
  delete data.credits; 
  delete data.isPro;

  try {
    const user = await prisma.user.update({
      where: { email },
      data: data,
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/users/me', authenticateToken, async (req, res) => {
  const email = req.user.email;
  try {
    await prisma.user.delete({ where: { email } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/api/reports', authenticateToken, async (req, res) => {
  const email = req.user.email;
  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { 
        reports: { 
          orderBy: { createdAt: 'desc' },
          take: 20
        } 
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const history = user.reports.map(r => ({
      ...(r.fullReportData), 
      id: r.id,
      createdAt: new Date(r.createdAt).getTime(),
      originalIdea: r.originalIdea
    }));

    res.json(history);
  } catch (error) {
    console.error("Fetch History Error:", error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/verify-payment', async (req, res) => {
  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
        const email = session.customer_details?.email;
        const plan = session.metadata?.plan || 'single';
        
        if (email) {
            try {
                if (plan === 'lifetime' || plan === 'pro') {
                    await prisma.user.update({ where: { email }, data: { isPro: true } });
                } else if (plan === 'maker') {
                    await prisma.user.update({ where: { email }, data: { credits: { increment: 10 } } });
                } else {
                    await prisma.user.update({ where: { email }, data: { credits: { increment: 1 } } });
                }
            } catch (e) {
                console.log("DB sync in verify endpoint skipped");
            }
        }

        return res.json({ 
            verified: true, 
            plan,
            customer_email: email
        });
    } else {
        return res.json({ verified: false, status: session.payment_status });
    }
  } catch (error) {
    console.error("Verify Error:", error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Only start the server if we're not in a serverless environment (Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

// Export for Vercel Serverless
export default app;
