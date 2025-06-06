import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'all'

    // Calculate date range
    const now = new Date()
    let startDate: Date | undefined

    switch (timeRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStart, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = undefined
    }

    const dateFilter = startDate ? { gte: startDate } : undefined

    // Get all projects with payments and related data
    const projects = await prisma.project.findMany({
      where: startDate ? { createdAt: dateFilter } : {},
      include: {
        quote: {
          include: {
            client: true,
          },
        },
        payments: true,
        issues: {
          include: {
            aiMessages: true,
          },
        },
        manualTasks: true,
        extraExpenses: true,
      },
    })

    // Calculate summary metrics
    const totalRevenue = projects.reduce((sum, project) => {
      return sum + project.payments.reduce((pSum, payment) => pSum + payment.amount, 0)
    }, 0)

    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length

    // Get unique clients
    const uniqueClients = new Set(projects.map(p => p.quote.clientId))
    const totalClients = uniqueClients.size

    const averageProjectValue = totalProjects > 0 ? totalRevenue / totalProjects : 0

    // Calculate total costs and profit margin
    const totalCosts = projects.reduce((sum, project) => {
      const aiCosts = project.issues.reduce((issueSum, issue) => 
        issueSum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.cost, 0), 0
      )
      const manualCosts = project.manualTasks.reduce((taskSum, task) => taskSum + task.cost, 0)
      const extraCosts = project.extraExpenses.reduce((expSum, exp) => expSum + exp.amount, 0)
      return sum + aiCosts + manualCosts + extraCosts
    }, 0)

    const netProfit = totalRevenue - totalCosts
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Monthly revenue data
    const monthlyRevenue = []
    const monthsToShow = timeRange === 'year' ? 12 : timeRange === 'quarter' ? 3 : 1

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      
      const monthProjects = projects.filter(project => {
        const projectDate = new Date(project.createdAt)
        return projectDate >= monthDate && projectDate < nextMonth
      })

      const monthRevenue = monthProjects.reduce((sum, project) => {
        return sum + project.payments.reduce((pSum, payment) => pSum + payment.amount, 0)
      }, 0)

      monthlyRevenue.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        projects: monthProjects.length,
      })
    }

    // Top clients by revenue
    const clientRevenue = new Map()
    const clientProjects = new Map()

    projects.forEach(project => {
      const clientId = project.quote.clientId
      const clientName = project.quote.client.name
      const projectRevenue = project.payments.reduce((sum, payment) => sum + payment.amount, 0)

      if (!clientRevenue.has(clientId)) {
        clientRevenue.set(clientId, { id: clientId, name: clientName, revenue: 0, projects: 0 })
      }

      const client = clientRevenue.get(clientId)
      client.revenue += projectRevenue
      client.projects += 1
    })

    const topClients = Array.from(clientRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(client => ({
        id: client.id,
        name: client.name,
        totalRevenue: client.revenue,
        projectCount: client.projects,
      }))

    // Recent projects
    const recentProjects = projects
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(project => {
        const revenue = project.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const aiCosts = project.issues.reduce((issueSum, issue) => 
          issueSum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.cost, 0), 0
        )
        const manualCosts = project.manualTasks.reduce((taskSum, task) => taskSum + task.cost, 0)
        const extraCosts = project.extraExpenses.reduce((expSum, exp) => expSum + exp.amount, 0)
        const totalProjectCosts = aiCosts + manualCosts + extraCosts
        const profit = revenue - totalProjectCosts

        return {
          id: project.id,
          name: project.name,
          client: project.quote.client.name,
          status: project.status,
          revenue,
          profit,
          startDate: project.startDate,
        }
      })

    const reportData = {
      summary: {
        totalRevenue,
        totalProjects,
        activeProjects,
        totalClients,
        averageProjectValue,
        profitMargin,
      },
      monthlyRevenue,
      topClients,
      recentProjects,
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating reports:', error)
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    )
  }
}
