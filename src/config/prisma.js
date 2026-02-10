import { PrismaClient } from '@prisma/client';
import env from './env.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export default prisma;
