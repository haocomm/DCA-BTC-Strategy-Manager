import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '@dca-btc/shared';
import jwt from 'jsonwebtoken';
import { prisma } from './database';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

const clients = new Map<string, Set<AuthenticatedWebSocket>>();

export function setupWebSocket(wss: WebSocketServer) {
  // Handle connection
  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('WebSocket connection rejected: No token provided');
      ws.close(1008, 'Token required');
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        logger.warn(`WebSocket connection rejected: User ${decoded.userId} not found or inactive`);
        ws.close(1008, 'Invalid user');
        return;
      }

      // Setup authenticated connection
      ws.userId = decoded.userId;
      ws.isAlive = true;

      // Add to client tracking
      if (!clients.has(decoded.userId)) {
        clients.set(decoded.userId, new Set());
      }
      clients.get(decoded.userId)!.add(ws);

      logger.info(`WebSocket client connected: User ${decoded.userId}`);

      // Setup ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await handleWebSocketMessage(ws, message);
        } catch (error) {
          logger.error('Invalid WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' },
            timestamp: new Date().toISOString(),
          }));
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        logger.info(`WebSocket client disconnected: User ${decoded.userId}`);
        const userClients = clients.get(decoded.userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            clients.delete(decoded.userId);
          }
        }
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        data: { message: 'Connected to DCA Strategy Manager' },
        timestamp: new Date().toISOString(),
      }));

    } catch (error) {
      logger.warn('WebSocket authentication failed:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  // Setup ping interval for connection health
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.isAlive) {
        logger.warn('Terminating inactive WebSocket connection');
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  // Cleanup on close
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
}

async function handleWebSocketMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
  const { type, data } = message;

  switch (type) {
    case 'subscribe':
      // Handle subscription to specific data
      await handleSubscription(ws, data);
      break;

    case 'unsubscribe':
      // Handle unsubscription
      await handleUnsubscription(ws, data);
      break;

    case 'ping':
      // Handle ping
      ws.send(JSON.stringify({
        type: 'pong',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      }));
      break;

    default:
      logger.warn(`Unknown WebSocket message type: ${type}`);
  }
}

async function handleSubscription(ws: AuthenticatedWebSocket, data: any) {
  // Implement subscription logic (e.g., strategy updates, price updates)
  logger.debug(`User ${ws.userId} subscribed to:`, data);

  ws.send(JSON.stringify({
    type: 'subscribed',
    data: { subscriptions: data },
    timestamp: new Date().toISOString(),
  }));
}

async function handleUnsubscription(ws: AuthenticatedWebSocket, data: any) {
  // Implement unsubscription logic
  logger.debug(`User ${ws.userId} unsubscribed from:`, data);

  ws.send(JSON.stringify({
    type: 'unsubscribed',
    data: { subscriptions: data },
    timestamp: new Date().toISOString(),
  }));
}

// Utility functions for broadcasting messages
export function broadcastToUser(userId: string, message: WebSocketMessage) {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const messageStr = JSON.stringify(message);

  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

export function broadcastToAll(message: WebSocketMessage) {
  const messageStr = JSON.stringify(message);

  clients.forEach((userClients) => {
    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  });
}

// Specific message types
export function sendStrategyUpdate(userId: string, strategy: any) {
  broadcastToUser(userId, {
    type: 'strategy_update',
    data: { strategy },
    timestamp: new Date().toISOString(),
  });
}

export function sendExecutionUpdate(userId: string, execution: any) {
  broadcastToUser(userId, {
    type: 'execution_update',
    data: { execution },
    timestamp: new Date().toISOString(),
  });
}

export function sendNotification(userId: string, notification: any) {
  broadcastToUser(userId, {
    type: 'notification',
    data: { notification },
    timestamp: new Date().toISOString(),
  });
}

export function sendPriceUpdate(pair: string, price: number) {
  broadcastToAll({
    type: 'price_update',
    data: { pair, price },
    timestamp: new Date().toISOString(),
  });
}