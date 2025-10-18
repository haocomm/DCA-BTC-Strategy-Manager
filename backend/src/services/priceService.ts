import { logger } from '@dca-btc/shared';
import { prisma } from '../utils/database';

export class PriceService {
  async updateAllPrices() {
    // TODO: Implement price fetching from exchanges
    logger.debug('Updating price data...');
  }

  async getCurrentPrice(pair: string) {
    // TODO: Implement current price fetching
    logger.debug(`Getting current price for ${pair}`);
    return 0;
  }
}

export const priceService = new PriceService();