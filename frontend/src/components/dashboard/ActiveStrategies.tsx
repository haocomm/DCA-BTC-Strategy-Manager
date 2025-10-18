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
      <CardHeader>
        <CardTitle>Active Strategies</CardTitle>
        <CardDescription>
          Manage your automated DCA strategies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{strategy.name}</h3>
                  <Badge className={getStatusColor(strategy.isActive ? 'active' : 'inactive')}>
                    {strategy.isActive ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    {strategy.pair} • ${strategy.amount} • {strategy.frequency}
                  </div>
                  <div>
                    Success Rate: {strategy.successRate}% • {strategy.totalExecutions} executions
                  </div>
                  {strategy.isActive && strategy.nextExecution && (
                    <div>
                      Next execution: {getRelativeTime(strategy.nextExecution)} (
                      {formatDate(strategy.nextExecution, 'short')})
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={strategy.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                >
                  {strategy.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}