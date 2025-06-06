import { prisma } from './prisma'
import { differenceInDays } from 'date-fns'

export async function generateProjectAlerts(): Promise<void> {
  const activeProjects = await prisma.project.findMany({
    where: { status: 'ACTIVE' },
    include: {
      payments: true,
      issues: {
        include: { aiMessages: true },
      },
    },
  })

  for (const project of activeProjects) {
    await generateAlertsForProject(project)
  }
}

async function generateAlertsForProject(project: any): Promise<void> {
  const alerts: string[] = []

  // Alert 1: No payment after 5+ days
  const daysSinceCreation = differenceInDays(new Date(), project.createdAt)
  const hasPayments = project.payments.length > 0

  if (daysSinceCreation >= 5 && !hasPayments) {
    alerts.push(`No payment received for project "${project.name}" after ${daysSinceCreation} days`)
  }

  // Alert 2: AI messages exceed estimate
  const totalAiMessages = project.issues.reduce(
    (sum: number, issue: any) => 
      sum + issue.aiMessages.reduce((msgSum: number, msg: any) => msgSum + msg.amount, 0),
    0
  )
  const estimatedAiMessages = project.issues.reduce(
    (sum: number, issue: any) => sum + issue.aiMessageEstimate,
    0
  )

  if (estimatedAiMessages > 0 && totalAiMessages > estimatedAiMessages) {
    const excess = totalAiMessages - estimatedAiMessages
    alerts.push(
      `AI messages exceeded estimate by ${excess} messages for project "${project.name}" (${totalAiMessages}/${estimatedAiMessages})`
    )
  }

  // Alert 3: Project overdue
  if (project.endDate && new Date() > project.endDate) {
    const daysOverdue = differenceInDays(new Date(), project.endDate)
    alerts.push(`Project "${project.name}" is ${daysOverdue} days overdue`)
  }

  // Alert 4: High AI message usage (>80% of estimate)
  if (estimatedAiMessages > 0) {
    const usagePercentage = (totalAiMessages / estimatedAiMessages) * 100
    if (usagePercentage >= 80 && usagePercentage < 100) {
      alerts.push(
        `AI message usage at ${usagePercentage.toFixed(1)}% for project "${project.name}"`
      )
    }
  }

  // Create alerts in database
  for (const message of alerts) {
    // Check if alert already exists to avoid duplicates
    const existingAlert = await prisma.alert.findFirst({
      where: {
        projectId: project.id,
        message,
        read: false,
      },
    })

    if (!existingAlert) {
      await prisma.alert.create({
        data: {
          projectId: project.id,
          message,
        },
      })
    }
  }
}

export async function getUnreadAlerts() {
  return prisma.alert.findMany({
    where: { read: false },
    include: {
      project: {
        include: {
          quote: {
            include: {
              client: true,
            },
          },
        },
      },
    },
    orderBy: { date: 'desc' },
  })
}

export async function markAlertAsRead(alertId: string) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { read: true },
  })
}

export async function markAllAlertsAsRead() {
  return prisma.alert.updateMany({
    where: { read: false },
    data: { read: true },
  })
}
