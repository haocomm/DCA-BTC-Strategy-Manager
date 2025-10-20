import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../utils/database';
import { executionService } from '../services/executionService';

const router = Router();

// Get all executions for the authenticated user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = 1, limit = 50, strategyId, status } = req.query;

  const where: any = {
    strategy: {
      userId: req.user!.id,
    },
  };

  if (strategyId) {
    where.strategyId = strategyId;
  }

  if (status) {
    where.status = status;
  }

  const executions = await prisma.execution.findMany({
    where,
    include: {
      strategy: {
        select: {
          id: true,
          name: true,
          pair: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  const total = await prisma.execution.count({ where });

  res.json({
    success: true,
    data: executions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Execute a strategy manually
router.post('/strategies/:id/execute', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const result = await executionService.executeStrategy(id);

  if (result.success) {
    res.json({
      success: true,
      data: {
        orderId: result.orderId,
        quantity: result.quantity,
        price: result.price,
      },
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
    });
  }
}));

// Get execution statistics for a strategy
router.get('/strategies/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    const stats = await executionService.getExecutionStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    throw createError(`Failed to get execution stats: ${error.message}`, 500, 'EXECUTION_STATS_FAILED');
  }
}));

// Get upcoming executions for dashboard
router.get('/upcoming', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const upcomingExecutions = await executionService.getUpcomingExecutions();

    res.json({
      success: true,
      data: upcomingExecutions,
    });
  } catch (error: any) {
    throw createError(`Failed to get upcoming executions: ${error.message}`, 500, 'UPCOMING_EXECUTIONS_FAILED');
  }
}));

export default router;