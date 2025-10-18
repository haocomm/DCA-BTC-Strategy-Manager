import axios from 'axios';
import crypto from 'crypto';
import { logger } from '@dca-btc/shared';
import { ExchangeType } from '@dca-btc/shared';

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

export interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

export interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId?: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice?: string;
  icebergQty?: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
}

export class BinanceService {
  private baseURL: string;
  private credentials: BinanceCredentials;

  constructor(credentials: BinanceCredentials) {
    this.credentials = credentials;
    this.baseURL = credentials.testnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
  }

  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.credentials.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    signed: boolean = false
  ): Promise<T> {
    try {
      const baseURL = this.baseURL + endpoint;

      if (signed) {
        params.timestamp = Date.now();
        const queryString = Object.keys(params)
          .sort()
          .map(key => `${key}=${encodeURIComponent(params[key])}`)
          .join('&');
        params.signature = this.createSignature(queryString);
      }

      const headers = {
        'X-MBX-APIKEY': this.credentials.apiKey,
      };

      const response = await axios.get<T>(baseURL, {
        params,
        headers,
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      logger.error('Binance API request failed:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      logger.error('Binance connection test failed:', error);
      return false;
    }
  }

  // Get account information
  async getAccountInfo(): Promise<BinanceAccountInfo> {
    return this.makeRequest<BinanceAccountInfo>('/api/v3/account', {}, true);
  }

  // Get current price for a symbol
  async getPrice(symbol: string): Promise<number> {
    const ticker = await this.makeRequest<BinanceTickerPrice>('/api/v3/ticker/price', {
      symbol,
    });
    return parseFloat(ticker.price);
  }

  // Get 24hr ticker statistics
  async get24hrStats(symbol: string): Promise<any> {
    return this.makeRequest('/api/v3/ticker/24hr', { symbol });
  }

  // Get symbol info
  async getSymbolInfo(symbol: string): Promise<any> {
    const exchangeInfo = await this.makeRequest('/api/v3/exchangeInfo');
    return exchangeInfo.symbols.find((s: any) => s.symbol === symbol);
  }

  // Place a market buy order
  async marketBuy(symbol: string, quoteOrderQty: number): Promise<BinanceOrder> {
    const params = {
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty: quoteOrderQty.toString(),
    };

    return this.makeRequest<BinanceOrder>('/api/v3/order', params, true);
  }

  // Place a market sell order
  async marketSell(symbol: string, quantity: number): Promise<BinanceOrder> {
    const params = {
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: quantity.toString(),
    };

    return this.makeRequest<BinanceOrder>('/api/v3/order', params, true);
  }

  // Place a limit order
  async limitBuy(symbol: string, quantity: number, price: number): Promise<BinanceOrder> {
    const params = {
      symbol,
      side: 'BUY',
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: quantity.toString(),
      price: price.toString(),
    };

    return this.makeRequest<BinanceOrder>('/api/v3/order', params, true);
  }

  // Get order status
  async getOrder(symbol: string, orderId: number): Promise<BinanceOrder> {
    return this.makeRequest<BinanceOrder>('/api/v3/order', {
      symbol,
      orderId,
    }, true);
  }

  // Cancel order
  async cancelOrder(symbol: string, orderId: number): Promise<BinanceOrder> {
    return this.makeRequest<BinanceOrder>('/api/v3/order', {
      symbol,
      orderId,
    }, true);
  }

  // Get open orders
  async getOpenOrders(symbol?: string): Promise<BinanceOrder[]> {
    const params = symbol ? { symbol } : {};
    return this.makeRequest<BinanceOrder[]>('/api/v3/openOrders', params, true);
  }

  // Get order history
  async getOrderHistory(symbol?: string, limit?: number): Promise<BinanceOrder[]> {
    const params: any = {};
    if (symbol) params.symbol = symbol;
    if (limit) params.limit = limit;

    return this.makeRequest<BinanceOrder[]>('/api/v3/allOrders', params, true);
  }

  // Get server time
  async getServerTime(): Promise<number> {
    const time = await this.makeRequest<{ serverTime: number }>('/api/v3/time');
    return time.serverTime;
  }

  // Get exchange info
  async getExchangeInfo(): Promise<any> {
    return this.makeRequest('/api/v3/exchangeInfo');
  }

  // Get balances for specific asset
  async getBalance(asset: string): Promise<{ free: number; locked: number }> {
    const account = await this.getAccountInfo();
    const balance = account.balances.find(b => b.asset === asset);

    if (!balance) {
      return { free: 0, locked: 0 };
    }

    return {
      free: parseFloat(balance.free),
      locked: parseFloat(balance.locked),
    };
  }

  // Execute DCA purchase
  async executeDCA(symbol: string, amount: number): Promise<{
    orderId: string;
    executed: boolean;
    quantity: number;
    price: number;
    fee: number;
    error?: string;
  }> {
    try {
      // Get current price
      const currentPrice = await this.getPrice(symbol);

      // Place market buy order
      const order = await this.marketBuy(symbol, amount);

      if (order.status === 'FILLED') {
        const executedQty = parseFloat(order.executedQty);
        const executedPrice = parseFloat(order.cummulativeQuoteQty) / executedQty;

        return {
          orderId: order.orderId.toString(),
          executed: true,
          quantity: executedQty,
          price: executedPrice,
          fee: 0, // Binance doesn't provide fee in order response
        };
      } else {
        return {
          orderId: order.orderId.toString(),
          executed: false,
          quantity: 0,
          price: 0,
          fee: 0,
          error: `Order not filled. Status: ${order.status}`,
        };
      }
    } catch (error) {
      logger.error('DCA execution failed:', error);
      return {
        orderId: '',
        executed: false,
        quantity: 0,
        price: 0,
        fee: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Validate if trading pair exists
  async validateSymbol(symbol: string): Promise<boolean> {
    try {
      await this.getPrice(symbol);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get trading fees
  async getTradingFees(): Promise<{ maker: number; taker: number }> {
    const account = await this.getAccountInfo();
    return {
      maker: account.makerCommission / 10000,
      taker: account.takerCommission / 10000,
    };
  }
}

export default BinanceService;