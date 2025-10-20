import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../utils/database';
import { notificationChannelsService } from '../services/notificationChannelsService';

const router = Router();

// Get all notifications for the authenticated user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = 1, limit = 20, unread = false } = req.query;

  const where: any = {
    userId: req.user!.id,
  };

  if (unread === 'true') {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  const total = await prisma.notification.count({ where });

  res.json({
    success: true,
    data: notifications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Get user notification settings
router.get('/settings', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    // TODO: Implement user notification settings in database
    // For now, return default settings
    const settings = {
      email: {
        enabled: true,
        address: 'user@example.com', // TODO: Get from user profile
      },
      line: {
        enabled: false,
        accessToken: '',
        userId: '',
      },
      telegram: {
        enabled: false,
        botToken: '',
        chatId: '',
      },
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    throw createError(`Failed to get notification settings: ${error.message}`, 500, 'NOTIFICATION_SETTINGS_FAILED');
  }
}));

// Update notification settings
router.patch('/settings', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { email, line, telegram } = req.body;

  try {
    // TODO: Update user notification settings in database
    // For now, just validate and log

    // Validate LINE configuration
    if (line && line.enabled) {
      const lineValidation = notificationChannelsService.validateChannelConfig('LINE', line);
      if (!lineValidation.valid) {
        throw createError(lineValidation.error, 400, 'INVALID_LINE_CONFIG');
      }
    }

    // Validate Telegram configuration
    if (telegram && telegram.enabled) {
      const telegramValidation = notificationChannelsService.validateChannelConfig('TELEGRAM', telegram);
      if (!telegramValidation.valid) {
        throw createError(telegramValidation.error, 400, 'INVALID_TELEGRAM_CONFIG');
      }
    }

    const settings = {
      email: email || { enabled: true },
      line: line || { enabled: false },
      telegram: telegram || { enabled: false },
    };

    logger.info(`Notification settings updated for user ${req.user!.id}:`, settings);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    throw createError(`Failed to update notification settings: ${error.message}`, 500, 'NOTIFICATION_SETTINGS_UPDATE_FAILED');
  }
}));

// Test notification channel
router.post('/test/:channel', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { channel } = req.params;
  const { config } = req.body;

  try {
    let success = false;

    switch (channel) {
      case 'line':
        if (!config.accessToken || !config.userId) {
          throw createError('LINE access token and user ID required', 400, 'MISSING_LINE_CONFIG');
        }

        success = await notificationChannelsService.testLINEConnection(config.accessToken);
        break;

      case 'telegram':
        if (!config.botToken) {
          throw createError('Telegram bot token required', 400, 'MISSING_TELEGRAM_CONFIG');
        }

        success = await notificationChannelsService.testTelegramConnection(config.botToken);
        break;

      default:
        throw createError('Invalid notification channel', 400, 'INVALID_CHANNEL');
    }

    res.json({
      success,
      message: success ? `${channel} connection test successful` : `${channel} connection test failed`,
    });
  } catch (error: any) {
    throw createError(`Notification test failed: ${error.message}`, 500, 'NOTIFICATION_TEST_FAILED');
  }
}));

export default router;