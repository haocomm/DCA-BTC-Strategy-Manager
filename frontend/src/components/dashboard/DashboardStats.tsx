'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export function DashboardStats() {
  // Mock data - replace with actual API calls
  const stats = [
    {
      title: 'Total Invested',
      value: formatCurrency(12500),
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign,
    },
    {
      title: 'Current Value',
      value: formatCurrency(14187.50),
      change: '+13.5%',
      changeType: 'positive' as const,
      icon: TrendingUp,
    },
    {
      title: 'Total Profit',
      value: formatCurrency(1687.50),
      change: '+13.5%',
      changeType: 'positive' as const,
      icon: Activity,
    },
    {
      title: 'Active Strategies',
      value: '3',
      change: '+1',
      changeType: 'positive' as const,
      icon: TrendingDown,
    },
  ]

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold truncate">{stat.value}</div>
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs text-muted-foreground mt-1">
              {stat.changeType === 'positive' ? (
                <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
              )}
              <span className={stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}>
                {stat.change}
              </span>
              <span className="hidden sm:inline">from last month</span>
              <span className="sm:hidden">vs last mo</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}