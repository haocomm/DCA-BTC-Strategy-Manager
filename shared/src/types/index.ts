// Core entity types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exchange {
  id: string;
  userId: string;
  name: string;
  type: ExchangeType;
  apiKey: string; // encrypted
  apiSecret: string; // encrypted
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Strategy {
  id: string;
  userId: string;
  exchangeId: string;
  name: string;
  description?: string;
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  amount: number;
  amountType: AmountType;
  frequency: Frequency;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  conditions?: StrategyCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Execution {
  id: string;
  strategyId: string;
  exchangeOrderId?: string;
  amount: number;
  price: number;
  quantity: number;
  fee?: number;
  status: ExecutionStatus;
  type: ExecutionType;
  errorMessage?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  sentAt?: Date;
  createdAt: Date;
}

// Enums
export enum ExchangeType {
  BINANCE = 'binance',
  COINBASE = 'coinbase',
  KRAKEN = 'kraken',
}

export enum AmountType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export enum Frequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ExecutionType {
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
  CONDITIONAL = 'conditional',
}

export enum NotificationType {
  EXECUTION_SUCCESS = 'execution_success',
  EXECUTION_FAILED = 'execution_failed',
  STRATEGY_CREATED = 'strategy_created',
  STRATEGY_UPDATED = 'strategy_updated',
  STRATEGY_DELETED = 'strategy_deleted',
  PRICE_ALERT = 'price_alert',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export enum NotificationChannel {
  EMAIL = 'email',
  LINE = 'line',
  TELEGRAM = 'telegram',
}

// Additional types for strategy conditions
export interface StrategyCondition {
  id: string;
  type: ConditionType;
  operator: ConditionOperator;
  value: number;
  isActive: boolean;
}

export enum ConditionType {
  PRICE_ABOVE = 'price_above',
  PRICE_BELOW = 'price_below',
  RSI_ABOVE = 'rsi_above',
  RSI_BELOW = 'rsi_below',
  VOLUME_ABOVE = 'volume_above',
}

export enum ConditionOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUAL = 'eq',
  GREATER_EQUAL = 'gte',
  LESS_EQUAL = 'lte',
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard types
export interface DashboardStats {
  totalStrategies: number;
  activeStrategies: number;
  totalInvested: number;
  currentValue: number;
  totalProfit: number;
  profitPercentage: number;
  lastExecutions: Execution[];
  upcomingExecutions: ScheduledExecution[];
}

export interface ScheduledExecution {
  id: string;
  strategyId: string;
  strategyName: string;
  nextExecution: Date;
  amount: number;
  pair: string;
}

// Configuration types
export interface ExchangeConfig {
  id: string;
  name: string;
  displayName: string;
  supportedPairs: string[];
  fees: {
    maker: number;
    taker: number;
  };
  features: string[];
}

export interface NotificationConfig {
  line: {
    isEnabled: boolean;
    accessToken?: string;
    userId?: string;
  };
  telegram: {
    isEnabled: boolean;
    botToken?: string;
    chatId?: string;
  };
  email: {
    isEnabled: boolean;
    address?: string;
  };
}

// Form types
export interface CreateStrategyInput {
  name: string;
  description?: string;
  exchangeId: string;
  pair: string;
  amount: number;
  amountType: AmountType;
  frequency: Frequency;
  startDate: Date;
  endDate?: Date;
  conditions?: Omit<StrategyCondition, 'id'>[];
}

export interface UpdateStrategyInput extends Partial<CreateStrategyInput> {
  isActive?: boolean;
}

export interface ConnectExchangeInput {
  name: string;
  type: ExchangeType;
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}