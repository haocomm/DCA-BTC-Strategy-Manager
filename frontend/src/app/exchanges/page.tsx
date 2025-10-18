'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, CheckCircle, XCircle, Settings, TestTube, Trash2 } from 'lucide-react'
import { getStatusColor, ExchangeType } from '@dca-btc/shared'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Exchange {
  id: string
  name: string
  type: ExchangeType
  isActive: boolean
  lastSyncAt?: string
  testnet: boolean
}

const exchangeConfigs = {
  [ExchangeType.BINANCE]: {
    name: 'Binance',
    displayName: 'Binance',
    color: 'bg-yellow-500',
    features: ['Spot', 'Futures', 'Margin'],
    testnetSupport: true,
  },
  [ExchangeType.COINBASE]: {
    name: 'Coinbase',
    displayName: 'Coinbase Pro',
    color: 'bg-blue-500',
    features: ['Spot', 'Margin'],
    testnetSupport: false,
  },
  [ExchangeType.KRAKEN]: {
    name: 'Kraken',
    displayName: 'Kraken',
    color: 'bg-purple-500',
    features: ['Spot', 'Futures'],
    testnetSupport: false,
  },
}

export default function ExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadExchanges()
  }, [])

  const loadExchanges = async () => {
    try {
      const response = await api.get<Exchange[]>('/exchanges')
      if (response.success && response.data) {
        setExchanges(response.data)
      }
    } catch (error) {
      toast.error('Failed to load exchanges')
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async (id: string) => {
    try {
      toast.loading('Testing connection...', { id: 'test-connection' })
      // TODO: Implement test connection API
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      toast.success('Connection test successful!', { id: 'test-connection' })
    } catch (error) {
      toast.error('Connection test failed', { id: 'test-connection' })
    }
  }

  const deleteExchange = async (id: string) => {
    if (!confirm('Are you sure you want to remove this exchange connection?')) return

    try {
      const response = await api.delete(`/exchanges/${id}`)
      if (response.success) {
        setExchanges(prev => prev.filter(e => e.id !== id))
        toast.success('Exchange connection removed')
      }
    } catch (error) {
      toast.error('Failed to remove exchange')
    }
  }

  const toggleExchange = async (id: string, isActive: boolean) => {
    try {
      const response = await api.patch(`/exchanges/${id}`, { isActive: !isActive })
      if (response.success) {
        setExchanges(prev =>
          prev.map(e => e.id === id ? { ...e, isActive: !isActive } : e)
        )
        toast.success(`Exchange ${isActive ? 'disabled' : 'enabled'}`)
      }
    } catch (error) {
      toast.error('Failed to update exchange')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exchanges</h1>
          <p className="text-gray-600 mt-2">
            Manage your cryptocurrency exchange connections
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exchange
        </Button>
      </div>

      {/* Exchange Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(exchangeConfigs).map(([type, config]) => {
          const connectedExchange = exchanges.find(e => e.type === type)
          const isConnected = !!connectedExchange

          return (
            <Card key={type} className={isConnected ? 'border-green-200' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                      <span className="text-white font-bold">
                        {config.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.displayName}</CardTitle>
                      {isConnected && (
                        <div className="flex items-center gap-1 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">Connected</span>
                          {connectedExchange.testnet && (
                            <Badge variant="outline" className="text-xs ml-1">
                              Testnet
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Name:</span>
                        <div className="font-medium">{connectedExchange.name}</div>
                      </div>

                      {connectedExchange.lastSyncAt && (
                        <div className="text-sm">
                          <span className="text-gray-500">Last sync:</span>
                          <div className="font-medium">
                            {new Date(connectedExchange.lastSyncAt).toLocaleString()}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(connectedExchange.id)}
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExchange(connectedExchange.id, connectedExchange.isActive)}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          {connectedExchange.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteExchange(connectedExchange.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Connect your {config.displayName} account to start trading
                      </p>
                      <Button
                        onClick={() => setShowAddModal(true)}
                        className="w-full"
                      >
                        Connect {config.displayName}
                      </Button>
                      {config.testnetSupport && (
                        <p className="text-xs text-gray-500 text-center">
                          Testnet available for safe testing
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Exchange Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Exchange Connection</CardTitle>
              <CardDescription>
                Connect your exchange account using API keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Exchange connection form will be implemented in the next step.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button disabled>Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-1">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Security Notice</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your API keys are encrypted and stored securely. We recommend using API keys with limited permissions
                (trading only, no withdrawals) and enabling IP whitelisting when possible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}