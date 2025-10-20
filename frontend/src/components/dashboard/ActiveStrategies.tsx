'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Play, Pause, Edit, MoreHorizontal } from 'lucide-react'
import { getStatusColor, formatDate, getRelativeTime } from '@/lib/utils'

export function ActiveStrategies() {
  // Mock data - replace with actual API calls
  const strategies = [
    {
      id: '1',
      name: 'BTC Daily DCA',
      pair: 'BTC/USDT',
      amount: 100,
      frequency: 'daily',
      nextExecution: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      isActive: true,
      totalExecutions: 45,
      successRate: 97.8,
    },
    {
      id: '2',
      name: 'Bitcoin Weekly Buy',
      pair: 'BTC/USDT',
      amount: 250,
      frequency: 'weekly',
      nextExecution: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      isActive: true,
      totalExecutions: 12,
      successRate: 100,
    },
    {
      id: '3',
      name: 'Accumulation Strategy',
      pair: 'BTC/USDT',
      amount: 50,
      frequency: 'hourly',
      nextExecution: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      isActive: false,
      totalExecutions: 128,
      successRate: 95.3,
    },
  ]

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-lg sm:text-xl">Active Strategies</CardTitle>
        <CardDescription className="text-sm">
          Manage your automated DCA strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="space-y-3 sm:space-y-4">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h3 className="font-medium text-sm sm:text-base truncate">{strategy.name}</h3>
                  <Badge className={`w-fit ${getStatusColor(strategy.isActive ? 'active' : 'inactive')}`}>
                    {strategy.isActive ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <span className="font-medium">{strategy.pair}</span>
                    <span className="text-gray-400">•</span>
                    <span>${strategy.amount}</span>
                    <span className="text-gray-400">•</span>
                    <span>{strategy.frequency}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <span>Success Rate: {strategy.successRate}%</span>
                    <span className="text-gray-400">•</span>
                    <span>{strategy.totalExecutions} executions</span>
                  </div>
                  {strategy.isActive && strategy.nextExecution && (
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      <span>Next: {getRelativeTime(strategy.nextExecution)}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatDate(strategy.nextExecution, 'short')}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0">
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-2 sm:px-3 ${strategy.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                >
                  {strategy.isActive ? <Pause className="h-3 w-3 sm:h-4 sm:w-4" /> : <Play className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="px-2 sm:px-3">
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" className="px-2 sm:px-3">
                  <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}