import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

const router = Router();

// Get all exchanges for the authenticated user
router.get('/', asyncHandler(async (req, res) => {
  // For demo purposes, return all exchanges
  const exchanges = await prisma.exchange.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: exchanges.map(exchange => ({
      ...exchange,
      testnet: exchange.type.includes('TESTNET'),
    })),
  });
}));

// Create a new exchange connection
router.post('/', asyncHandler(async (req, res) => {
  const { name, type, apiKey, apiSecret, testnet = false } = req.body;

  // For demo purposes, create with a hardcoded user ID
  const exchange = await prisma.exchange.create({
    data: {
      userId: 'demo-user-id', // In real app, get from auth token
      name,
      type,
      apiKey,
      apiSecret,
      isActive: true,
    },
  });

  logger.info(`Exchange connected: ${name} (${type})`);

  res.status(201).json({
    success: true,
    data: exchange,
  });
}));

// Update exchange
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const exchange = await prisma.exchange.update({
    where: { id },
    data: { isActive },
  });

  res.json({
    success: true,
    data: exchange,
  });
}));

// Delete exchange
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.exchange.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Exchange deleted successfully',
  });
}));

export default router;