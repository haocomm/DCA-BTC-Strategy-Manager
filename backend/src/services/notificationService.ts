import { logger } from '@dca-btc/shared';
import { prisma } from '../utils/database';

export class NotificationService {
  async sendDailySummary(userId: string, data: any) {
    // TODO: Implement daily summary email/notification
    logger.info(`Sending daily summary to user ${userId}`);
  }

  async sendReEngagementNotification(userId: string, data: any) {
    // TODO: Implement re-engagement notification
    logger.info(`Sending re-engagement notification to user ${userId}`);
  }
}

export const notificationService = new NotificationService();