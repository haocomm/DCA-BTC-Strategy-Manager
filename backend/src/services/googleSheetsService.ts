import { logger } from '@dca-btc/shared';
import { google } from 'googleapis';
import { prisma } from '../utils/database';

interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
}

export class GoogleSheetsService {
  private sheets: any;
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    this.initializeSheets();
  }

  private async initializeSheets() {
    try {
      const auth = new google.auth.JWT(
        this.config.clientEmail,
        undefined,
        this.config.privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      this.sheets = google.sheets({ version: 'v4', auth });
      logger.info('Google Sheets service initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  async createSpreadsheet(title: string): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title,
          },
          sheets: [
            {
              properties: {
                title: 'Executions',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10,
                },
              },
            },
            {
              properties: {
                title: 'Strategies',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 8,
                },
              },
            },
            {
              properties: {
                title: 'Summary',
                gridProperties: {
                  rowCount: 50,
                  columnCount: 6,
                },
              },
            },
          ],
        },
      });

      const spreadsheetId = response.data.spreadsheetId;
      await this.setupHeaders(spreadsheetId);

      logger.info(`Created Google Sheet: ${spreadsheetId}`);
      return spreadsheetId;
    } catch (error) {
      logger.error('Failed to create spreadsheet:', error);
      throw error;
    }
  }

  private async setupHeaders(spreadsheetId: string) {
    try {
      // Set up headers for Executions sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Executions!A1:J1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              'Timestamp',
              'Strategy Name',
              'Pair',
              'Type',
              'Amount',
              'Quantity',
              'Price',
              'Fee',
              'Status',
              'Exchange Order ID'
            ],
          ],
        },
      });

      // Set up headers for Strategies sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Strategies!A1:H1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              'Strategy Name',
              'Exchange',
              'Pair',
              'Amount',
              'Frequency',
              'Status',
              'Total Executions',
              'Success Rate'
            ],
          ],
        },
      });

      // Set up headers for Summary sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary!A1:F1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              'Metric',
              'Value',
              'Description',
              'Last Updated',
            ],
          ],
        },
      });

      logger.info('Headers set up for all sheets');
    } catch (error) {
      logger.error('Failed to setup headers:', error);
      throw error;
    }
  }

  async addExecution(executionData: any) {
    try {
      const values = [
        [
          executionData.timestamp,
          executionData.strategyName,
          executionData.pair,
          executionData.type,
          executionData.amount,
          executionData.quantity,
          executionData.price,
          executionData.fee || 0,
          executionData.status,
          executionData.exchangeOrderId || '',
        ],
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Executions!A2',
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });

      logger.info(`Added execution to Google Sheets: ${executionData.strategyName}`);
    } catch (error) {
      logger.error('Failed to add execution to Google Sheets:', error);
      throw error;
    }
  }

  async updateStrategySummary(strategyData: any) {
    try {
      // Find existing strategy row or add new
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Strategies!A2:H',
      });

      const rows = response.data.values || [];
      const existingRowIndex = rows.findIndex(row => row[0] === strategyData.name);

      const values = [
        [
          strategyData.name,
          strategyData.exchange,
          strategyData.pair,
          strategyData.amount,
          strategyData.frequency,
          strategyData.isActive ? 'Active' : 'Paused',
          strategyData.totalExecutions,
          `${strategyData.successRate}%`,
        ],
      ];

      if (existingRowIndex >= 0) {
        // Update existing row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `Strategies!A${existingRowIndex + 2}:H${existingRowIndex + 2}`,
          valueInputOption: 'RAW',
          requestBody: { values },
        });
      } else {
        // Add new row
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.config.spreadsheetId,
          range: 'Strategies!A2',
          valueInputOption: 'RAW',
          requestBody: { values },
        });
      }

      logger.info(`Updated strategy summary in Google Sheets: ${strategyData.name}`);
    } catch (error) {
      logger.error('Failed to update strategy summary:', error);
      throw error;
    }
  }

  async updateSummary(metrics: any) {
    try {
      const values = [
        ['Total Strategies', metrics.totalStrategies, 'Number of active strategies', new Date().toISOString()],
        ['Total Executions', metrics.totalExecutions, 'All-time execution count', new Date().toISOString()],
        ['Success Rate', `${metrics.overallSuccessRate}%`, 'Overall success percentage', new Date().toISOString()],
        ['Total Invested', `$${metrics.totalInvested}`, 'Total amount invested', new Date().toISOString()],
        ['Current Value', `$${metrics.currentValue}`, 'Current portfolio value', new Date().toISOString()],
        ['Profit/Loss', `$${metrics.profitLoss}`, 'Total profit or loss', new Date().toISOString()],
      ];

      // Clear existing data and update
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Summary!A2:D',
        valueInputOption: 'RAW',
        requestBody: { values },
      });

      logger.info('Updated summary metrics in Google Sheets');
    } catch (error) {
      logger.error('Failed to update summary:', error);
      throw error;
    }
  }

  async exportExecutions(startDate?: Date, endDate?: Date) {
    try {
      let range = 'Executions!A:J';
      if (startDate || endDate) {
        // In a real implementation, you'd filter by date range
        range = 'Executions!A:J';
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range,
      });

      return response.data.values || [];
    } catch (error) {
      logger.error('Failed to export executions:', error);
      throw error;
    }
  }

  async getSheetUrl(): Promise<string> {
    return `https://docs.google.com/spreadsheets/d/${this.config.spreadsheetId}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });
      return true;
    } catch (error) {
      logger.error('Google Sheets connection test failed:', error);
      return false;
    }
  }
}

export default GoogleSheetsService;