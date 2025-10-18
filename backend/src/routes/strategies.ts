import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../utils/database';
import { logger } from '@dca-btc/shared';

const router = Router();

// Get all strategies for the authenticated user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const strategies = await prisma.strategy.findMany({
    where: {
      userId: req.user!.id,
    },
    include: {
      exchange: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      executions: {
        where: {
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 10,
      },
      _count: {
        select: {
          executions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: strategies,
  });
}));

// Get a single strategy by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const strategy = await prisma.strategy.findFirst({
    where: {
      id,
      userId: req.user!.id,
    },
    include: {
      exchange: true,
      conditions: true,
      executions: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 50,
      },
    },
  });

  if (!strategy) {
    throw createError('Strategy not found', 404, 'STRATEGY_NOT_FOUND');
  }

  res.json({
    success: true,
    data: strategy,
  });
}));

// Create a new strategy
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    name,
    description,
    exchangeId,
    pair,
    amount,
    amountType,
    frequency,
    startDate,
    endDate,
    conditions,
  } = req.body;

  // Validate exchange belongs to user
  const exchange = await prisma.exchange.findFirst({
    where: {
      id: exchangeId,
      userId: req.user!.id,
      isActive: true,
    },
  });

  if (!exchange) {
    throw createError('Exchange not found or inactive', 400, 'EXCHANGE_NOT_FOUND');
  }

  // Parse currency pair
  const [baseCurrency, quoteCurrency] = pair.split(/[-_]/);

  // Create strategy
  const strategy = await prisma.strategy.create({
    data: {
      userId: req.user!.id,
      exchangeId,
      name,
      description,
      pair,
      baseCurrency,
      quoteCurrency,
      amount,
      amountType,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      conditions: conditions ? {
        create: conditions,
      } : undefined,
    },
    include: {
      exchange: true,
      conditions: true,
    },
  });

  logger.info(`Strategy created: ${strategy.id} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: strategy,
  });
}));

// Update a strategy
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if strategy belongs to user
  const existingStrategy = await prisma.strategy.findFirst({
    where: {
      id,
      userId: req.user!.id,
    },
  });

  if (!existingStrategy) {
    throw createError('Strategy not found', 404, 'STRATEGY_NOT_FOUND');
  }

  // Update strategy
  const strategy = await prisma.strategy.update({
    where: { id },
    data: {
      ...updateData,
      startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
    },
    include: {
      exchange: true,
      conditions: true,
    },
  });

  logger.info(`Strategy updated: ${strategy.id} by user ${req.user!.id}`);

  res.json({
    success: true,
    data: strategy,
  });
}));

// Delete a strategy
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if strategy belongs to user
  const existingStrategy = await prisma.strategy.findFirst({
    where: {
      id,
      userId: req.user!.id,
    },
  });

  if (!existingStrategy) {
    throw createError('Strategy not found', 404, 'STRATEGY_NOT_FOUND');
  }

  // Delete strategy (cascade will handle related records)
  await prisma.strategy.delete({
    where: { id },
  });

  logger.info(`Strategy deleted: ${id} by user ${req.user!.id}`);

  res.json({
    success: true,
    message: 'Strategy deleted successfully',
  });
}));

// Activate/deactivate a strategy
router.patch('/:id/toggle', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const strategy = await prisma.strategy.findFirst({
    where: {
      id,
      userId: req.user!.id,
    },
  });

  if (!strategy) {
    throw createError('Strategy not found', 404, 'STRATEGY_NOT_FOUND');
  }

  const updatedStrategy = await prisma.strategy.update({
    where: { id },
    data: {
      isActive: !strategy.isActive,
    },
  });

  logger.info(`Strategy ${updatedStrategy.isActive ? 'activated' : 'deactivated'}: ${id} by user ${req.user!.id}`);

  res.json({
    success: true,
    data: updatedStrategy,
  });
}));

// Get strategy statistics
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const strategy = await prisma.strategy.findFirst({
    where: {
      id,
      userId: req.user!.id,
    },
    include: {
      executions: {
        orderBy: {
          timestamp: 'desc',
        },
      },
    },
  });

  if (!strategy) {
    throw createError('Strategy not found', 404, 'STRATEGY_NOT_FOUND');
  }

  // Calculate statistics
  const totalExecutions = strategy.executions.length;
  const successfulExecutions = strategy.executions.filter(e => e.status === 'COMPLETED').length;
  const failedExecutions = strategy.executions.filter(e => e.status === 'FAILED').length;
  const totalInvested = strategy.executions
    .filter(e => e.status === 'COMPLETED')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalQuantity = strategy.executions
    .filter(e => e.status === 'COMPLETED')
    .reduce((sum, e) => sum + e.quantity, 0);
  const averagePrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

  const lastExecution = strategy.executions[0];
  const nextExecution = strategy.isActive ? calculateNextExecution(strategy.frequency, lastExecution?.timestamp) : null;

  const stats = {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
    totalInvested,
    totalQuantity,
    averagePrice,
    lastExecution,
    nextExecution,
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// Helper function to calculate next execution date
function calculateNextExecution(frequency: string, lastExecution?: Date): Date | null {
  const now = new Date();

  if (!lastExecution) {
    return now;
  }

  const next = new Date(lastExecution);

  switch (frequency) {
    case 'HOURLY':
      next.setHours(next.getHours() + 1);
      break;
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }

  return next;
}

export default router;