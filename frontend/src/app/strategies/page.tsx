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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="px-1 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Strategies</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Manage your automated DCA trading strategies
          </p>
        </div>
        <Link href="/strategies/new">
          <Button className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4" />
            <span>New Strategy</span>
          </Button>
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-shrink-0"
          >
            All ({strategies.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className="flex-shrink-0"
          >
            Active ({strategies.filter(s => s.isActive).length})
          </Button>
          <Button
            variant={filter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('inactive')}
            className="flex-shrink-0"
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
        <div className="space-y-3 sm:space-y-4">
          {filteredStrategies.map((strategy) => (
            <Card key={strategy.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-3">
                      <h3 className="text-base sm:text-lg font-semibold truncate pr-2">{strategy.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`w-fit ${getStatusColor(strategy.isActive ? 'active' : 'inactive')}`}>
                          {strategy.isActive ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="outline" className="w-fit">
                          {strategy.exchange.name}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500 block">Trading Pair:</span>
                        <div className="font-medium truncate">{strategy.pair}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Amount:</span>
                        <div className="font-medium">{formatCurrency(strategy.amount)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Frequency:</span>
                        <div className="font-medium capitalize">{strategy.frequency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Success Rate:</span>
                        <div className="font-medium">{strategy.successRate}%</div>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span>{strategy.totalExecutions} executions</span>
                        {strategy.isActive && strategy.nextExecution && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="hidden sm:inline">Next: {getRelativeTime(strategy.nextExecution)}</span>
                            <span className="sm:hidden">Next: {getRelativeTime(strategy.nextExecution, true)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 lg:ml-4 lg:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStrategy(strategy.id, strategy.isActive)}
                      className={`flex-shrink-0 px-3 ${strategy.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                    >
                      {strategy.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>

                    <Link href={`/strategies/${strategy.id}`}>
                      <Button variant="outline" size="sm" className="flex-shrink-0 px-3">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-shrink-0 px-3">
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