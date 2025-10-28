'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  send: (type: string, data: any) => void;
  subscribe: (subscriptions: string[]) => void;
  unsubscribe: (subscriptions: string[]) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<string[]>([]);

  const connect = useCallback(() => {
    if (!session?.accessToken) {
      return;
    }

    const wsUrl = `ws://localhost:3003?token=${session.accessToken}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        toast.success('Real-time connection established');

        // Re-subscribe to any previous subscriptions
        if (subscriptionsRef.current.length > 0) {
          send('subscribe', { subscriptions: subscriptionsRef.current });
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle specific message types
          switch (message.type) {
            case 'strategy_update':
              toast.success('Strategy updated');
              break;
            case 'execution_update':
              toast('DCA execution completed', {
                icon: '📈',
                style: {
                  background: '#10b981',
                  color: '#fff',
                },
              });
              break;
            case 'notification':
              toast(message.data.notification.title, {
                icon: '🔔',
              });
              break;
            case 'price_update':
              // Handle price updates silently (could update state in a real app)
              break;
            default:
              console.log('WebSocket message:', message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        if (event.code !== 1000) {
          toast.error('Real-time connection lost');
          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Real-time connection error');
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      toast.error('Failed to establish real-time connection');
    }
  }, [session?.accessToken]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback(
    (subscriptions: string[]) => {
      subscriptionsRef.current = subscriptions;
      send('subscribe', { subscriptions });
    },
    [send]
  );

  const unsubscribe = useCallback(
    (subscriptions: string[]) => {
      subscriptionsRef.current = subscriptionsRef.current.filter(
        (sub) => !subscriptions.includes(sub)
      );
      send('unsubscribe', { subscriptions });
    },
    [send]
  );

  // Auto-connect when session is available
  useEffect(() => {
    if (session?.accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [session?.accessToken, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
  };
}
