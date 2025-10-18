import { z } from 'zod';
import type { CreateStrategyInput, ConnectExchangeInput, AmountType, Frequency, ExchangeType } from '../types';

// Validation schemas
export const createStrategySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  exchangeId: z.string().min(1),
  pair: z.string().min(1),
  amount: z.number().min(10).max(1000000),
  amountType: z.enum(['fixed', 'percentage']),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'custom']),
  startDate: z.date(),
  endDate: z.date().optional(),
  conditions: z.array(z.object({
    type: z.enum(['price_above', 'price_below', 'rsi_above', 'rsi_below', 'volume_above']),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
    value: z.number(),
    isActive: z.boolean(),
  })).optional(),
});

export const connectExchangeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['binance', 'coinbase', 'kraken']),
  apiKey: z.string().min(10).max(500),
  apiSecret: z.string().min(10).max(500),
  testnet: z.boolean().optional(),
});

// Currency formatting
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount);
};

// Cryptocurrency formatting
export const formatCrypto = (amount: number, symbol = 'BTC'): string => {
  const decimals = symbol === 'BTC' ? 8 : 4;
  return `${amount.toFixed(decimals)} ${symbol}`;
};

// Percentage formatting
export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

// Date formatting
export const formatDate = (date: Date, format = 'medium'): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'short' : 'long',
    day: 'numeric',
    hour: format === 'time' ? 'numeric' : undefined,
    minute: format === 'time' ? 'numeric' : undefined,
  };

  return new Intl.DateTimeFormat('en-US', options).format(date);
};

// Calculate next execution date based on frequency
export const calculateNextExecution = (frequency: Frequency, lastExecution?: Date): Date => {
  const now = lastExecution || new Date();
  const next = new Date(now);

  switch (frequency) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      next.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return next;
};

// Calculate profit/loss
export const calculateProfitLoss = (currentValue: number, totalInvested: number): {
  profit: number;
  percentage: number;
} => {
  const profit = currentValue - totalInvested;
  const percentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  return { profit, percentage };
};

// Validate trading pair format
export const isValidTradingPair = (pair: string): boolean => {
  // Basic validation for common pair formats: BTCUSDT, BTC-USD, etc.
  return /^[A-Z]{2,10}[-]?[A-Z]{3,10}$/.test(pair);
};

// Encrypt/decrypt simple utilities (in production, use proper encryption)
export const simpleEncrypt = (text: string, key: string): string => {
  // This is a placeholder - use proper encryption in production
  return Buffer.from(text).toString('base64');
};

export const simpleDecrypt = (encryptedText: string, key: string): string => {
  // This is a placeholder - use proper decryption in production
  return Buffer.from(encryptedText, 'base64').toString('utf-8');
};

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Sleep utility for async operations
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry utility for API calls
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i)); // Exponential backoff
    }
  }

  throw new Error('Max retries exceeded');
};

// Rate limiting utility
export class RateLimiter {
  private requests: number[] = [];

  constructor(private maxRequests: number, private windowMs: number) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }

    this.requests.push(now);
  }
}

// Validation helpers
export const validateStrategyInput = (input: CreateStrategyInput) => {
  return createStrategySchema.parse(input);
};

export const validateExchangeInput = (input: ConnectExchangeInput) => {
  return connectExchangeSchema.parse(input);
};

// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const createError = (message: string, code: string, statusCode = 500) => {
  return new AppError(message, code, statusCode);
};

// Logging utilities
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, data || '');
    }
  },
};