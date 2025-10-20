import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { ExchangeFactory } from '../services/exchangeService';
import { EncryptionService } from '../services/encryptionService';

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

// Test exchange connection before saving
router.post('/test-connection', asyncHandler(async (req, res) => {
  const { name, type, apiKey, apiSecret, testnet = false } = req.body;

  try {
    // Test the connection without saving to database
    const exchangeType = testnet ? `${type}_TESTNET` : type;
    const isValid = await ExchangeFactory.testConnection({
      name,
      type: exchangeType,
      apiKey,
      apiSecret,
      isActive: true,
    });

    if (!isValid) {
      throw createError('Invalid API credentials or connection failed', 400, 'INVALID_CREDENTIALS');
    }

    res.json({
      success: true,
      message: 'Exchange connection test successful',
    });
  } catch (error) {
    if (error.code === 'INVALID_CREDENTIALS') {
      throw error;
    }
    throw createError('Exchange connection test failed', 400, 'CONNECTION_FAILED');
  }
}));

// Get exchange balances
router.get('/:id/balances', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exchange = await prisma.exchange.findUnique({
    where: { id },
  });

  if (!exchange) {
    throw createError('Exchange not found', 404, 'EXCHANGE_NOT_FOUND');
  }

  try {
    // Decrypt API credentials
    const decryptedApiKey = EncryptionService.decrypt(exchange.apiKey);
    const decryptedApiSecret = EncryptionService.decrypt(exchange.apiSecret);

    const exchangeInstance = ExchangeFactory.create({
      ...exchange,
      apiKey: decryptedApiKey,
      apiSecret: decryptedApiSecret,
    });

    const balances = await exchangeInstance.getBalances();

    res.json({
      success: true,
      data: balances,
    });
  } catch (error: any) {
    throw createError(`Failed to fetch balances: ${error.message}`, 500, 'BALANCE_FETCH_FAILED');
  }
}));

// Get supported trading pairs for an exchange
router.get('/:id/pairs', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exchange = await prisma.exchange.findUnique({
    where: { id },
  });

  if (!exchange) {
    throw createError('Exchange not found', 404, 'EXCHANGE_NOT_FOUND');
  }

  try {
    // Decrypt API credentials
    const decryptedApiKey = EncryptionService.decrypt(exchange.apiKey);
    const decryptedApiSecret = EncryptionService.decrypt(exchange.apiSecret);

    const exchangeInstance = ExchangeFactory.create({
      ...exchange,
      apiKey: decryptedApiKey,
      apiSecret: decryptedApiSecret,
    });

    const pairs = await exchangeInstance.getSupportedPairs();

    res.json({
      success: true,
      data: pairs.filter(pair => pair.includes('BTC/')), // Focus on BTC pairs
    });
  } catch (error: any) {
    throw createError(`Failed to fetch trading pairs: ${error.message}`, 500, 'PAIRS_FETCH_FAILED');
  }
}));

// Create a new exchange connection
router.post('/', asyncHandler(async (req, res) => {
  const { name, type, apiKey, apiSecret, testnet = false } = req.body;

  try {
    // Encrypt API credentials before storing
    const encryptedApiKey = EncryptionService.encrypt(apiKey);
    const encryptedApiSecret = EncryptionService.encrypt(apiSecret);

    const exchangeType = testnet ? `${type}_TESTNET` : type;

    // For demo purposes, create with a hardcoded user ID
    const exchange = await prisma.exchange.create({
      data: {
        userId: 'demo-user-id', // In real app, get from auth token
        name,
        type: exchangeType,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        isActive: true,
      },
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

    logger.info(`Exchange connected: ${name} (${exchangeType})`);

    res.status(201).json({
      success: true,
      data: {
        ...exchange,
        testnet: exchange.type.includes('TESTNET'),
      },
    });
  } catch (error: any) {
    throw createError(`Failed to create exchange connection: ${error.message}`, 500, 'EXCHANGE_CREATE_FAILED');
  }
}));

// Update exchange
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive, name, apiKey, apiSecret, testnet } = req.body;

  const updateData: any = {};

  if (typeof isActive === 'boolean') {
    updateData.isActive = isActive;
  }

  if (name) {
    updateData.name = name;
  }

  if (apiKey && apiSecret) {
    updateData.apiKey = EncryptionService.encrypt(apiKey);
    updateData.apiSecret = EncryptionService.encrypt(apiSecret);

    if (testnet !== undefined) {
      const exchange = await prisma.exchange.findUnique({ where: { id } });
      if (exchange) {
        const baseType = exchange.type.replace('_TESTNET', '');
        updateData.type = testnet ? `${baseType}_TESTNET` : baseType;
      }
    }
  }

  const exchange = await prisma.exchange.update({
    where: { id },
    data: updateData,
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
    data: {
      ...exchange,
      testnet: exchange.type.includes('TESTNET'),
    },
  });
}));

// Delete exchange
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if exchange has active strategies
  const activeStrategies = await prisma.strategy.count({
    where: {
      exchangeId: id,
      isActive: true,
    },
  });

  if (activeStrategies > 0) {
    throw createError(
      `Cannot delete exchange with ${activeStrategies} active strategies. Please deactivate or delete the strategies first.`,
      400,
      'EXCHANGE_HAS_ACTIVE_STRATEGIES'
    );
  }

  await prisma.exchange.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Exchange deleted successfully',
  });
}));

export default router;