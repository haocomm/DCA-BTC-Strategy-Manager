'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  History,
  Settings,
  Bell
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Strategies', href: '/strategies', icon: TrendingUp },
  { name: 'Exchanges', href: '/exchanges', icon: Wallet },
  { name: 'Executions', href: '/logs', icon: History },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <item.icon
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive ? 'text-primary-foreground' : 'text-gray-400 group-hover:text-gray-500'
              )}
            />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}