import { Suspense } from 'react'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { ActiveProjects } from '@/components/dashboard/active-projects'
import { RecentQuotes } from '@/components/dashboard/recent-quotes'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'
import { MonthlyIncome } from '@/components/dashboard/monthly-income'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your freelance project management system</p>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <DashboardStats />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div>Loading alerts...</div>}>
          <AlertsPanel />
        </Suspense>
        
        <Suspense fallback={<div>Loading income...</div>}>
          <MonthlyIncome />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div>Loading projects...</div>}>
          <ActiveProjects />
        </Suspense>
        
        <Suspense fallback={<div>Loading quotes...</div>}>
          <RecentQuotes />
        </Suspense>
      </div>
    </div>
  )
}
