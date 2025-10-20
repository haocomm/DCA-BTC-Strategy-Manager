'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, CheckCircle, XCircle, Settings, TestTube, Trash2 } from 'lucide-react'
import { ExchangeType } from '@/lib/types'
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
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionForm, setConnectionForm] = useState({
    name: '',
    type: ExchangeType.BINANCE,
    apiKey: '',
    apiSecret: '',
    testnet: false,
  })

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
      const response = await api.get(`/exchanges/${id}/balances`)
      if (response.success) {
        toast.success('Connection test successful!', { id: 'test-connection' })
      } else {
        toast.error('Connection test failed', { id: 'test-connection' })
      }
    } catch (error) {
      toast.error('Connection test failed', { id: 'test-connection' })
    }
  }

  const handleConnectExchange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsConnecting(true)

    try {
      // First test the connection
      const testResponse = await api.post('/exchanges/test-connection', {
        name: connectionForm.name || exchangeConfigs[connectionForm.type].displayName,
        type: connectionForm.type,
        apiKey: connectionForm.apiKey,
        apiSecret: connectionForm.apiSecret,
        testnet: connectionForm.testnet,
      })

      if (!testResponse.success) {
        toast.error(testResponse.error || 'Connection test failed')
        return
      }

      // If test passes, save the exchange
      const response = await api.post('/exchanges', {
        name: connectionForm.name || exchangeConfigs[connectionForm.type].displayName,
        type: connectionForm.type,
        apiKey: connectionForm.apiKey,
        apiSecret: connectionForm.apiSecret,
        testnet: connectionForm.testnet,
      })

      if (response.success) {
        toast.success('Exchange connected successfully!')
        setShowAddModal(false)
        setConnectionForm({
          name: '',
          type: ExchangeType.BINANCE,
          apiKey: '',
          apiSecret: '',
          testnet: false,
        })
        loadExchanges() // Reload the exchanges list
      } else {
        toast.error(response.error || 'Failed to connect exchange')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to connect exchange')
    } finally {
      setIsConnecting(false)
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="px-1 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Exchanges</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Manage your cryptocurrency exchange connections
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto justify-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Exchange
        </Button>
      </div>

      {/* Exchange Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Object.entries(exchangeConfigs).map(([type, config]) => {
          const connectedExchange = exchanges.find(e => e.type === type)
          const isConnected = !!connectedExchange

          return (
            <Card key={type} className={`${isConnected ? 'border-green-200' : ''} hover:shadow-md transition-shadow`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold text-sm sm:text-base">
                        {config.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{config.displayName}</CardTitle>
                      {isConnected && (
                        <div className="flex items-center gap-1 text-xs sm:text-sm mt-1">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span className="text-green-600">Connected</span>
                          {connectedExchange.testnet && (
                            <Badge variant="outline" className="text-xs ml-1 flex-shrink-0">
                              Testnet
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {config.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-xs sm:text-sm">
                        <span className="text-gray-500 block">Name:</span>
                        <div className="font-medium truncate">{connectedExchange.name}</div>
                      </div>

                      {connectedExchange.lastSyncAt && (
                        <div className="text-xs sm:text-sm">
                          <span className="text-gray-500 block">Last sync:</span>
                          <div className="font-medium">
                            {new Date(connectedExchange.lastSyncAt).toLocaleString()}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(connectedExchange.id)}
                          className="flex-shrink-0"
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExchange(connectedExchange.id, connectedExchange.isActive)}
                          className="flex-shrink-0"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          {connectedExchange.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteExchange(connectedExchange.id)}
                          className="text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <p className="text-xs sm:text-sm text-gray-600">
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
              <form onSubmit={handleConnectExchange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exchange Type
                  </label>
                  <select
                    value={connectionForm.type}
                    onChange={(e) => setConnectionForm(prev => ({
                      ...prev,
                      type: e.target.value as ExchangeType
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isConnecting}
                  >
                    {Object.entries(exchangeConfigs).map(([type, config]) => (
                      <option key={type} value={type}>
                        {config.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connection Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={connectionForm.name}
                    onChange={(e) => setConnectionForm(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={exchangeConfigs[connectionForm.type].displayName}
                    disabled={isConnecting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={connectionForm.apiKey}
                    onChange={(e) => setConnectionForm(prev => ({
                      ...prev,
                      apiKey: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your API key"
                    required
                    disabled={isConnecting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Secret *
                  </label>
                  <input
                    type="password"
                    value={connectionForm.apiSecret}
                    onChange={(e) => setConnectionForm(prev => ({
                      ...prev,
                      apiSecret: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your API secret"
                    required
                    disabled={isConnecting}
                  />
                </div>

                {exchangeConfigs[connectionForm.type].testnetSupport && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="testnet"
                      checked={connectionForm.testnet}
                      onChange={(e) => setConnectionForm(prev => ({
                        ...prev,
                        testnet: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isConnecting}
                    />
                    <label htmlFor="testnet" className="ml-2 text-sm text-gray-700">
                      Use Testnet (for testing)
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    disabled={isConnecting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isConnecting || !connectionForm.apiKey || !connectionForm.apiSecret}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Exchange'}
                  </Button>
                </div>
              </form>
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