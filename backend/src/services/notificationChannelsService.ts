import { logger } from '../utils/logger';
import axios from 'axios';

export interface NotificationChannel {
  type: 'LINE' | 'TELEGRAM' | 'EMAIL';
  enabled: boolean;
  config?: any;
}

export interface NotificationMessage {
  title: string;
  message: string;
  data?: any;
}

export class NotificationChannelsService {
  /**
   * Send LINE notification
   */
  async sendLINE(accessToken: string, userId: string, message: NotificationMessage): Promise<boolean> {
    try {
      const lineApiUrl = 'https://api.line.me/v2/bot/message/push';

      const response = await axios.post(lineApiUrl, {
        to: userId,
        messages: [{
          type: 'text',
          text: `${message.title}\n\n${message.message}`,
        }],
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        logger.info(`LINE notification sent successfully to user ${userId}`);
        return true;
      } else {
        logger.error(`LINE notification failed: ${response.data?.message}`);
        return false;
      }
    } catch (error: any) {
      logger.error(`Error sending LINE notification:`, error);
      return false;
    }
  }

  /**
   * Send Telegram notification
   */
  async sendTelegram(botToken: string, chatId: string, message: NotificationMessage): Promise<boolean> {
    try {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

      const response = await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: `🔔 ${message.title}\n\n${message.message}`,
        parse_mode: 'HTML',
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.ok) {
        logger.info(`Telegram notification sent successfully to chat ${chatId}`);
        return true;
      } else {
        logger.error(`Telegram notification failed: ${response.data.description}`);
        return false;
      }
    } catch (error: any) {
      logger.error(`Error sending Telegram notification:`, error);
      return false;
    }
  }

  /**
   * Test LINE connection
   */
  async testLINEConnection(accessToken: string): Promise<boolean> {
    try {
      const lineApiUrl = 'https://api.line.me/v2/bot/info';

      const response = await axios.get(lineApiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      logger.error('LINE connection test failed:', error);
      return false;
    }
  }

  /**
   * Test Telegram connection
   */
  async testTelegramConnection(botToken: string): Promise<boolean> {
    try {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/getMe`;

      const response = await axios.get(telegramApiUrl);

      return response.data.ok;
    } catch (error) {
      logger.error('Telegram connection test failed:', error);
      return false;
    }
  }

  /**
   * Send notification to all enabled channels
   */
  async sendNotification(
    channels: NotificationChannel[],
    message: NotificationMessage,
    lineConfig?: { accessToken: string; userId: string },
    telegramConfig?: { botToken: string; chatId: string }
  ): Promise<{ line: boolean; telegram: boolean; email: boolean }> {
    const results = {
      line: false,
      telegram: false,
      email: false,
    };

    const promises: Promise<boolean>[] = [];

    // Send LINE notification if enabled
    if (channels.some(c => c.type === 'LINE' && c.enabled)) {
      if (!lineConfig) {
        logger.warn('LINE channel enabled but no config provided');
      } else {
        promises.push(
          this.sendLINE(lineConfig.accessToken, lineConfig.userId, message)
            .then(success => {
              results.line = success;
            })
        );
      }
    }

    // Send Telegram notification if enabled
    if (channels.some(c => c.type === 'TELEGRAM' && c.enabled)) {
      if (!telegramConfig) {
        logger.warn('Telegram channel enabled but no config provided');
      } else {
        promises.push(
          this.sendTelegram(telegramConfig.botToken, telegramConfig.chatId, message)
            .then(success => {
              results.telegram = success;
            })
        );
      }
    }

    // For email, we'd implement email service here
    const emailEnabled = channels.some(c => c.type === 'EMAIL' && c.enabled);
    if (emailEnabled) {
      // TODO: Implement email sending
      results.email = false;
      logger.info('Email notification would be sent here');
    }

    // Wait for all notifications to be sent
    await Promise.all(promises);

    return results;
  }

  /**
   * Validate notification channel configuration
   */
  validateChannelConfig(type: 'LINE' | 'TELEGRAM', config: any): { valid: boolean; error?: string } {
    if (type === 'LINE') {
      if (!config.accessToken || !config.userId) {
        return { valid: false, error: 'LINE access token and user ID are required' };
      }
    } else if (type === 'TELEGRAM') {
      if (!config.botToken || !config.chatId) {
        return { valid: false, error: 'Telegram bot token and chat ID are required' };
      }
    }

    return { valid: true };
  }

  /**
   * Get LINE webhook URL format
   */
  getLINEWebhookUrl(baseUrl: string): string {
    return `${baseUrl}/api/webhooks/line`;
  }

  /**
   * Get Telegram webhook URL format
   */
  getTelegramWebhookUrl(baseUrl: string, botToken: string): string {
    return `${baseUrl}/api/webhooks/telegram`;
  }

  /**
   * Verify LINE webhook signature
   */
  verifyLINEWebhook(body: string, signature: string, channelSecret: string): boolean {
    const crypto = require('crypto');

    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64');

    return hash === signature;
  }

  /**
   * Verify Telegram webhook
   */
  verifyTelegramWebhook(update: any): boolean {
    // Basic validation for Telegram webhook
    return update &&
           update.message &&
           update.message.from &&
           update.message.text;
  }
}

export const notificationChannelsService = new NotificationChannelsService();