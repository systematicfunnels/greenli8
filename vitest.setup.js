// vitest.setup.js
import { vi } from 'vitest';

process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
process.env.API_KEY = 'test-gemini-key';
process.env.SARVAM_API_KEY = 'test-sarvam-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.NODE_ENV = 'test';
