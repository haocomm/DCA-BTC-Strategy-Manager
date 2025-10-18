import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { csvExportService } from '../services/csvExportService';
import { logger } from '@dca-btc/shared';

const router = Router();

// Export executions to CSV
router.get('/executions/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { startDate, endDate, strategyId } = req.query;

  try {
    const options: any = {};
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);
    if (strategyId) options.strategyId = strategyId as string;

    const { filename, data } = await csvExportService.exportExecutions(req.user!.id, options);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);

    logger.info(`User ${req.user!.id} exported executions to CSV`);
  } catch (error) {
    logger.error('CSV export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSV export',
    });
  }
}));

// Export strategies to CSV
router.get('/strategies/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, data } = await csvExportService.exportStrategies(req.user!.id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);

    logger.info(`User ${req.user!.id} exported strategies to CSV`);
  } catch (error) {
    logger.error('Strategies CSV export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate strategies CSV export',
    });
  }
}));

// Export portfolio summary to CSV
router.get('/portfolio/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, data } = await csvExportService.exportPortfolioSummary(req.user!.id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);

    logger.info(`User ${req.user!.id} exported portfolio summary to CSV`);
  } catch (error) {
    logger.error('Portfolio summary CSV export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate portfolio summary CSV export',
    });
  }
}));

// Google Sheets export endpoint
router.post('/google-sheets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { type, data } = req.body;

  try {
    // Check if Google Sheets is configured
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: 'Google Sheets integration not configured',
      });
    }

    const { default: GoogleSheetsService } = await import('../services/googleSheetsService');
    const sheetsService = new GoogleSheetsService({
      clientEmail,
      privateKey,
      spreadsheetId,
    });

    let result;
    switch (type) {
      case 'execution':
        await sheetsService.addExecution(data);
        result = { message: 'Execution added to Google Sheets' };
        break;
      case 'strategy':
        await sheetsService.updateStrategySummary(data);
        result = { message: 'Strategy summary updated in Google Sheets' };
        break;
      case 'portfolio':
        await sheetsService.updateSummary(data);
        result = { message: 'Portfolio summary updated in Google Sheets' };
        break;
      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    logger.info(`User ${req.user!.id} exported ${type} to Google Sheets`);

    res.json({
      success: true,
      data: result,
      sheetUrl: await sheetsService.getSheetUrl(),
    });
  } catch (error) {
    logger.error('Google Sheets export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export to Google Sheets',
    });
  }
}));

export default router;