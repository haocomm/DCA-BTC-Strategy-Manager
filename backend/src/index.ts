import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { logger } from '@dca-btc/shared';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { setupWebSocket } from './utils/websocket';
import { setupDatabase } from './utils/database';
import { setupCronJobs } from './utils/cron';

// Routes
import authRoutes from './routes/auth';
import strategyRoutes from './routes/strategies';
import exchangeRoutes from './routes/exchanges';
import executionRoutes from './routes/executions';
import notificationRoutes from './routes/notifications';
import externalRoutes from './routes/external';
import exportRoutes from './routes/export';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function startServer() {
  try {
    // Initialize database
    await setupDatabase();
    logger.info('Database connected successfully');

    // Security middleware
    app.use(helmet());
    app.use(cors({
      origin: CORS_ORIGIN,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
    });
    app.use('/api/', limiter);

    // General middleware
    app.use(compression());
    app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
      });
    });

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/strategies', authMiddleware, strategyRoutes);
    app.use('/api/exchanges', authMiddleware, exchangeRoutes);
    app.use('/api/executions', authMiddleware, executionRoutes);
    app.use('/api/notifications', authMiddleware, notificationRoutes);
    app.use('/api/external', externalRoutes); // No auth for webhooks
    app.use('/api/export', authMiddleware, exportRoutes);

    // Setup WebSocket
    setupWebSocket(wss);
    logger.info('WebSocket server initialized');

    // Setup cron jobs
    setupCronJobs();
    logger.info('Cron jobs initialized');

    // Error handling middleware
    app.use(errorHandler);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      });
    });

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`WebSocket server ready`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();