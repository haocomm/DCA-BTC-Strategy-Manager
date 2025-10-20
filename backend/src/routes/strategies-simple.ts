import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

const router = Router();

// Get all strategies for the authenticated user
router.get('/', asyncHandler(async (req, res) => {
  // For demo purposes, return all strategies with exchange info
  const strategies = await prisma.strategy.findMany({
    include: {
      exchange: {
        select: {
          id: true,
          name: true,
          type: true,
        },
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

// Get a single strategy
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const strategy = await prisma.strategy.findUnique({
    where: { id },
    include: {
      exchange: true,
      executions: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 10,
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
router.post('/', asyncHandler(async (req, res) => {
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
  } = req.body;

  // For demo purposes, create with a hardcoded user ID
  const strategy = await prisma.strategy.create({
    data: {
      userId: 'demo-user-id', // In real app, get from auth token
      name,
      description,
      exchangeId,
      pair,
      amount: parseFloat(amount),
      amountType,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
    },
    include: {
      exchange: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  logger.info(`Strategy created: ${name} for ${pair}`);

  res.status(201).json({
    success: true,
    data: strategy,
  });
}));

// Update strategy
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const strategy = await prisma.strategy.update({
    where: { id },
    data: { isActive },
  });

  res.json({
    success: true,
    data: strategy,
  });
}));

// Delete strategy
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.strategy.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Strategy deleted successfully',
  });
}));

// Get strategy executions
router.get('/:id/executions', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [executions, total] = await Promise.all([
    prisma.execution.findMany({
      where: { strategyId: id },
      orderBy: { timestamp: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.execution.count({
      where: { strategyId: id },
    }),
  ]);

  res.json({
    success: true,
    data: executions,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

export default router;