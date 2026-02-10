import { PrismaClient } from '@prisma/client';
import env from './env.ts';

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export default prisma;
