import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount)
}

export function formatCrypto(amount: number, symbol = 'BTC'): string {
  const decimals = symbol === 'BTC' ? 8 : 4
  return `${amount.toFixed(decimals)} ${symbol}`
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: Date | string, format = 'medium'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'short' : 'long',
    day: 'numeric',
    hour: format === 'time' ? 'numeric' : undefined,
    minute: format === 'time' ? 'numeric' : undefined,
  }

  return new Intl.DateTimeFormat('en-US', options).format(dateObj)
}

export function getRelativeTime(date: Date | string, short: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return short ? 'Now' : 'Just now'
  if (diffMins < 60) return `${diffMins}${short ? 'm' : ` minute${diffMins > 1 ? 's' : ''}`} ago`
  if (diffHours < 24) return `${diffHours}${short ? 'h' : ` hour${diffHours > 1 ? 's' : ''}`} ago`
  return `${diffDays}${short ? 'd' : ` day${diffDays > 1 ? 's' : ''}`} ago`
}

export function getStatusColor(status: string): string {
  const colors = {
    completed: 'text-green-600 bg-green-50 border-green-200',
    pending: 'text-blue-600 bg-blue-50 border-blue-200',
    failed: 'text-red-600 bg-red-50 border-red-200',
    cancelled: 'text-gray-600 bg-gray-50 border-gray-200',
    active: 'text-green-600 bg-green-50 border-green-200',
    inactive: 'text-gray-600 bg-gray-50 border-gray-200',
  }
  return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}