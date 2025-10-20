import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentExecutions } from '@/components/dashboard/RecentExecutions'
import { ActiveStrategies } from '@/components/dashboard/ActiveStrategies'
import { QuickActions } from '@/components/dashboard/QuickActions'

export default function DashboardPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="px-1 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Monitor and manage your DCA Bitcoin strategies
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      <DashboardStats />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Active Strategies */}
        <ActiveStrategies />

        {/* Recent Executions */}
        <RecentExecutions />
      </div>
    </div>
  )
}