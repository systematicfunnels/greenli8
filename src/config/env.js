import dotenv from 'dotenv';
dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY'];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

export default {
  port: process.env.PORT || 4242,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  
  // AI Keys
  geminiKey: process.env.API_KEY || process.env.GEMINI_API_KEY,
  sarvamKey: process.env.SARVAM_API_KEY,
  openRouterKey: process.env.OPENROUTER_API_KEY,
  
  // Third Party
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  
  // App Config
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'https://greenli8.vercel.app'],
  emailFrom: process.env.EMAIL_FROM || 'Greenli8 AI <onboarding@resend.dev>'
};
