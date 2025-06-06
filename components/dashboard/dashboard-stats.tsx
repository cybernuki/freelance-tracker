import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Users, FileText, FolderOpen } from 'lucide-react'

async function getDashboardStats() {
  const [
    totalClients,
    totalQuotes,
    activeProjects,
    totalIncome,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.quote.count(),
    prisma.project.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ])

  return {
    totalClients,
    totalQuotes,
    activeProjects,
    totalIncome: totalIncome._sum.amount || 0,
  }
}

export async function DashboardStats() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      title: 'Total Income',
      value: formatCurrency(stats.totalIncome),
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects.toString(),
      icon: FolderOpen,
      color: 'text-blue-600',
    },
    {
      title: 'Total Clients',
      value: stats.totalClients.toString(),
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Total Quotes',
      value: stats.totalQuotes.toString(),
      icon: FileText,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
