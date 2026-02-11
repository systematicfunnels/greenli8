import dotenv from 'dotenv';
dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY'];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`ERROR: Missing environment variable: ${key}`);
  }
});

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET should be at least 32 characters long');
}

export interface Config {
  port: string | number;
  jwtSecret: string;
  nodeEnv: string;
  databaseUrl: string;
  geminiKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  resendApiKey: string;
  allowedOrigins: string[];
  emailFrom: string;
}

const config: Config = {
  port: process.env.PORT || 4242,
  jwtSecret: process.env.JWT_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  
  // AI Keys
  geminiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '',
  
  // Third Party
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  
  // App Config
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'https://greenli8.vercel.app', 'https://accounts.google.com'],
  emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev'
};

// Log loaded config (masked)
console.log('[Config] Loaded environment variables:', {
  PORT: config.port,
  NODE_ENV: config.nodeEnv,
  DATABASE_URL: config.databaseUrl ? '***' : 'MISSING',
  JWT_SECRET: config.jwtSecret ? '***' : 'MISSING',
  GEMINI_KEY: config.geminiKey ? '***' : 'MISSING',
});

export default config;
