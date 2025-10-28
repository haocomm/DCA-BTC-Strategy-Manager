'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { formatCurrency, formatCrypto, getStatusColor } from '@/lib/utils';

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
  ];

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-lg sm:text-xl">Recent Executions</CardTitle>
        <CardDescription className="text-sm">
          Latest automatic and manual strategy executions
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="space-y-3 sm:space-y-4">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-2 sm:gap-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 sm:mb-2">
                  <span className="font-medium text-sm sm:text-base truncate">
                    {execution.strategyName}
                  </span>
                  <Badge
                    className={`w-fit ${getStatusColor(execution.status)}`}
                  >
                    {execution.status}
                  </Badge>
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mb-1">
                  {execution.status === 'completed' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span>
                        Bought {formatCrypto(execution.quantity, 'BTC')}
                      </span>
                      <span className="text-gray-400 hidden sm:inline">•</span>
                      <span>at {formatCurrency(execution.price)}</span>
                    </div>
                  ) : (
                    <span className="text-red-600">Execution failed</span>
                  )}
                </div>
                <RelativeTime date={execution.timestamp} />
              </div>
              <div className="text-right sm:text-left sm:ml-4">
                <div className="font-medium text-sm sm:text-base">
                  {execution.status === 'completed'
                    ? formatCurrency(execution.amount)
                    : '-'}
                </div>
                <div className="text-xs text-gray-500">{execution.pair}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
