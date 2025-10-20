'use client'

import { useWebSocket } from '@/hooks/useWebSocket'

interface RealTimeStatusProps {
  className?: string
}

export function RealTimeStatus({ className = '' }: RealTimeStatusProps) {
  const { isConnected, lastMessage, send } = useWebSocket()

  const handlePing = () => {
    send('ping', {})
  }

  const handleSubscribe = () => {
    send('subscribe', {
      subscriptions: ['strategy_updates', 'execution_updates', 'price_updates']
    })
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Real-time active' : 'Disconnected'}
        </span>
      </div>

      {/* Debug Info (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePing}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          >
            Ping
          </button>
          <button
            onClick={handleSubscribe}
            className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
          >
            Subscribe
          </button>
        </div>
      )}

      {/* Last Message Display */}
      {lastMessage && process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 max-w-xs truncate">
          Last: {lastMessage.type} - {new Date(lastMessage.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}