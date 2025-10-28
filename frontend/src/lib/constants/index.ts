// Exchange configurations
export const EXCHANGE_CONFIGS = {
  binance: {
    id: 'binance',
    name: 'Binance',
    displayName: 'Binance',
    baseUrl: 'https://api.binance.com',
    testnetUrl: 'https://testnet.binance.vision',
    supportedPairs: [
      'BTCUSDT',
      'BTCBUSD',
      'ETHUSDT',
      'ETHBTC',
      'ADAUSDT',
      'DOTUSDT',
      'LINKUSDT',
      'LTCUSDT',
      'BCHUSDT',
      'XLMUSDT',
    ],
    fees: {
      maker: 0.001,
      taker: 0.001,
    },
    features: ['spot', 'futures', 'margin', 'savings'],
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase',
    displayName: 'Coinbase Pro',
    baseUrl: 'https://api.pro.coinbase.com',
    supportedPairs: [
      'BTC-USD',
      'ETH-USD',
      'ETH-BTC',
      'LTC-USD',
      'BCH-USD',
      'XLM-USD',
      'ADA-USD',
      'DOT-USD',
      'LINK-USD',
      'UNI-USD',
    ],
    fees: {
      maker: 0.005,
      taker: 0.005,
    },
    features: ['spot', 'margin'],
  },
  kraken: {
    id: 'kraken',
    name: 'Kraken',
    displayName: 'Kraken',
    baseUrl: 'https://api.kraken.com',
    supportedPairs: [
      'XXBTZUSD',
      'XETHXXBT',
      'XXBTZEUR',
      'XETHZUSD',
      'XXRPXXBT',
      'XLTCXXBT',
      'XXLMXXBT',
      'XADAXXBT',
      'XXDGXXBT',
      'XXBTXXBT',
    ],
    fees: {
      maker: 0.0026,
      taker: 0.0026,
    },
    features: ['spot', 'margin', 'futures'],
  },
} as const;

// Frequency configurations (in cron format)
export const FREQUENCY_CRON = {
  hourly: '0 * * * *',
  daily: '0 0 * * *',
  weekly: '0 0 * * 0',
  monthly: '0 0 1 * *',
} as const;

// Default strategy settings
export const DEFAULT_STRATEGY_SETTINGS = {
  minAmount: 10, // USD
  maxAmount: 100000, // USD
  defaultAmount: 100, // USD
  maxActiveStrategies: 50,
  maxConditionsPerStrategy: 10,
} as const;

// Notification templates
export const NOTIFICATION_TEMPLATES = {
  execution_success: {
    title: 'DCA Purchase Completed',
    message:
      'Successfully purchased {quantity} {baseCurrency} at ${price} ({pair})',
  },
  execution_failed: {
    title: 'DCA Purchase Failed',
    message: 'Failed to execute purchase for {strategyName}: {error}',
  },
  strategy_created: {
    title: 'Strategy Created',
    message: 'New DCA strategy "{strategyName}" has been created',
  },
  price_alert: {
    title: 'Price Alert',
    message: '{pair} is now {direction} ${targetPrice}',
  },
} as const;

// API rate limits
export const API_RATE_LIMITS = {
  binance: {
    requestsPerMinute: 1200,
    ordersPerSecond: 10,
  },
  coinbase: {
    requestsPerSecond: 10,
    ordersPerSecond: 50,
  },
  kraken: {
    requestsPerMinute: 15,
    ordersPerSecond: 5,
  },
} as const;

// Validation constants
export const VALIDATION_RULES = {
  strategyName: {
    minLength: 1,
    maxLength: 100,
  },
  amount: {
    min: 10,
    max: 1000000,
  },
  apiKey: {
    minLength: 10,
    maxLength: 500,
  },
  description: {
    maxLength: 500,
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_API_KEY: 'Invalid API key or secret',
  INSUFFICIENT_BALANCE: 'Insufficient balance for execution',
  INVALID_PAIR: 'Trading pair not supported',
  RATE_LIMIT_EXCEEDED: 'API rate limit exceeded',
  NETWORK_ERROR: 'Network connection error',
  STRATEGY_NOT_FOUND: 'Strategy not found',
  EXCHANGE_NOT_CONNECTED: 'Exchange not connected or inactive',
  INVALID_AMOUNT: 'Invalid investment amount',
  INVALID_FREQUENCY: 'Invalid frequency setting',
  EXECUTION_FAILED: 'Order execution failed',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  STRATEGY_CREATED: 'Strategy created successfully',
  STRATEGY_UPDATED: 'Strategy updated successfully',
  STRATEGY_DELETED: 'Strategy deleted successfully',
  EXCHANGE_CONNECTED: 'Exchange connected successfully',
  EXECUTION_SUCCESS: 'Order executed successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const;

// WebSocket events
export const WS_EVENTS = {
  STRATEGY_UPDATE: 'strategy_update',
  EXECUTION_UPDATE: 'execution_update',
  PRICE_UPDATE: 'price_update',
  BALANCE_UPDATE: 'balance_update',
  NOTIFICATION: 'notification',
} as const;

// Export types
export type ExchangeConfigType =
  (typeof EXCHANGE_CONFIGS)[keyof typeof EXCHANGE_CONFIGS];
export type FrequencyCronType =
  (typeof FREQUENCY_CRON)[keyof typeof FREQUENCY_CRON];
