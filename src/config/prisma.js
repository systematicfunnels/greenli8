import { PrismaClient } from '@prisma/client';
import env from './env.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: env.databaseUrl
    }
  }
});

// Retry logic for initial connection
let retryCount = 0;
const maxRetries = 3;

const connectWithRetry = async () => {
  try {
    const connectPromise = prisma.$connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    logger.info('Database connected successfully');
  } catch (err) {
    if (retryCount < maxRetries) {
      retryCount++;
      logger.warn(`Database connection attempt ${retryCount} failed. Retrying in 2s...`);
      setTimeout(connectWithRetry, 2000);
    } else {
      logger.error('Database connection failed after retries:', err.message);
    }
  }
};

connectWithRetry();

export default prisma;
