'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatCrypto, getStatusColor, getRelativeTime } from '@/lib/utils'

export function RecentExecutions() {
  // Mock data - replace with actual API calls
  const executions = [
    {
      id: '1',
      strategyName: 'BTC Daily DCA',
      pair: 'BTC/USDT',
      amount: 100,
      quantity: 0.00234,
      price: 42735.04,
      status: 'completed',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: '2',
      strategyName: 'Bitcoin Weekly Buy',
      pair: 'BTC/USDT',
      amount: 250,
      quantity: 0.00589,
      price: 42462.65,
      status: 'completed',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: '3',
      strategyName: 'Accumulation Strategy',
      pair: 'BTC/USDT',
      amount: 50,
      quantity: 0,
      price: 0,
      status: 'failed',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      id: '4',
      strategyName: 'BTC Daily DCA',
      pair: 'BTC/USDT',
      amount: 100,
      quantity: 0.00236,
      price: 42372.88,
      status: 'completed',
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000), // 1 day ago
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
        <CardDescription>
          Latest automatic and manual strategy executions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{execution.strategyName}</span>
                  <Badge className={getStatusColor(execution.status)}>
                    {execution.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {execution.status === 'completed' ? (
                    <>
                      Bought {formatCrypto(execution.quantity, 'BTC')} at {formatCurrency(execution.price)}
                    </>
                  ) : (
                    <span className="text-red-600">Execution failed</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {getRelativeTime(execution.timestamp)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {execution.status === 'completed' ? formatCurrency(execution.amount) : '-'}
                </div>
                <div className="text-xs text-gray-500">
                  {execution.pair}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}