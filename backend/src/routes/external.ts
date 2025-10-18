import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { logger } from '@dca-btc/shared';

const router = Router();

// TradingView webhook endpoint
router.post('/tradingview', asyncHandler(async (req, res) => {
  const { strategyId, action, symbol, price, quantity, strategy_name } = req.body;

  // Verify webhook secret
  const secret = req.headers['x-webhook-secret'] as string;
  if (secret !== process.env.TRADINGVIEW_WEBHOOK_SECRET) {
    throw createError('Invalid webhook secret', 401, 'INVALID_WEBHOOK_SECRET');
  }

  // Find strategy
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: {
      exchange: true,
    },
  });

  if (!strategy) {
    throw createError('Strategy not found', 404, 'STRATEGY_NOT_FOUND');
  }

  if (!strategy.isActive) {
    throw createError('Strategy is inactive', 400, 'STRATEGY_INACTIVE');
  }

  // Validate trading pair
  if (symbol && symbol !== strategy.pair) {
    logger.warn(`TradingView symbol mismatch: expected ${strategy.pair}, got ${symbol}`);
  }

  try {
    // Process TradingView signal
    const { executionService } = await import('../services/executionService');

    let result;
    if (action === 'buy' || action === 'execute') {
      // Execute strategy based on TradingView signal
      result = await executionService.executeStrategy(strategyId, 'conditional');

      if (result.success) {
        logger.info(`TradingView triggered execution: Strategy ${strategyId} bought at $${price}`);

        // Send success notification
        const { notificationService } = await import('../services/notificationService');
        await notificationService.sendExecutionSuccess(strategy.userId, {
          strategyName: strategy.name,
          pair: strategy.pair,
          amount: strategy.amount,
          quantity: result.quantity,
          price: result.price,
        });
      } else {
        logger.error(`TradingView execution failed: ${result.error}`);
      }
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    res.json({
      success: result?.success || false,
      message: result?.success ? 'Execution triggered successfully' : 'Execution failed',
      data: result?.success ? {
        orderId: result.orderId,
        quantity: result.quantity,
        price: result.price,
      } : null,
    });

  } catch (error) {
    logger.error(`TradingView webhook processing failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
}));

// n8n automation endpoints
router.post('/n8n/trigger-strategy', asyncHandler(async (req, res) => {
  const { strategyId, userId, triggerType, conditions } = req.body;

  // Verify n8n webhook secret
  const secret = req.headers['x-n8n-webhook-secret'] as string;
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    throw createError('Invalid n8n webhook secret', 401, 'INVALID_N8N_SECRET');
  }

  // Find strategy
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
  });

  if (!strategy || !strategy.isActive) {
    throw createError('Strategy not found or inactive', 404, 'STRATEGY_NOT_FOUND');
  }

  try {
    const { executionService } = await import('../services/executionService');
    const result = await executionService.executeStrategy(strategyId, 'conditional');

    logger.info(`n8n triggered execution: Strategy ${strategyId} via ${triggerType}`);

    res.json({
      success: result.success,
      message: result.success ? 'n8n trigger processed successfully' : 'Execution failed',
      data: result.success ? {
        executionId: result.orderId,
        quantity: result.quantity,
        price: result.price,
      } : { error: result.error },
    });

  } catch (error) {
    logger.error(`n8n trigger processing failed:`, error);
    res.status(500).json({
      success: false,
      error: 'n8n trigger processing failed',
    });
  }
}));

// Get strategy status for n8n workflows
router.get('/n8n/strategy-status/:strategyId', asyncHandler(async (req, res) => {
  const { strategyId } = req.params;

  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: {
      executions: {
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
    },
  });

  if (!strategy) {
    throw createError('Strategy not found', 404, 'STRATEGY_NOT_FOUND');
  }

  const status = {
    id: strategy.id,
    name: strategy.name,
    isActive: strategy.isActive,
    pair: strategy.pair,
    amount: strategy.amount,
    frequency: strategy.frequency,
    lastExecutions: strategy.executions.map(e => ({
      id: e.id,
      status: e.status,
      amount: e.amount,
      timestamp: e.timestamp,
    })),
    totalExecutions: strategy.executions.length,
    successfulExecutions: strategy.executions.filter(e => e.status === 'COMPLETED').length,
  };

  res.json({
    success: true,
    data: status,
  });
}));

// Get execution data for external reporting
router.get('/n8n/executions/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, limit = 100 } = req.query;

  const where: any = {
    strategy: { userId },
  };

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate as string);
    if (endDate) where.timestamp.lte = new Date(endDate as string);
  }

  const executions = await prisma.execution.findMany({
    where,
    include: {
      strategy: {
        select: {
          name: true,
          pair: true,
          frequency: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: Number(limit),
  });

  res.json({
    success: true,
    data: executions,
  });
}));

// External API for strategy management (for third-party integrations)
router.post('/api/strategy/:id/execute', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { apiKey, action = 'execute' } = req.body;

  // Simple API key validation (in production, use proper authentication)
  if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
    throw createError('Invalid API key', 401, 'INVALID_API_KEY');
  }

  const strategy = await prisma.strategy.findUnique({
    where: { id },
  });

  if (!strategy || !strategy.isActive) {
    throw createError('Strategy not found or inactive', 404, 'STRATEGY_NOT_FOUND');
  }

  try {
    const { executionService } = await import('../services/executionService');
    const result = await executionService.executeStrategy(id, 'manual');

    logger.info(`External API triggered execution: Strategy ${id}`);

    res.json({
      success: result.success,
      message: result.success ? 'External API execution successful' : 'Execution failed',
      data: result.success ? {
        executionId: result.orderId,
        quantity: result.quantity,
        price: result.price,
      } : { error: result.error },
    });

  } catch (error) {
    logger.error(`External API execution failed:`, error);
    res.status(500).json({
      success: false,
      error: 'External API execution failed',
    });
  }
}));

export default router;