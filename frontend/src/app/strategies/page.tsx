'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, Play, Pause, Edit, MoreHorizontal, Filter } from 'lucide-react'
import { formatCurrency, getStatusColor, formatDate, getRelativeTime } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Strategy {
  id: string
  name: string
  pair: string
  amount: number
  frequency: string
  isActive: boolean
  nextExecution?: string
  totalExecutions: number
  successRate: number
  exchange: {
    name: string
    type: string
  }
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadStrategies()
  }, [])

  const loadStrategies = async () => {
    try {
      const response = await api.get<Strategy[]>('/strategies')
      if (response.success && response.data) {
        setStrategies(response.data)
      }
    } catch (error) {
      toast.error('Failed to load strategies')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStrategy = async (id: string, isActive: boolean) => {
    try {
      const response = await api.patch(`/strategies/${id}/toggle`)
      if (response.success) {
        setStrategies(prev =>
          prev.map(s => s.id === id ? { ...s, isActive: !isActive } : s)
        )
        toast.success(`Strategy ${isActive ? 'paused' : 'activated'}`)
      }
    } catch (error) {
      toast.error('Failed to update strategy')
    }
  }

  const deleteStrategy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return

    try {
      const response = await api.delete(`/strategies/${id}`)
      if (response.success) {
        setStrategies(prev => prev.filter(s => s.id !== id))
        toast.success('Strategy deleted successfully')
      }
    } catch (error) {
      toast.error('Failed to delete strategy')
    }
  }

  const filteredStrategies = strategies.filter(strategy => {
    if (filter === 'all') return true
    if (filter === 'active') return strategy.isActive
    if (filter === 'inactive') return !strategy.isActive
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Strategies</h1>
          <p className="text-gray-600 mt-2">
            Manage your automated DCA trading strategies
          </p>
        </div>
        <Link href="/strategies/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Strategy
          </Button>
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({strategies.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active ({strategies.filter(s => s.isActive).length})
          </Button>
          <Button
            variant={filter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('inactive')}
          >
            Paused ({strategies.filter(s => !s.isActive).length})
          </Button>
        </div>
      </div>

      {/* Strategies List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="spinner"></div>
            <span className="ml-2">Loading strategies...</span>
          </CardContent>
        </Card>
      ) : filteredStrategies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies found</h3>
            <p className="text-gray-500 text-center mb-6">
              {filter === 'all'
                ? "Get started by creating your first DCA strategy."
                : `No ${filter} strategies found.`}
            </p>
            {filter === 'all' && (
              <Link href="/strategies/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Strategy
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStrategies.map((strategy) => (
            <Card key={strategy.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{strategy.name}</h3>
                      <Badge className={getStatusColor(strategy.isActive ? 'active' : 'inactive')}>
                        {strategy.isActive ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="outline">
                        {strategy.exchange.name}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Trading Pair:</span>
                        <div className="font-medium">{strategy.pair}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <div className="font-medium">{formatCurrency(strategy.amount)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Frequency:</span>
                        <div className="font-medium capitalize">{strategy.frequency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Success Rate:</span>
                        <div className="font-medium">{strategy.successRate}%</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      <span>{strategy.totalExecutions} executions</span>
                      {strategy.isActive && strategy.nextExecution && (
                        <span className="ml-4">
                          Next execution: {getRelativeTime(strategy.nextExecution)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStrategy(strategy.id, strategy.isActive)}
                      className={strategy.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {strategy.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>

                    <Link href={`/strategies/${strategy.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/strategies/${strategy.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/strategies/${strategy.id}/edit`}>Edit Strategy</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteStrategy(strategy.id)}
                          className="text-red-600"
                        >
                          Delete Strategy
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}