import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

const router = Router();

// Get dashboard statistics
router.get('/stats', asyncHandler(async (req, res) => {
  // Get all strategies with execution counts
  const strategies = await prisma.strategy.findMany({
    include: {
      executions: {
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  // Get all exchanges
  const exchanges = await prisma.exchange.findMany({
    where: { isActive: true },
  });

  // Calculate portfolio statistics
  let totalInvested = 0;
  let totalQuantity = 0;
  let totalExecutions = 0;
  let successfulExecutions = 0;
  let activeStrategies = 0;

  const currentPrice = 45000; // Mock current BTC price (in real app, fetch from exchange)

  strategies.forEach(strategy => {
    if (strategy.isActive) activeStrategies++;

    strategy.executions.forEach(execution => {
      totalExecutions++;
      if (execution.status === 'COMPLETED') {
        successfulExecutions++;
        totalInvested += execution.amount;
        totalQuantity += execution.quantity;
      }
    });
  });

  const currentValue = totalQuantity * currentPrice;
  const totalProfit = currentValue - totalInvested;
  const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  // Get recent executions
  const recentExecutions = await prisma.execution.findMany({
    take: 10,
    orderBy: { timestamp: 'desc' },
    include: {
      strategy: {
        select: {
          id: true,
          name: true,
          pair: true,
        },
      },
    },
  });

  // Calculate upcoming executions (mock)
  const upcomingExecutions = strategies
    .filter(s => s.isActive)
    .map(strategy => ({
      id: strategy.id,
      strategyName: strategy.name,
      nextExecution: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000), // Random time in next 24h
      amount: strategy.amount,
      pair: strategy.pair,
    }));

  res.json({
    success: true,
    data: {
      totalStrategies: strategies.length,
      activeStrategies,
      totalExchanges: exchanges.length,
      totalInvested,
      currentValue,
      totalProfit,
      profitPercentage,
      lastExecutions: recentExecutions,
      upcomingExecutions: upcomingExecutions.slice(0, 5),
    },
  });
}));

// Get portfolio performance over time
router.get('/performance', asyncHandler(async (req, res) => {
  const executions = await prisma.execution.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { timestamp: 'asc' },
  });

  // Calculate cumulative investment over time
  let cumulativeInvestment = 0;
  let cumulativeQuantity = 0;
  const performanceData = [];

  executions.forEach(execution => {
    cumulativeInvestment += execution.amount;
    cumulativeQuantity += execution.quantity;

    // Mock historical price (in real app, fetch from exchange API)
    const historicalPrice = execution.price;
    const currentValue = cumulativeQuantity * historicalPrice;

    performanceData.push({
      date: execution.timestamp,
      invested: cumulativeInvestment,
      currentValue,
      quantity: cumulativeQuantity,
      price: historicalPrice,
    });
  });

  res.json({
    success: true,
    data: performanceData,
  });
}));

export default router;