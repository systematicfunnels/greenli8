import app from './src/app.js';
import env from './src/config/env.js';
import prisma from './src/config/prisma.js';
import logger from './src/utils/logger.js';

const server = app.listen(env.port, () => {
  logger.info(`Enterprise server running on ${env.port}`);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
