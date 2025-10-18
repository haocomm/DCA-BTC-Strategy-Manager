import { logger } from '@dca-btc/shared';
import { prisma } from '../utils/database';
import { format } from 'date-fns';

export class CSVExportService {
  async exportExecutions(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      strategyId?: string;
      format?: 'csv' | 'xlsx';
    } = {}
  ): Promise<{ filename: string; data: string }> {
    try {
      const where: any = {
        strategy: { userId },
      };

      if (options.strategyId) {
        where.strategyId = options.strategyId;
      }

      if (options.startDate || options.endDate) {
        where.timestamp = {};
        if (options.startDate) where.timestamp.gte = options.startDate;
        if (options.endDate) where.timestamp.lte = options.endDate;
      }

      const executions = await prisma.execution.findMany({
        where,
        include: {
          strategy: {
            select: {
              name: true,
              pair: true,
              frequency: true,
            },
          },
          exchange: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      const filename = `executions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const csvData = this.generateExecutionsCSV(executions);

      logger.info(`Generated CSV export for user ${userId}: ${executions.length} executions`);
      return { filename, data: csvData };
    } catch (error) {
      logger.error('Failed to export executions to CSV:', error);
      throw error;
    }
  }

  async exportStrategies(userId: string): Promise<{ filename: string; data: string }> {
    try {
      const strategies = await prisma.strategy.findMany({
        where: { userId },
        include: {
          exchange: {
            select: {
              name: true,
              type: true,
            },
          },
          executions: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
          },
          _count: {
            select: {
              executions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const filename = `strategies_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const csvData = this.generateStrategiesCSV(strategies);

      logger.info(`Generated CSV export for user ${userId}: ${strategies.length} strategies`);
      return { filename, data: csvData };
    } catch (error) {
      logger.error('Failed to export strategies to CSV:', error);
      throw error;
    }
  }

  async exportPortfolioSummary(userId: string): Promise<{ filename: string; data: string }> {
    try {
      const [strategies, executions] = await Promise.all([
        prisma.strategy.findMany({
          where: { userId },
          include: {
            executions: true,
            exchange: true,
          },
        }),
        prisma.execution.findMany({
          where: {
            strategy: { userId },
            status: 'COMPLETED',
          },
          include: {
            strategy: true,
          },
        }),
      ]);

      const summary = this.calculatePortfolioSummary(strategies, executions);
      const filename = `portfolio_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const csvData = this.generatePortfolioSummaryCSV(summary);

      logger.info(`Generated portfolio summary CSV for user ${userId}`);
      return { filename, data: csvData };
    } catch (error) {
      logger.error('Failed to export portfolio summary:', error);
      throw error;
    }
  }

  private generateExecutionsCSV(executions: any[]): string {
    const headers = [
      'Timestamp',
      'Strategy Name',
      'Exchange',
      'Pair',
      'Type',
      'Amount',
      'Quantity',
      'Price',
      'Fee',
      'Status',
      'Exchange Order ID',
    ];

    const rows = executions.map(execution => [
      execution.timestamp.toISOString(),
      execution.strategy.name,
      execution.exchange.name,
      execution.strategy.pair,
      execution.type,
      execution.amount.toString(),
      execution.quantity?.toString() || '0',
      execution.price?.toString() || '0',
      execution.fee?.toString() || '0',
      execution.status,
      execution.exchangeOrderId || '',
    ]);

    return this.createCSV(headers, rows);
  }

  private generateStrategiesCSV(strategies: any[]): string {
    const headers = [
      'Strategy Name',
      'Exchange',
      'Pair',
      'Amount',
      'Frequency',
      'Status',
      'Start Date',
      'End Date',
      'Total Executions',
      'Successful Executions',
      'Failed Executions',
      'Success Rate (%)',
      'Total Invested',
      'Average Price',
      'Total Quantity',
    ];

    const rows = strategies.map(strategy => {
      const totalExecutions = strategy.executions.length;
      const successfulExecutions = strategy.executions.filter(e => e.status === 'COMPLETED').length;
      const failedExecutions = strategy.executions.filter(e => e.status === 'FAILED').length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      const totalInvested = strategy.executions
        .filter(e => e.status === 'COMPLETED')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalQuantity = strategy.executions
        .filter(e => e.status === 'COMPLETED')
        .reduce((sum, e) => sum + (e.quantity || 0), 0);
      const averagePrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

      return [
        strategy.name,
        strategy.exchange.name,
        strategy.pair,
        strategy.amount.toString(),
        strategy.frequency,
        strategy.isActive ? 'Active' : 'Paused',
        strategy.startDate.toISOString(),
        strategy.endDate?.toISOString() || '',
        totalExecutions.toString(),
        successfulExecutions.toString(),
        failedExecutions.toString(),
        successRate.toFixed(2),
        totalInvested.toFixed(2),
        averagePrice.toFixed(2),
        totalQuantity.toFixed(8),
      ];
    });

    return this.createCSV(headers, rows);
  }

  private generatePortfolioSummaryCSV(summary: any): string {
    const headers = ['Metric', 'Value', 'Description'];

    const rows = [
      ['Total Strategies', summary.totalStrategies.toString(), 'Number of configured strategies'],
      ['Active Strategies', summary.activeStrategies.toString(), 'Currently active strategies'],
      ['Total Executions', summary.totalExecutions.toString(), 'All-time execution count'],
      ['Successful Executions', summary.successfulExecutions.toString(), 'Completed executions'],
      ['Failed Executions', summary.failedExecutions.toString(), 'Failed executions'],
      ['Overall Success Rate', `${summary.overallSuccessRate.toFixed(2)}%`, 'Success percentage across all strategies'],
      ['Total Invested', `$${summary.totalInvested.toFixed(2)}`, 'Total amount invested'],
      ['Current Portfolio Value', `$${summary.currentValue.toFixed(2)}`, 'Estimated current value'],
      ['Total Profit/Loss', `$${summary.profitLoss.toFixed(2)}`, 'Total profit or loss'],
      ['ROI', `${summary.roi.toFixed(2)}%`, 'Return on investment'],
      ['Best Performing Strategy', summary.bestStrategy.name, 'Strategy with highest ROI'],
      ['Worst Performing Strategy', summary.worstStrategy.name, 'Strategy with lowest ROI'],
      ['Last Updated', new Date().toISOString(), 'Data export timestamp'],
    ];

    return this.createCSV(headers, rows);
  }

  private createCSV(headers: string[], rows: string[][]): string {
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(field => {
          // Escape commas and quotes in fields
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',')
      ),
    ].join('\n');

    // Add UTF-8 BOM for Excel compatibility
    return '\ufeff' + csvContent;
  }

  private calculatePortfolioSummary(strategies: any[], executions: any[]) {
    const totalStrategies = strategies.length;
    const activeStrategies = strategies.filter(s => s.isActive).length;
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'COMPLETED').length;
    const failedExecutions = executions.filter(e => e.status === 'FAILED').length;
    const overallSuccessRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const totalInvested = executions
      .filter(e => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalQuantity = executions
      .filter(e => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + (e.quantity || 0), 0);

    // Mock current value calculation (in real implementation, get current prices)
    const currentValue = totalInvested * 1.15; // Mock 15% growth
    const profitLoss = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    // Calculate best and worst performing strategies
    const strategyPerformance = strategies.map(strategy => {
      const strategyExecutions = executions.filter(e => e.strategyId === strategy.id && e.status === 'COMPLETED');
      const strategyInvested = strategyExecutions.reduce((sum, e) => sum + e.amount, 0);
      const strategyValue = strategyInvested * 1.15; // Mock calculation
      const strategyROI = strategyInvested > 0 ? ((strategyValue - strategyInvested) / strategyInvested) * 100 : 0;

      return {
        name: strategy.name,
        roi: strategyROI,
        invested: strategyInvested,
        value: strategyValue,
      };
    });

    const bestStrategy = strategyPerformance.reduce((best, current) =>
      current.roi > best.roi ? current : best, strategyPerformance[0] || { name: 'N/A' });
    const worstStrategy = strategyPerformance.reduce((worst, current) =>
      current.roi < worst.roi ? current : worst, strategyPerformance[0] || { name: 'N/A' });

    return {
      totalStrategies,
      activeStrategies,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      overallSuccessRate,
      totalInvested,
      currentValue,
      profitLoss,
      roi,
      bestStrategy,
      worstStrategy,
    };
  }
}

export const csvExportService = new CSVExportService();