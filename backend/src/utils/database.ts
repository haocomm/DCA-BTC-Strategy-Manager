import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Log Prisma events
prisma.$on('query', e => {
  logger.debug('Query: ' + e.query);
  logger.debug('Params: ' + e.params);
  logger.debug('Duration: ' + e.duration + 'ms');
});

prisma.$on('error', e => {
  logger.error('Prisma Error: ' + e.message);
});

prisma.$on('info', e => {
  logger.info('Prisma Info: ' + e.message);
});

prisma.$on('warn', e => {
  logger.warn('Prisma Warning: ' + e.message);
});

export async function setupDatabase() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established');

    // Run any pending migrations
    // Note: In production, you should run migrations separately
    // This is just for development convenience
    if (process.env.NODE_ENV === 'development') {
      logger.info('Database is ready for development');
    }

    return prisma;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    throw error;
  }
}

export { prisma };
export default prisma;