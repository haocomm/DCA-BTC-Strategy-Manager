import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../utils/database';
import { ExchangeType } from '@dca-btc/shared';

const router = Router();

// Get all exchanges for the authenticated user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const exchanges = await prisma.exchange.findMany({
    where: {
      userId: req.user!.id,
    },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
      // Don't return sensitive data like API keys
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: exchanges,
  });
}));

// Connect a new exchange
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, type, apiKey, apiSecret, passphrase, testnet = false } = req.body;

  // Validate exchange type
  if (!Object.values(ExchangeType).includes(type)) {
    throw createError('Invalid exchange type', 400, 'INVALID_EXCHANGE_TYPE');
  }

  // TODO: Validate API credentials with the exchange
  // This would involve making API calls to the exchange

  // Create exchange record
  const exchange = await prisma.exchange.create({
    data: {
      userId: req.user!.id,
      name,
      type,
      apiKey, // This should be encrypted
      apiSecret, // This should be encrypted
      passphrase, // This should be encrypted if provided
      testnet,
    },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      testnet: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: exchange,
  });
}));

export default router;