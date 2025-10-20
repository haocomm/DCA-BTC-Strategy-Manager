import { PrismaClient } from '@prisma/client'
import { jest } from '@jest/globals'

// Mock Prisma Client for testing
jest.mock('../utils/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    strategy: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    exchange: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    execution: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}))

// Mock WebSocket for testing
jest.mock('../utils/websocket', () => ({
  setupWebSocket: jest.fn(),
  broadcastToUser: jest.fn(),
  broadcastToAll: jest.fn(),
  sendStrategyUpdate: jest.fn(),
  sendExecutionUpdate: jest.fn(),
  sendNotification: jest.fn(),
  sendPriceUpdate: jest.fn(),
}))

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.DATABASE_URL = 'file:./test.db'

// Global test utilities
global.createTestUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed-password',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

global.createTestStrategy = () => ({
  id: 'test-strategy-id',
  userId: 'test-user-id',
  exchangeId: 'test-exchange-id',
  name: 'Test Strategy',
  pair: 'BTCUSDT',
  amount: 100,
  amountType: 'FIXED',
  frequency: 'DAILY',
  startDate: new Date(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

global.createTestExecution = () => ({
  id: 'test-execution-id',
  strategyId: 'test-strategy-id',
  exchangeId: 'test-exchange-id',
  amount: 100,
  price: 50000,
  quantity: 0.002,
  status: 'COMPLETED',
  timestamp: new Date(),
  createdAt: new Date(),
})

// Declare global test utilities
declare global {
  var createTestUser: () => any
  var createTestStrategy: () => any
  var createTestExecution: () => any
  var generateTestToken: (payload?: any) => string
}

// Helper to generate JWT tokens for testing
global.generateTestToken = (payload: any = {}) => {
  const jwt = require('jsonwebtoken')
  return jwt.sign(
    { userId: 'test-user-id', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}