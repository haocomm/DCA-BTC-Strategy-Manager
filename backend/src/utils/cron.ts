import * as cron from 'node-cron';
import { logger } from '@dca-btc/shared';
import { prisma } from './database';
import { executionService } from '../services/executionService';
import { priceService } from '../services/priceService';
import { notificationService } from '../services/notificationService';

const activeJobs = new Map<string, cron.ScheduledTask>();

export async function setupCronJobs() {
  logger.info('Setting up cron jobs...');

  // Clean up old system logs (daily at 2 AM)
  scheduleJob(
    'clean-logs',
    '0 2 * * *',
    async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deletedLogs = await prisma.systemLog.deleteMany({
          where: {
            timestamp: {
              lt: thirtyDaysAgo,
            },
          },
        });

        logger.info(`Cleaned up ${deletedLogs.count} old log entries`);
      } catch (error) {
        logger.error('Failed to clean up old logs:', error);
      }
    }
  );

  // Update price data for all tracked pairs (every 5 minutes)
  scheduleJob(
    'update-prices',
    '*/5 * * * *',
    async () => {
      try {
        await priceService.updateAllPrices();
        logger.debug('Price data updated');
      } catch (error) {
        logger.error('Failed to update price data:', error);
      }
    }
  );

  // Check and execute scheduled strategies (every minute)
  scheduleJob(
    'execute-strategies',
    '* * * * *',
    async () => {
      try {
        await executionService.checkAndExecuteScheduledStrategies();
      } catch (error) {
        logger.error('Failed to execute scheduled strategies:', error);
      }
    }
  );

  // Send daily summary reports (daily at 8 PM)
  scheduleJob(
    'daily-summary',
    '0 20 * * *',
    async () => {
      try {
        await sendDailySummaryReports();
      } catch (error) {
        logger.error('Failed to send daily summary reports:', error);
      }
    }
  );

  // Check for inactive users and send re-engagement notifications (weekly on Mondays at 9 AM)
  scheduleJob(
    'user-engagement',
    '0 9 * * 1',
    async () => {
      try {
        await checkUserEngagement();
      } catch (error) {
        logger.error('Failed to check user engagement:', error);
      }
    }
  );

  // Cleanup expired sessions (every 6 hours)
  scheduleJob(
    'cleanup-sessions',
    '0 */6 * * *',
    async () => {
      try {
        const deletedSessions = await prisma.session.deleteMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
        });

        logger.info(`Cleaned up ${deletedSessions.count} expired sessions`);
      } catch (error) {
        logger.error('Failed to cleanup expired sessions:', error);
      }
    }
  );

  logger.info(`Cron jobs setup complete. Active jobs: ${activeJobs.size}`);
}

export function scheduleJob(name: string, cronExpression: string, task: () => Promise<void>) {
  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression for job ${name}: ${cronExpression}`);
    return;
  }

  // Cancel existing job if it exists
  if (activeJobs.has(name)) {
    activeJobs.get(name)?.stop();
    activeJobs.delete(name);
  }

  // Schedule new job
  const scheduledTask = cron.schedule(cronExpression, async () => {
    try {
      logger.debug(`Running cron job: ${name}`);
      await task();
      logger.debug(`Completed cron job: ${name}`);
    } catch (error) {
      logger.error(`Cron job ${name} failed:`, error);
    }
  }, {
    scheduled: false,
  });

  activeJobs.set(name, scheduledTask);
  scheduledTask.start();

  logger.info(`Scheduled cron job: ${name} (${cronExpression})`);
}

export function cancelJob(name: string) {
  const job = activeJobs.get(name);
  if (job) {
    job.stop();
    activeJobs.delete(name);
    logger.info(`Cancelled cron job: ${name}`);
  }
}

export function getActiveJobs(): string[] {
  return Array.from(activeJobs.keys());
}

export function stopAllJobs() {
  activeJobs.forEach((job, name) => {
    job.stop();
    logger.info(`Stopped cron job: ${name}`);
  });
  activeJobs.clear();
  logger.info('All cron jobs stopped');
}

// Helper functions for specific tasks
async function sendDailySummaryReports() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      settings: {
        emailNotifications: true,
      },
    },
    include: {
      strategies: {
        where: {
          isActive: true,
        },
      },
    },
  });

  for (const user of users) {
    if (user.strategies.length === 0) continue;

    try {
      // Get today's executions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const executions = await prisma.execution.findMany({
        where: {
          strategy: {
            userId: user.id,
          },
          timestamp: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          strategy: true,
        },
      });

      // Calculate summary
      const totalInvested = executions.reduce((sum, exec) => sum + exec.amount, 0);
      const successfulExecutions = executions.filter(e => e.status === 'COMPLETED').length;
      const failedExecutions = executions.filter(e => e.status === 'FAILED').length;

      await notificationService.sendDailySummary(user.id, {
        totalStrategies: user.strategies.length,
        totalInvested,
        successfulExecutions,
        failedExecutions,
        date: today.toISOString().split('T')[0],
      });

    } catch (error) {
      logger.error(`Failed to send daily summary to user ${user.id}:`, error);
    }
  }
}

async function checkUserEngagement() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const inactiveUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      lastLoginAt: {
        lt: thirtyDaysAgo,
      },
      strategies: {
        some: {
          isActive: true,
        },
      },
    },
  });

  for (const user of inactiveUsers) {
    try {
      await notificationService.sendReEngagementNotification(user.id, {
        lastLogin: user.lastLoginAt,
        activeStrategies: await prisma.strategy.count({
          where: {
            userId: user.id,
            isActive: true,
          },
        }),
      });
    } catch (error) {
      logger.error(`Failed to send re-engagement notification to user ${user.id}:`, error);
    }
  }
}