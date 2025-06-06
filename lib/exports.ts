import { prisma } from './prisma'
import { calculateProjectProfitability } from './profitability'

export interface ProjectProfitabilityReport {
  projectReference: number
  projectName: string
  clientName: string
  agreedPrice: number
  totalIncome: number
  totalCosts: number
  netProfit: number
  profitMargin: number
  aiMessagesCost: number
  manualTasksCost: number
  extraExpensesCost: number
  status: string
  startDate: string
  endDate: string | null
}

export interface AIWorkRatioReport {
  projectReference: number
  projectName: string
  totalAiMessages: number
  aiMessagesCost: number
  manualTasksCount: number
  manualTasksCost: number
  aiWorkPercentage: number
  manualWorkPercentage: number
}

export interface MonthlyAIUsageReport {
  month: string
  year: number
  totalMessages: number
  totalCost: number
  projectsCount: number
}

export async function generateProfitabilityReport(): Promise<ProjectProfitabilityReport[]> {
  const projects = await prisma.project.findMany({
    include: {
      quote: {
        include: {
          client: true,
        },
      },
    },
  })

  const reports: ProjectProfitabilityReport[] = []

  for (const project of projects) {
    const profitability = await calculateProjectProfitability(project.id)

    reports.push({
      projectReference: project.reference,
      projectName: project.name,
      clientName: project.quote.client.name,
      agreedPrice: project.agreedPrice,
      totalIncome: profitability.totalIncome,
      totalCosts: profitability.totalCosts,
      netProfit: profitability.netProfit,
      profitMargin: profitability.profitMargin,
      aiMessagesCost: profitability.breakdown.aiMessagesCost,
      manualTasksCost: profitability.breakdown.manualTasksCost,
      extraExpensesCost: profitability.breakdown.extraExpensesCost,
      status: project.status,
      startDate: project.startDate.toISOString().split('T')[0],
      endDate: project.endDate?.toISOString().split('T')[0] || null,
    })
  }

  return reports
}

export async function generateAIWorkRatioReport(): Promise<AIWorkRatioReport[]> {
  const projects = await prisma.project.findMany({
    include: {
      issues: {
        include: {
          aiMessages: true,
        },
      },
      manualTasks: true,
    },
  })

  return projects.map((project) => {
    const totalAiMessages = project.issues.reduce(
      (sum, issue) => sum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.amount, 0),
      0
    )
    const aiMessagesCost = project.issues.reduce(
      (sum, issue) => sum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.cost, 0),
      0
    )
    const manualTasksCount = project.manualTasks.length
    const manualTasksCost = project.manualTasks.reduce((sum, task) => sum + task.cost, 0)

    const totalCost = aiMessagesCost + manualTasksCost
    const aiWorkPercentage = totalCost > 0 ? (aiMessagesCost / totalCost) * 100 : 0
    const manualWorkPercentage = totalCost > 0 ? (manualTasksCost / totalCost) * 100 : 0

    return {
      projectReference: project.reference,
      projectName: project.name,
      totalAiMessages,
      aiMessagesCost,
      manualTasksCount,
      manualTasksCost,
      aiWorkPercentage,
      manualWorkPercentage,
    }
  })
}

export async function generateMonthlyAIUsageReport(): Promise<MonthlyAIUsageReport[]> {
  const aiMessages = await prisma.aiMessage.findMany({
    include: {
      issue: {
        include: {
          project: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  })

  const monthlyData = new Map<string, MonthlyAIUsageReport>()

  aiMessages.forEach((message) => {
    const date = new Date(message.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = date.toLocaleDateString('en-US', { month: 'long' })

    if (!monthlyData.has(key)) {
      monthlyData.set(key, {
        month: monthName,
        year: date.getFullYear(),
        totalMessages: 0,
        totalCost: 0,
        projectsCount: new Set<string>().size,
      })
    }

    const data = monthlyData.get(key)!
    data.totalMessages += message.amount
    data.totalCost += message.cost
  })

  // Count unique projects per month
  const projectsPerMonth = new Map<string, Set<string>>()
  aiMessages.forEach((message) => {
    const date = new Date(message.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!projectsPerMonth.has(key)) {
      projectsPerMonth.set(key, new Set())
    }
    projectsPerMonth.get(key)!.add(message.issue.projectId)
  })

  // Update projects count
  monthlyData.forEach((data, key) => {
    data.projectsCount = projectsPerMonth.get(key)?.size || 0
  })

  return Array.from(monthlyData.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth()
  })
}

export function convertToCSV<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header]
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    ),
  ].join('\n')

  return csvContent
}
