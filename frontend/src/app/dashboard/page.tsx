import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentExecutions } from '@/components/dashboard/RecentExecutions'
import { ActiveStrategies } from '@/components/dashboard/ActiveStrategies'
import { QuickActions } from '@/components/dashboard/QuickActions'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage your DCA Bitcoin strategies
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      <DashboardStats />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Strategies */}
        <ActiveStrategies />

        {/* Recent Executions */}
        <RecentExecutions />
      </div>
    </div>
  )
}