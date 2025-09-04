import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

let prisma: PrismaClient | null = null;

export const connectDatabase = async (): Promise<PrismaClient> => {
  try {
    if (!prisma) {
      prisma = new PrismaClient({
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

      // Log database queries in development
      if (process.env.NODE_ENV === 'development') {
        // Query logging (cast to any to bypass strict event typing variance)
        (prisma as any).$on('query', (e: any) => {
          logger.debug('Database Query:', { query: e.query, params: e.params, duration: `${e.duration}ms` });
        });
      }

      // Log database errors
  (prisma as any).$on('error', (e: any) => { logger.error('Database Error:', e); });

      // Test connection
      await prisma.$connect();
      logger.info('Database connected successfully');
    }

    return prisma;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      logger.info('Database disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    throw error;
  }
};

export const getDatabase = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return prisma;
};

export { prisma };
