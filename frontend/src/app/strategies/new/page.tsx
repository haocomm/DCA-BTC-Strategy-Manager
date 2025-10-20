'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Exchange {
  id: string
  name: string
  type: string
  isActive: boolean
}

interface StrategyCondition {
  id: string
  type: string
  operator: string
  value: number
  isActive: boolean
}

export default function NewStrategyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [conditions, setConditions] = useState<StrategyCondition[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exchangeId: '',
    pair: '',
    amount: 100,
    amountType: 'fixed' as 'fixed' | 'percentage',
    frequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })

  useEffect(() => {
    loadExchanges()
  }, [])

  const loadExchanges = async () => {
    try {
      const response = await api.get<Exchange[]>('/exchanges')
      if (response.success && response.data) {
        setExchanges(response.data.filter(e => e.isActive))
      }
    } catch (error) {
      toast.error('Failed to load exchanges')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate form
      if (!formData.name || !formData.exchangeId || !formData.pair || !formData.amount) {
        toast.error('Please fill in all required fields')
        return
      }

      const strategyData = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        conditions: conditions.filter(c => c.isActive),
      }

      const response = await api.post('/strategies', strategyData)
      if (response.success) {
        toast.success('Strategy created successfully!')
        router.push('/strategies')
      }
    } catch (error) {
      toast.error('Failed to create strategy')
    } finally {
      setIsLoading(false)
    }
  }

  const addCondition = () => {
    const newCondition: StrategyCondition = {
      id: Date.now().toString(),
      type: 'price_above',
      operator: 'gt',
      value: 0,
      isActive: true,
    }
    setConditions([...conditions, newCondition])
  }

  const updateCondition = (id: string, field: keyof StrategyCondition, value: any) => {
    setConditions(conditions.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/strategies">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Strategies
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Strategy</h1>
          <p className="text-gray-600 mt-2">
            Set up a new Dollar-Cost Averaging strategy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the basic parameters of your DCA strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="label">Strategy Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Bitcoin Daily DCA"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Optional description of your strategy..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Exchange *</label>
                <select
                  className="input"
                  value={formData.exchangeId}
                  onChange={(e) => setFormData({ ...formData, exchangeId: e.target.value })}
                  required
                >
                  <option value="">Select an exchange</option>
                  {exchanges.map((exchange) => (
                    <option key={exchange.id} value={exchange.id}>
                      {exchange.name}
                    </option>
                  ))}
                </select>
                {exchanges.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    No active exchanges configured.{' '}
                    <Link href="/exchanges" className="text-primary hover:underline">
                      Add an exchange
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <label className="label">Trading Pair *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., BTCUSDT"
                  value={formData.pair}
                  onChange={(e) => setFormData({ ...formData, pair: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Investment Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Investment Parameters</CardTitle>
              <CardDescription>
                Set how much and how often to invest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="label">Amount Type</label>
                <select
                  className="input"
                  value={formData.amountType}
                  onChange={(e) => setFormData({ ...formData, amountType: e.target.value as 'fixed' | 'percentage' })}
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>

              <div>
                <label className="label">
                  {formData.amountType === 'fixed' ? 'Amount (USD)' : 'Percentage (%)'} *
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder={formData.amountType === 'fixed' ? '100' : '10'}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step={formData.amountType === 'fixed' ? '1' : '0.1'}
                  required
                />
              </div>

              <div>
                <label className="label">Frequency *</label>
                <select
                  className="input"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  required
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">End Date (Optional)</label>
                <input
                  type="date"
                  className="input"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for ongoing strategy
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Conditional Execution */}
          <Card>
            <CardHeader>
              <CardTitle>Conditional Execution</CardTitle>
              <CardDescription>
                Optional conditions for executing purchases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {conditions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Add conditions to execute trades only when specific criteria are met
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCondition}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((condition) => (
                    <div key={condition.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        checked={condition.isActive}
                        onChange={(e) => updateCondition(condition.id, 'isActive', e.target.checked)}
                        className="rounded"
                      />

                      <select
                        className="input text-sm flex-1"
                        value={condition.type}
                        onChange={(e) => updateCondition(condition.id, 'type', e.target.value)}
                      >
                        <option value="price_above">Price Above</option>
                        <option value="price_below">Price Below</option>
                        <option value="rsi_above">RSI Above</option>
                        <option value="rsi_below">RSI Below</option>
                      </select>

                      <select
                        className="input text-sm w-20"
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                      >
                        <option value="gt">&gt;</option>
                        <option value="gte">≥</option>
                        <option value="lt">&lt;</option>
                        <option value="lte">≤</option>
                      </select>

                      <input
                        type="number"
                        className="input text-sm w-24"
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, 'value', parseFloat(e.target.value) || 0)}
                        step="0.01"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCondition}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Condition
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/strategies">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'Create Strategy'}
          </Button>
        </div>
      </form>
    </div>
  )
}