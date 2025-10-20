import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Define the types inline to avoid workspace dependency issues
export interface Exchange {
  id: string;
  userId: string;
  name: string;
  type: string;
  apiKey: string;
  apiSecret: string;
  isActive: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface Execution {
  id: string;
  strategyId: string;
  exchangeId: string;
  amount: number;
  price: number;
  quantity: number;
  status: ExecutionStatus;
  errorMessage?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface ExchangeBalance {
  currency: string;
  free: number;
  locked: number;
  total: number;
}

export interface ExchangeTicker {
  symbol: string;
  price: number;
  volume24h: number;
  change24h: number;
}

export interface ExchangeOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  amount: number;
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export abstract class BaseExchange {
  protected name: string;
  protected apiKey: string;
  protected apiSecret: string;
  protected testnet: boolean;

  constructor(name: string, apiKey: string, apiSecret: string, testnet: boolean = false) {
    this.name = name;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.testnet = testnet;
  }

  abstract getBalances(): Promise<ExchangeBalance[]>;
  abstract getTicker(symbol: string): Promise<ExchangeTicker>;
  abstract createMarketOrder(symbol: string, side: 'BUY' | 'SELL', amount: number): Promise<ExchangeOrder>;
  abstract getOrderStatus(orderId: string, symbol: string): Promise<ExchangeOrder>;
  abstract getSupportedPairs(): Promise<string[]>;
  abstract validateCredentials(): Promise<boolean>;

  protected log(message: string, data?: any) {
    logger.info(`[${this.name}] ${message}`, data);
  }

  protected logError(message: string, error: any) {
    logger.error(`[${this.name}] ${message}`, error);
  }
}

export class BinanceExchange extends BaseExchange {
  private baseUrl: string;
  private feeRate = 0.001; // 0.1% standard fee

  constructor(apiKey: string, apiSecret: string, testnet: boolean = false) {
    super('Binance', apiKey, apiSecret, testnet);
    this.baseUrl = testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(`timestamp=${timestamp}`);

      const response = await axios.get(`${this.baseUrl}/api/v3/account`, {
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
        params: {
          timestamp,
          signature,
        },
      });

      return response.data.balances
        .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .map((balance: any): ExchangeBalance => ({
          currency: balance.asset,
          free: parseFloat(balance.free),
          locked: parseFloat(balance.locked),
          total: parseFloat(balance.free) + parseFloat(balance.locked),
        }));
    } catch (error: any) {
      this.logError('Failed to get balances', error);
      throw new Error(`Failed to fetch balances: ${error.response?.data?.msg || error.message}`);
    }
  }

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/ticker/24hr`, {
        params: { symbol: this.formatSymbol(symbol) },
      });

      const data = response.data;
      return {
        symbol,
        price: parseFloat(data.lastPrice),
        volume24h: parseFloat(data.volume),
        change24h: parseFloat(data.priceChangePercent),
      };
    } catch (error: any) {
      this.logError('Failed to get ticker', error);
      throw new Error(`Failed to fetch ticker: ${error.response?.data?.msg || error.message}`);
    }
  }

  async createMarketOrder(symbol: string, side: 'BUY' | 'SELL', amount: number): Promise<ExchangeOrder> {
    try {
      const timestamp = Date.now();
      const params = new URLSearchParams({
        symbol: this.formatSymbol(symbol),
        side,
        type: 'MARKET',
        quoteOrderQty: amount.toString(),
        timestamp: timestamp.toString(),
      });

      const signature = this.generateSignature(params.toString());

      const response = await axios.post(`${this.baseUrl}/api/v3/order`, params.toString(), {
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
          signature,
        },
      });

      const fills = response.data.fills || [];
      const totalQuantity = fills.reduce((sum: number, fill: any) => sum + parseFloat(fill.qty), 0);
      const avgPrice = fills.reduce((sum: number, fill: any) => sum + parseFloat(fill.price) * parseFloat(fill.qty), 0) / totalQuantity;

      return {
        id: response.data.orderId.toString(),
        symbol,
        side,
        type: 'MARKET',
        quantity: totalQuantity,
        price: avgPrice,
        amount: amount,
        status: response.data.status === 'FILLED' ? 'FILLED' : 'PENDING',
        createdAt: new Date(response.data.transactTime),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      this.logError('Failed to create market order', error);
      throw new Error(`Failed to create order: ${error.response?.data?.msg || error.message}`);
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<ExchangeOrder> {
    try {
      const timestamp = Date.now();
      const params = new URLSearchParams({
        symbol: this.formatSymbol(symbol),
        orderId,
        timestamp: timestamp.toString(),
      });

      const signature = this.generateSignature(params.toString());

      const response = await axios.get(`${this.baseUrl}/api/v3/order`, {
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
        params: {
          ...Object.fromEntries(params),
          signature,
        },
      });

      return {
        id: response.data.orderId.toString(),
        symbol,
        side: response.data.side as 'BUY' | 'SELL',
        type: response.data.type as 'MARKET' | 'LIMIT',
        quantity: parseFloat(response.data.executedQty),
        price: parseFloat(response.data.price) || undefined,
        amount: parseFloat(response.data.cummulativeQuoteQty),
        status: response.data.status as ExchangeOrder['status'],
        createdAt: new Date(response.data.time),
        updatedAt: new Date(response.data.updateTime),
      };
    } catch (error: any) {
      this.logError('Failed to get order status', error);
      throw new Error(`Failed to get order status: ${error.response?.data?.msg || error.message}`);
    }
  }

  async getSupportedPairs(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/exchangeInfo`);
      return response.data.symbols
        .filter((symbol: any) => symbol.status === 'TRADING')
        .map((symbol: any) => `${symbol.baseAsset}/${symbol.quoteAsset}`);
    } catch (error: any) {
      this.logError('Failed to get supported pairs', error);
      throw new Error(`Failed to fetch supported pairs: ${error.response?.data?.msg || error.message}`);
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(`timestamp=${timestamp}`);

      const response = await axios.get(`${this.baseUrl}/api/v3/account`, {
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
        params: {
          timestamp,
          signature,
        },
      });

      return response.status === 200;
    } catch (error) {
      this.logError('Failed to validate credentials', error);
      return false;
    }
  }

  private generateSignature(params: string): string {
    return crypto.createHmac('sha256', this.apiSecret).update(params).digest('hex');
  }

  private formatSymbol(symbol: string): string {
    return symbol.replace('/', '');
  }
}

export class CoinbaseExchange extends BaseExchange {
  private baseUrl: string;
  private passphrase?: string;

  constructor(apiKey: string, apiSecret: string, testnet: boolean = false, passphrase?: string) {
    super('Coinbase', apiKey, apiSecret, testnet);
    this.baseUrl = testnet ? 'https://api-public.sandbox.pro.coinbase.com' : 'https://api.pro.coinbase.com';
    this.passphrase = passphrase;
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    try {
      const response = await this.makeAuthenticatedRequest('/accounts');

      return response.data
        .filter((account: any) => parseFloat(account.balance) > 0)
        .map((account: any): ExchangeBalance => ({
          currency: account.currency,
          free: parseFloat(account.available),
          locked: parseFloat(account.balance) - parseFloat(account.available),
          total: parseFloat(account.balance),
        }));
    } catch (error: any) {
      this.logError('Failed to get balances', error);
      throw new Error(`Failed to fetch balances: ${error.response?.data?.message || error.message}`);
    }
  }

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    try {
      const response = await axios.get(`${this.baseUrl}/products/${this.formatSymbol(symbol)}/ticker`);
      const statsResponse = await axios.get(`${this.baseUrl}/products/${this.formatSymbol(symbol)}/stats`);

      return {
        symbol,
        price: parseFloat(response.data.price),
        volume24h: parseFloat(statsResponse.data.volume),
        change24h: 0, // Coinbase doesn't provide 24h change directly
      };
    } catch (error: any) {
      this.logError('Failed to get ticker', error);
      throw new Error(`Failed to fetch ticker: ${error.response?.data?.message || error.message}`);
    }
  }

  async createMarketOrder(symbol: string, side: 'BUY' | 'SELL', amount: number): Promise<ExchangeOrder> {
    try {
      const response = await this.makeAuthenticatedRequest('/orders', 'POST', {
        product_id: this.formatSymbol(symbol),
        side: side.toLowerCase(),
        type: 'market',
        funds: amount.toString(),
      });

      return {
        id: response.data.id,
        symbol,
        side,
        type: 'MARKET',
        quantity: parseFloat(response.data.filled_size || '0'),
        price: response.data.executed_value ? parseFloat(response.data.executed_value) / parseFloat(response.data.filled_size || '1') : undefined,
        amount: amount,
        status: response.data.status.toUpperCase() as ExchangeOrder['status'],
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      this.logError('Failed to create market order', error);
      throw new Error(`Failed to create order: ${error.response?.data?.message || error.message}`);
    }
  }

  async getOrderStatus(orderId: string, symbol: string): Promise<ExchangeOrder> {
    try {
      const response = await this.makeAuthenticatedRequest('/orders/' + orderId);

      return {
        id: response.data.id,
        symbol,
        side: response.data.side.toUpperCase() as 'BUY' | 'SELL',
        type: response.data.type.toUpperCase() as 'MARKET' | 'LIMIT',
        quantity: parseFloat(response.data.filled_size || '0'),
        price: response.data.executed_value ? parseFloat(response.data.executed_value) / parseFloat(response.data.filled_size || '1') : undefined,
        amount: parseFloat(response.data.executed_value || '0'),
        status: response.data.status.toUpperCase() as ExchangeOrder['status'],
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.done_at || response.data.created_at),
      };
    } catch (error: any) {
      this.logError('Failed to get order status', error);
      throw new Error(`Failed to get order status: ${error.response?.data?.message || error.message}`);
    }
  }

  async getSupportedPairs(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/products`);
      return response.data
        .filter((product: any) => product.status === 'online')
        .map((product: any) => `${product.base_currency}/${product.quote_currency}`);
    } catch (error: any) {
      this.logError('Failed to get supported pairs', error);
      throw new Error(`Failed to fetch supported pairs: ${error.response?.data?.message || error.message}`);
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest('/accounts');
      return response.status === 200;
    } catch (error) {
      this.logError('Failed to validate credentials', error);
      return false;
    }
  }

  private async makeAuthenticatedRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
    const timestamp = Date.now() / 1000;
    const message = `${timestamp}${method}${endpoint}${data ? JSON.stringify(data) : ''}`;

    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');

    const headers = {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp.toString(),
      'CB-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
    };

    const config = {
      method,
      url: this.baseUrl + endpoint,
      headers,
    };

    if (data) {
      // @ts-ignore
      config.data = data;
    }

    return axios(config);
  }

  private formatSymbol(symbol: string): string {
    return symbol.replace('/', '-');
  }
}

export class ExchangeFactory {
  static create(exchange: Exchange): BaseExchange {
    switch (exchange.type) {
      case 'BINANCE':
        return new BinanceExchange(exchange.apiKey, exchange.apiSecret, false);
      case 'BINANCE_TESTNET':
        return new BinanceExchange(exchange.apiKey, exchange.apiSecret, true);
      case 'COINBASE':
        return new CoinbaseExchange(exchange.apiKey, exchange.apiSecret, false);
      case 'COINBASE_TESTNET':
        return new CoinbaseExchange(exchange.apiKey, exchange.apiSecret, true);
      default:
        throw new Error(`Unsupported exchange type: ${exchange.type}`);
    }
  }

  static async validateConnection(exchange: Exchange): Promise<boolean> {
    try {
      const instance = this.create(exchange);
      return await instance.validateCredentials();
    } catch (error) {
      logger.error(`Failed to validate connection for ${exchange.name}:`, error);
      return false;
    }
  }

  static async testConnection(exchange: Omit<Exchange, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    const testExchange: Exchange = {
      id: 'test',
      userId: 'test',
      ...exchange,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.validateConnection(testExchange);
  }
}

export { Exchange, Execution, ExecutionStatus };