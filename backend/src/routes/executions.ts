import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../utils/database';

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

export default router;