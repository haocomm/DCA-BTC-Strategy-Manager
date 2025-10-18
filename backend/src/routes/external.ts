import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { logger } from '@dca-btc/shared';

const router = Router();

// TradingView webhook endpoint
router.post('/tradingview', asyncHandler(async (req, res) => {
  const { strategyId, action, symbol, price } = req.body;

  // Verify webhook secret
  const secret = req.headers['x-webhook-secret'] as string;
  if (secret !== process.env.TRADINGVIEW_WEBHOOK_SECRET) {
    throw createError('Invalid webhook secret', 401, 'INVALID_WEBHOOK_SECRET');
  }

  // Find strategy
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
  });

  if (!strategy || !strategy.isActive) {
    throw createError('Strategy not found or inactive', 404, 'STRATEGY_NOT_FOUND');
  }

  // TODO: Process TradingView signal
  // This would trigger strategy execution based on the signal

  logger.info(`TradingView webhook received for strategy ${strategyId}: ${action} at ${price}`);

  res.json({
    success: true,
    message: 'Webhook processed successfully',
  });
}));

export default router;