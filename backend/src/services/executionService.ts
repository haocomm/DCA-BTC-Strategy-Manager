import { logger, calculateNextExecution, FREQUENCY_CRON } from '@dca-btc/shared';
import { prisma } from '../utils/database';
import BinanceService from './binanceService';
import { notificationService } from './notificationService';
import { sendExecutionUpdate, sendStrategyUpdate } from '../utils/websocket';

interface ExecutionResult {
  success: boolean;
  orderId?: string;
  quantity?: number;
  price?: number;
  fee?: number;
  error?: string;
}

export class ExecutionService {
  private binanceServices = new Map<string, BinanceService>();

  async checkAndExecuteScheduledStrategies(): Promise<void> {
    try {
      logger.debug('Checking for scheduled strategy executions...');

      // Get all active scheduled strategies that need execution
      const now = new Date();
      const scheduledJobs = await prisma.scheduledJob.findMany({
        where: {
          isActive: true,
          nextRunAt: {
            lte: now,
          },
        },
        include: {
          strategy: {
            include: {
              exchange: true,
            },
          },
        },
      });

      logger.info(`Found ${scheduledJobs.length} strategies to execute`);

      // Execute each strategy
      for (const job of scheduledJobs) {
        try {
          await this.executeStrategy(job.strategyId, 'scheduled');

          // Update next execution time
          const nextRun = this.calculateNextRun(job.strategy.frequency, job.lastRunAt || now);
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: {
              nextRunAt: nextRun,
              lastRunAt: now,
              runCount: { increment: 1 },
            },
          });

        } catch (error) {
          logger.error(`Failed to execute strategy ${job.strategyId}:`, error);

          // Update failure count
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: {
              failureCount: { increment: 1 },
            },
          });

          // Send failure notification
          await notificationService.sendExecutionFailed(job.strategy.userId, {
            strategyName: job.strategy.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

    } catch (error) {
      logger.error('Error checking scheduled executions:', error);
    }
  }

  async executeStrategy(strategyId: string, type: 'scheduled' | 'manual' | 'conditional'): Promise<ExecutionResult> {
    try {
      // Get strategy with exchange details
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
        include: {
          exchange: true,
          conditions: true,
        },
      });

      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      if (!strategy.isActive) {
        throw new Error(`Strategy ${strategyId} is not active`);
      }

      if (!strategy.exchange.isActive) {
        throw new Error(`Exchange ${strategy.exchange.name} is not active`);
      }

      // Check conditions if this is a conditional execution
      if (type === 'conditional' && strategy.conditions.length > 0) {
        const conditionsMet = await this.checkConditions(strategy.conditions, strategy.pair);
        if (!conditionsMet) {
          return { success: false, error: 'Execution conditions not met' };
        }
      }

      // Create execution record
      const execution = await prisma.execution.create({
        data: {
          strategyId,
          amount: strategy.amount,
          status: 'PENDING',
          type: type.toUpperCase(),
          timestamp: new Date(),
        },
      });

      logger.info(`Starting execution ${execution.id} for strategy ${strategyId} (${type})`);

      // Send WebSocket update
      sendExecutionUpdate(strategy.userId, execution);

      // Get exchange service
      const exchangeService = await this.getExchangeService(strategy.exchange);

      // Execute the trade
      const result = await this.performDCAExecution(exchangeService, strategy.pair, strategy.amount);

      // Update execution record
      const updatedExecution = await prisma.execution.update({
        where: { id: execution.id },
        data: {
          exchangeOrderId: result.orderId,
          quantity: result.quantity,
          price: result.price,
          fee: result.fee,
          status: result.success ? 'COMPLETED' : 'FAILED',
          errorMessage: result.error,
        },
      });

      // Send updates
      sendExecutionUpdate(strategy.userId, updatedExecution);
      sendStrategyUpdate(strategy.userId, strategy);

      // Send notifications
      if (result.success) {
        await notificationService.sendExecutionSuccess(strategy.userId, {
          strategyName: strategy.name,
          pair: strategy.pair,
          amount: strategy.amount,
          quantity: result.quantity,
          price: result.price,
        });
      } else {
        await notificationService.sendExecutionFailed(strategy.userId, {
          strategyName: strategy.name,
          error: result.error,
        });
      }

      logger.info(`Execution ${execution.id} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);

      return result;

    } catch (error) {
      logger.error(`Strategy execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async performDCAExecution(
    exchangeService: BinanceService,
    pair: string,
    amount: number
  ): Promise<ExecutionResult> {
    try {
      // Execute DCA purchase
      const result = await exchangeService.executeDCA(pair, amount);

      if (result.executed) {
        return {
          success: true,
          orderId: result.orderId,
          quantity: result.quantity,
          price: result.price,
          fee: result.fee,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Execution failed',
        };
      }

    } catch (error) {
      logger.error('DCA execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution error',
      };
    }
  }

  private async checkConditions(conditions: any[], pair: string): Promise<boolean> {
    // For now, always return true for conditional executions
    // In a real implementation, you would check price, RSI, volume conditions
    logger.debug(`Checking ${conditions.length} conditions for ${pair}`);
    return true;
  }

  private async getExchangeService(exchange: any): Promise<BinanceService> {
    // Decrypt API keys (in production, use proper encryption)
    const apiKey = exchange.apiKey; // await decrypt(exchange.apiKey)
    const apiSecret = exchange.apiSecret; // await decrypt(exchange.apiSecret)

    const cacheKey = `${exchange.id}-${exchange.type}`;

    if (!this.binanceServices.has(cacheKey)) {
      this.binanceServices.set(cacheKey, new BinanceService({
        apiKey,
        apiSecret,
        testnet: exchange.testnet,
      }));
    }

    return this.binanceServices.get(cacheKey)!;
  }

  private calculateNextRun(frequency: string, lastRun: Date): Date {
    const next = new Date(lastRun);

    switch (frequency) {
      case 'HOURLY':
        next.setHours(next.getHours() + 1);
        break;
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        next.setHours(next.getHours() + 1);
    }

    return next;
  }

  async scheduleStrategy(strategyId: string): Promise<void> {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });

      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      const nextRun = this.calculateNextRun(strategy.frequency, new Date());

      await prisma.scheduledJob.upsert({
        where: { strategyId },
        update: {
          nextRunAt: nextRun,
          isActive: true,
        },
        create: {
          strategyId,
          cronExpression: FREQUENCY_CRON[strategy.frequency.toLowerCase() as keyof typeof FREQUENCY_CRON],
          nextRunAt: nextRun,
          isActive: true,
        },
      });

      logger.info(`Scheduled strategy ${strategyId} for ${nextRun.toISOString()}`);

    } catch (error) {
      logger.error(`Failed to schedule strategy ${strategyId}:`, error);
      throw error;
    }
  }

  async unscheduleStrategy(strategyId: string): Promise<void> {
    try {
      await prisma.scheduledJob.update({
        where: { strategyId },
        data: { isActive: false },
      });

      logger.info(`Unscheduled strategy ${strategyId}`);

    } catch (error) {
      logger.error(`Failed to unschedule strategy ${strategyId}:`, error);
      throw error;
    }
  }

  async getExecutionHistory(strategyId?: string, limit = 50): Promise<any[]> {
    const where = strategyId ? { strategyId } : {};

    return await prisma.execution.findMany({
      where,
      include: {
        strategy: {
          select: {
            name: true,
            pair: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getExecutionStats(strategyId: string): Promise<any> {
    const executions = await prisma.execution.findMany({
      where: { strategyId },
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'COMPLETED').length;
    const failedExecutions = executions.filter(e => e.status === 'FAILED').length;
    const totalInvested = executions
      .filter(e => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      totalInvested,
    };
  }
}

export const executionService = new ExecutionService();