import { prisma } from './prisma'

export interface ProfitabilityData {
  totalIncome: number
  totalCosts: number
  netProfit: number
  profitMargin: number
  breakdown: {
    aiMessagesCost: number
    manualTasksCost: number
    extraExpensesCost: number
  }
}

export async function calculateProjectProfitability(
  projectId: string
): Promise<ProfitabilityData> {
  // Get all project data in parallel
  const [payments, aiMessages, manualTasks, extraExpenses, issues] = await Promise.all([
    prisma.payment.findMany({
      where: { projectId },
    }),
    prisma.aiMessage.findMany({
      where: { issue: { projectId } },
    }),
    prisma.manualTask.findMany({
      where: { projectId },
    }),
    prisma.extraExpense.findMany({
      where: { projectId },
    }),
    prisma.issue.findMany({
      where: { projectId },
      include: { aiMessages: true },
    }),
  ])

  // Calculate total income
  const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0)

  // Calculate AI messages cost
  const aiMessagesCost = aiMessages.reduce((sum, message) => sum + message.cost, 0)

  // Calculate manual tasks cost
  const manualTasksCost = manualTasks.reduce((sum, task) => sum + task.cost, 0)

  // Calculate extra expenses cost
  const extraExpensesCost = extraExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Calculate total costs
  const totalCosts = aiMessagesCost + manualTasksCost + extraExpensesCost

  // Calculate net profit and margin
  const netProfit = totalIncome - totalCosts
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

  return {
    totalIncome,
    totalCosts,
    netProfit,
    profitMargin,
    breakdown: {
      aiMessagesCost,
      manualTasksCost,
      extraExpensesCost,
    },
  }
}

export async function updateProjectProfitability(projectId: string): Promise<void> {
  const profitability = await calculateProjectProfitability(projectId)

  await prisma.project.update({
    where: { id: projectId },
    data: {
      totalIncome: profitability.totalIncome,
      totalCosts: profitability.totalCosts,
      netProfit: profitability.netProfit,
      profitMargin: profitability.profitMargin,
    },
  })
}

export async function getProjectProgress(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      payments: true,
      issues: {
        include: { aiMessages: true },
      },
    },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  // Calculate payment progress
  const totalPaid = project.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const paymentProgress = (totalPaid / project.agreedPrice) * 100

  // Calculate AI messages usage
  const totalAiMessages = project.issues.reduce(
    (sum, issue) => sum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.amount, 0),
    0
  )
  const estimatedAiMessages = project.issues.reduce(
    (sum, issue) => sum + issue.aiMessageEstimate,
    0
  )
  const aiMessageProgress = estimatedAiMessages > 0 ? (totalAiMessages / estimatedAiMessages) * 100 : 0

  return {
    paymentProgress: Math.min(paymentProgress, 100),
    aiMessageProgress,
    totalPaid,
    totalAiMessages,
    estimatedAiMessages,
  }
}
