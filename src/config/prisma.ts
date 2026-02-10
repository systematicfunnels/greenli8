import { PrismaClient } from '@prisma/client';
import env from './env.js';

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export default prisma;
