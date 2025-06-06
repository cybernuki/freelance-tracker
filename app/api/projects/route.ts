import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
  quoteId: z.string().uuid('Valid quote ID is required'),
  name: z.string().min(1, 'Project name is required').optional(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  agreedPrice: z.number().min(0, 'Agreed price must be positive').optional(),
  minimumCost: z.number().min(0, 'Minimum cost must be positive').optional(),
  aiMessageRate: z.number().min(0, 'AI message rate must be positive').default(0.1),
})

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  agreedPrice: z.number().min(0, 'Agreed price must be positive').optional(),
  minimumCost: z.number().min(0, 'Minimum cost must be positive').optional(),
  aiMessageRate: z.number().min(0, 'AI message rate must be positive').optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELED']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (clientId) {
      where.quote = {
        clientId: clientId
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
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
          alerts: {
            where: { read: false },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])

    // Calculate additional metrics for each project
    const projectsWithMetrics = projects.map(project => {
      const totalPaid = project.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const totalAiMessages = project.issues.reduce(
        (sum, issue) => sum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.amount, 0),
        0
      )
      const totalAiCost = project.issues.reduce(
        (sum, issue) => sum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.cost, 0),
        0
      )
      const totalManualCost = project.manualTasks.reduce((sum, task) => sum + task.cost, 0)
      const totalExtraExpenses = project.extraExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      const totalCosts = totalAiCost + totalManualCost + totalExtraExpenses
      const paymentProgress = project.agreedPrice > 0 ? (totalPaid / project.agreedPrice) * 100 : 0

      return {
        ...project,
        metrics: {
          totalPaid,
          totalAiMessages,
          totalAiCost,
          totalManualCost,
          totalExtraExpenses,
          totalCosts,
          paymentProgress,
          netProfit: totalPaid - totalCosts,
          unreadAlerts: project.alerts.length,
        }
      }
    })

    return NextResponse.json({
      projects: projectsWithMetrics,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // Verify quote exists and is accepted
    const quote = await prisma.quote.findUnique({
      where: { id: validatedData.quoteId },
      include: { client: true },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (quote.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Quote must be accepted before creating a project' },
        { status: 400 }
      )
    }

    // Check if project already exists for this quote
    const existingProject = await prisma.project.findUnique({
      where: { quoteId: validatedData.quoteId },
    })

    if (existingProject) {
      return NextResponse.json(
        { error: 'Project already exists for this quote' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        quoteId: validatedData.quoteId,
        name: validatedData.name || quote.name,
        description: validatedData.description || quote.description,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : quote.endDateEstimated,
        agreedPrice: validatedData.agreedPrice || quote.priceEstimated,
        minimumCost: validatedData.minimumCost || quote.minimumPrice,
        aiMessageRate: validatedData.aiMessageRate,
      },
      include: {
        quote: {
          include: {
            client: true,
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
