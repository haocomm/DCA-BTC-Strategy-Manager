import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationChannelsService } from '../services/notificationChannelsService';

const router = Router();

// LINE webhook endpoint
router.post('/line', asyncHandler(async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'] as string;
    const body = JSON.stringify(req.body);

    // TODO: Store LINE channel secret securely and verify signature
    // const channelSecret = process.env.LINE_CHANNEL_SECRET;
    // const isValid = notificationChannelsService.verifyLINEWebhook(body, signature, channelSecret);

    // if (!isValid) {
    //   throw createError('Invalid LINE signature', 401, 'INVALID_SIGNATURE');
    // }

    logger.info('LINE webhook received:', req.body);

    // Handle LINE webhook events
    if (req.body.events && Array.isArray(req.body.events)) {
      for (const event of req.body.events) {
        await handleLINEEvent(event);
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('LINE webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}));

// Telegram webhook endpoint
router.post('/telegram', asyncHandler(async (req, res) => {
  try {
    logger.info('Telegram webhook received:', req.body);

    const isValid = notificationChannelsService.verifyTelegramWebhook(req.body);

    if (!isValid) {
      throw createError('Invalid Telegram webhook', 401, 'INVALID_WEBHOOK');
    }

    // Handle Telegram webhook events
    if (req.body.message) {
      await handleTelegramMessage(req.body.message);
    }

    res.status(200).json({ ok: true });
  } catch (error: any) {
    logger.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}));

// Handle LINE webhook events
async function handleLINEEvent(event: any) {
  switch (event.type) {
    case 'follow':
      // User added the bot
      logger.info(`LINE follow event from user ${event.source.userId}`);
      // TODO: Store user LINE ID in database
      break;

    case 'unfollow':
      // User removed the bot
      logger.info(`LINE unfollow event from user ${event.source.userId}`);
      // TODO: Remove user LINE ID from database
      break;

    case 'message':
      // User sent message to bot
      logger.info(`LINE message from user ${event.source.userId}: ${event.message.text}`);
      // TODO: Handle bot commands
      break;

    default:
      logger.warn(`Unknown LINE event type: ${event.type}`);
  }
}

// Handle Telegram webhook events
async function handleTelegramMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;

  logger.info(`Telegram message from chat ${chatId}: ${text}`);

  // Handle basic commands
  if (text.startsWith('/start')) {
    // TODO: Send welcome message and instructions
    logger.info(`Telegram start command received from chat ${chatId}`);
  } else if (text.startsWith('/status')) {
    // TODO: Send strategy status
    logger.info(`Telegram status command received from chat ${chatId}`);
  } else if (text.startsWith('/help')) {
    // TODO: Send help message
    logger.info(`Telegram help command received from chat ${chatId}`);
  }
}

// Get webhook setup information
router.get('/info', asyncHandler(async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      data: {
        baseUrl,
        lineWebhook: notificationChannelsService.getLINEWebhookUrl(baseUrl),
        telegramWebhook: notificationChannelsService.getTelegramWebhookUrl(baseUrl, 'TEMP_BOT_TOKEN'), // TODO: Use actual bot token
      },
    });
  } catch (error: any) {
    throw createError(`Failed to get webhook info: ${error.message}`, 500, 'WEBHOOK_INFO_FAILED');
  }
}));

export default router;