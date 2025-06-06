import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { FolderOpen, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'

async function getActiveProjects() {
  return prisma.project.findMany({
    where: { status: 'ACTIVE' },
    include: {
      quote: {
        include: {
          client: true,
        },
      },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
}

export async function ActiveProjects() {
  const projects = await getActiveProjects()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-500" />
          Active Projects ({projects.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No active projects</p>
            <p className="text-sm">Create a quote to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const totalPaid = project.payments.reduce(
                (sum, payment) => sum + payment.amount,
                0
              )
              const paymentProgress = (totalPaid / project.agreedPrice) * 100

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {project.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {project.quote.client.name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(project.startDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(project.agreedPrice)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                      <div className="mt-2 text-xs text-gray-500">
                        {paymentProgress.toFixed(0)}% paid
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
