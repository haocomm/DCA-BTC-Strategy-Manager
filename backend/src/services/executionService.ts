import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { ExchangeFactory, ExecutionStatus } from './exchangeService';
import { EncryptionService } from './encryptionService';
import { WebSocketServer } from 'ws';

interface ExecutionResult {
  success: boolean;
  orderId?: string;
  quantity?: number;
  price?: number;
  error?: string;
}

export class StrategyExecutionService {
  private wss?: WebSocketServer;

  constructor() {
    // Initialize without WebSocket server
  }

  initialize(wss: WebSocketServer): void {
    this.wss = wss;
    logger.info('Execution service initialized with WebSocket server');
  }

  /**
   * Execute a DCA strategy
   */
  async executeStrategy(strategyId: string): Promise<ExecutionResult> {
    try {
      logger.info(`Starting execution for strategy: ${strategyId}`);

      // Get strategy with exchange information
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
        include: {
          exchange: true,
        },
      });

      if (!strategy) {
        throw new Error(`Strategy not found: ${strategyId}`);
      }

      if (!strategy.isActive) {
        throw new Error(`Strategy is not active: ${strategyId}`);
      }

      if (!strategy.exchange.isActive) {
        throw new Error(`Exchange is not active for strategy: ${strategyId}`);
      }

      // Decrypt API credentials
      const decryptedApiKey = EncryptionService.decrypt(strategy.exchange.apiKey);
      const decryptedApiSecret = EncryptionService.decrypt(strategy.exchange.apiSecret);

      // Create exchange instance
      const exchangeInstance = ExchangeFactory.create({
        ...strategy.exchange,
        apiKey: decryptedApiKey,
        apiSecret: decryptedApiSecret,
      });

      // Get current price
      const ticker = await exchangeInstance.getTicker(strategy.pair);
      logger.info(`Current ${strategy.pair} price: $${ticker.price}`);

      // Calculate purchase amount and quantity
      const purchaseAmount = strategy.amount;
      const quantity = purchaseAmount / ticker.price;

      // Create market order
      const order = await exchangeInstance.createMarketOrder(
        strategy.pair,
        'BUY',
        purchaseAmount
      );

      logger.info(`Market order created: ${order.id} for ${strategy.pair}`);

      // Create execution record
      const execution = await prisma.execution.create({
        data: {
          strategyId,
          exchangeId: strategy.exchangeId,
          amount: purchaseAmount,
          price: ticker.price,
          quantity,
          status: order.status === 'FILLED' ? ExecutionStatus.COMPLETED : ExecutionStatus.PENDING,
          exchangeOrderId: order.id,
        },
      });

      // If order is not immediately filled, monitor it
      if (order.status !== 'FILLED') {
        this.monitorOrder(execution.id, order.id, strategy.exchange);
      }

      // Send real-time update
      this.broadcastExecutionUpdate({
        type: 'execution_created',
        data: {
          strategyId,
          executionId: execution.id,
          amount: purchaseAmount,
          quantity,
          price: ticker.price,
          status: execution.status,
        },
      });

      logger.info(`Execution completed: ${execution.id}, Amount: $${purchaseAmount}, Quantity: ${quantity}`);

      return {
        success: true,
        orderId: order.id,
        quantity,
        price: ticker.price,
      };
    } catch (error: any) {
      logger.error(`Strategy execution failed for ${strategyId}:`, error);

      // Create failed execution record
      try {
        const execution = await prisma.execution.create({
          data: {
            strategyId,
            exchangeId: strategyId, // We'll update this in a real implementation
            amount: 0,
            price: 0,
            quantity: 0,
            status: ExecutionStatus.FAILED,
            errorMessage: error.message,
          },
        });

        this.broadcastExecutionUpdate({
          type: 'execution_failed',
          data: {
            strategyId,
            executionId: execution.id,
            error: error.message,
          },
        });
      } catch (dbError) {
        logger.error(`Failed to create failed execution record:`, dbError);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Monitor an order until it's filled or cancelled
   */
  private async monitorOrder(
    executionId: string,
    orderId: string,
    exchange: any
  ): Promise<void> {
    const maxAttempts = 30; // Monitor for up to 5 minutes (30 attempts * 10 seconds)
    let attempts = 0;

    const monitor = async () => {
      try {
        attempts++;

        // Decrypt API credentials
        const decryptedApiKey = EncryptionService.decrypt(exchange.apiKey);
        const decryptedApiSecret = EncryptionService.decrypt(exchange.apiSecret);

        const exchangeInstance = ExchangeFactory.create({
          ...exchange,
          apiKey: decryptedApiKey,
          apiSecret: decryptedApiSecret,
        });

        const order = await exchangeInstance.getOrderStatus(orderId, '');

        if (order.status === 'FILLED') {
          // Update execution record
          await prisma.execution.update({
            where: { id: executionId },
            data: {
              status: ExecutionStatus.COMPLETED,
              price: order.price,
              quantity: order.quantity,
            },
          });

          this.broadcastExecutionUpdate({
            type: 'execution_completed',
            data: {
              executionId,
              orderId,
              finalPrice: order.price,
              finalQuantity: order.quantity,
            },
          });

          logger.info(`Order filled: ${orderId}, Price: $${order.price}, Quantity: ${order.quantity}`);
          return;
        }

        // Continue monitoring if order is still pending
        if (attempts < maxAttempts) {
          setTimeout(monitor, 10000); // Check again in 10 seconds
        } else {
          // Mark as failed after max attempts
          await prisma.execution.update({
            where: { id: executionId },
            data: {
              status: ExecutionStatus.FAILED,
              errorMessage: 'Order monitoring timeout',
            },
          });

          this.broadcastExecutionUpdate({
            type: 'execution_failed',
            data: {
              executionId,
              orderId,
              error: 'Order monitoring timeout',
            },
          });

          logger.warn(`Order monitoring timeout: ${orderId}`);
        }
      } catch (error: any) {
        logger.error(`Error monitoring order ${orderId}:`, error);

        if (attempts < maxAttempts) {
          setTimeout(monitor, 10000);
        }
      }
    };

    // Start monitoring
    setTimeout(monitor, 5000); // Start after 5 seconds
  }

  /**
   * Broadcast execution updates via WebSocket
   */
  private broadcastExecutionUpdate(message: any): void {
    if (!this.wss) return;

    const messageStr = JSON.stringify({
      type: message.type,
      data: message.data,
      timestamp: new Date().toISOString(),
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });

    logger.info(`Broadcasted execution update: ${message.type}`);
  }

  /**
   * Get execution statistics for a strategy
   */
  async getExecutionStats(strategyId: string): Promise<any> {
    const executions = await prisma.execution.findMany({
      where: { strategyId },
      orderBy: { timestamp: 'asc' },
    });

    const completedExecutions = executions.filter(e => e.status === ExecutionStatus.COMPLETED);
    const failedExecutions = executions.filter(e => e.status === ExecutionStatus.FAILED);

    const totalInvested = completedExecutions.reduce((sum, e) => sum + e.amount, 0);
    const totalQuantity = completedExecutions.reduce((sum, e) => sum + e.quantity, 0);
    const averagePrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    return {
      totalExecutions: executions.length,
      completedExecutions: completedExecutions.length,
      failedExecutions: failedExecutions.length,
      successRate: executions.length > 0 ? (completedExecutions.length / executions.length) * 100 : 0,
      totalInvested,
      totalQuantity,
      averagePrice,
      lastExecution: executions.length > 0 ? executions[executions.length - 1].timestamp : null,
    };
  }

  /**
   * Get upcoming executions for dashboard
   */
  async getUpcomingExecutions(): Promise<any[]> {
    const strategies = await prisma.strategy.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        exchange: true,
      },
    });

    // Mock upcoming executions for now
    return strategies.slice(0, 5).map((strategy, index) => ({
      id: strategy.id,
      strategyName: strategy.name,
      nextExecution: new Date(Date.now() + (index + 1) * 60 * 60 * 1000), // Next hour for each
      amount: strategy.amount,
      pair: strategy.pair,
    }));
  }
}

// Export singleton instance
export const executionService = new StrategyExecutionService();