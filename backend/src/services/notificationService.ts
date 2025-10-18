import { logger } from '@dca-btc/shared';
import { prisma } from '../utils/database';
import { sendNotification } from '../utils/websocket';

interface NotificationData {
  strategyName?: string;
  pair?: string;
  amount?: number;
  quantity?: number;
  price?: number;
  error?: string;
  lastLogin?: Date;
  activeStrategies?: number;
}

export class NotificationService {
  async sendExecutionSuccess(userId: string, data: NotificationData) {
    try {
      // Create database record
      await prisma.notification.create({
        data: {
          userId,
          type: 'EXECUTION_SUCCESS',
          channel: 'EMAIL', // Default to email, can be extended
          title: 'DCA Purchase Completed',
          message: `Successfully purchased ${data.quantity} BTC at $${data.price} (${data.pair})`,
          data,
        },
      });

      // Send WebSocket notification
      sendNotification(userId, {
        type: 'EXECUTION_SUCCESS',
        title: 'DCA Purchase Completed',
        message: `${data.strategyName}: Bought ${data.quantity} ${data.pair.split('/')[0]} at $${data.price}`,
        data,
      });

      logger.info(`Execution success notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send execution success notification:`, error);
    }
  }

  async sendExecutionFailed(userId: string, data: NotificationData) {
    try {
      // Create database record
      await prisma.notification.create({
        data: {
          userId,
          type: 'EXECUTION_FAILED',
          channel: 'EMAIL',
          title: 'DCA Purchase Failed',
          message: `Failed to execute purchase for ${data.strategyName}: ${data.error}`,
          data,
        },
      });

      // Send WebSocket notification
      sendNotification(userId, {
        type: 'EXECUTION_FAILED',
        title: 'DCA Purchase Failed',
        message: `${data.strategyName}: ${data.error}`,
        data,
      });

      logger.warn(`Execution failure notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send execution failure notification:`, error);
    }
  }

  async sendStrategyCreated(userId: string, data: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'STRATEGY_CREATED',
          channel: 'EMAIL',
          title: 'Strategy Created',
          message: `New DCA strategy "${data.strategyName}" has been created`,
          data,
        },
      });

      sendNotification(userId, {
        type: 'STRATEGY_CREATED',
        title: 'Strategy Created',
        message: `Successfully created strategy: ${data.strategyName}`,
        data,
      });

      logger.info(`Strategy created notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send strategy created notification:`, error);
    }
  }

  async sendStrategyUpdated(userId: string, data: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'STRATEGY_UPDATED',
          channel: 'EMAIL',
          title: 'Strategy Updated',
          message: `DCA strategy "${data.strategyName}" has been updated`,
          data,
        },
      });

      sendNotification(userId, {
        type: 'STRATEGY_UPDATED',
        title: 'Strategy Updated',
        message: `Strategy ${data.strategyName} has been updated`,
        data,
      });

      logger.info(`Strategy updated notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send strategy updated notification:`, error);
    }
  }

  async sendPriceAlert(userId: string, data: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'PRICE_ALERT',
          channel: 'EMAIL',
          title: 'Price Alert',
          message: `${data.pair} is now ${data.price}`,
          data,
        },
      });

      sendNotification(userId, {
        type: 'PRICE_ALERT',
        title: 'Price Alert',
        message: `${data.pair} is now $${data.price}`,
        data,
      });

      logger.info(`Price alert notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send price alert notification:`, error);
    }
  }

  async sendDailySummary(userId: string, data: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM_ANNOUNCEMENT',
          channel: 'EMAIL',
          title: 'Daily Strategy Summary',
          message: `Your strategies executed ${data.totalExecutions} times today. Total invested: $${data.totalInvested}`,
          data,
        },
      });

      sendNotification(userId, {
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Daily Summary',
        message: `Daily execution summary: ${data.successfulExecutions}/${data.totalExecutions} successful`,
        data,
      });

      logger.info(`Daily summary notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send daily summary notification:`, error);
    }
  }

  async sendReEngagementNotification(userId: string, data: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM_ANNOUNCEMENT',
          channel: 'EMAIL',
          title: 'Welcome Back!',
          message: `You have ${data.activeStrategies} active strategies. Check their performance!`,
          data,
        },
      });

      sendNotification(userId, {
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Welcome Back!',
        message: `Your ${data.activeStrategies} active strategies miss you!`,
        data,
      });

      logger.info(`Re-engagement notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send re-engagement notification:`, error);
    }
  }

  async getNotifications(userId: string, limit = 20, offset = 0) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // Email notification methods (placeholders for actual email service)
  private async sendEmail(to: string, subject: string, content: string) {
    // TODO: Implement email sending service
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  }

  // LINE notification methods (placeholders for actual LINE Bot API)
  private async sendLINE(userId: string, message: string) {
    // TODO: Implement LINE Bot API integration
    logger.info(`LINE message sent to user ${userId}: ${message}`);
    return true;
  }

  // Telegram notification methods (placeholders for actual Telegram Bot API)
  private async sendTelegram(chatId: string, message: string) {
    // TODO: Implement Telegram Bot API integration
    logger.info(`Telegram message sent to ${chatId}: ${message}`);
    return true;
  }
}

export const notificationService = new NotificationService();