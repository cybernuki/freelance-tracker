import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Helper function to convert BigInt fields to strings recursively
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'bigint') {
    return obj.toString()
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString)
  }

  if (typeof obj === 'object') {
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value)
    }
    return converted
  }

  return obj
}

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
          milestones: {
            include: {
              issues: true,
            },
          },
          issues: {
            include: {
              aiMessages: true,
              milestone: true,
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

      const projectWithMetrics = {
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
          unreadAlerts: project.alerts?.length || 0,
        }
      }

      // Convert BigInt fields to strings for JSON serialization
      return convertBigIntToString(projectWithMetrics)
    })

    const responseData = {
      projects: projectsWithMetrics,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }

    return NextResponse.json(convertBigIntToString(responseData))
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
      include: {
        client: true,
        milestoneEstimations: {
          include: {
            issueEstimations: true,
          },
        },
      },
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

    // Create project and transfer milestone/issue data in a transaction
    const project = await prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
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
      })

      // Transfer milestones and issues from quote estimations
      if (quote.milestoneEstimations && quote.milestoneEstimations.length > 0) {
        for (const milestoneEst of quote.milestoneEstimations) {
          // Only transfer milestones that were included in the quote
          if (milestoneEst.includeInQuote) {
            // Create milestone
            const milestone = await tx.milestone.create({
              data: {
                projectId: newProject.id,
                title: milestoneEst.milestoneTitle,
                githubMilestoneId: milestoneEst.githubMilestoneId,
                isExtra: false, // These are baseline milestones from the quote
              },
            })

            // Transfer issues for this milestone
            if (milestoneEst.issueEstimations && milestoneEst.issueEstimations.length > 0) {
              for (const issueEst of milestoneEst.issueEstimations) {
                await tx.issue.create({
                  data: {
                    projectId: newProject.id,
                    milestoneId: milestone.id,
                    number: issueEst.issueNumber,
                    title: issueEst.issueTitle,
                    githubIssueId: issueEst.githubIssueId,
                    type: issueEst.issueType,
                    status: 'OPEN', // Default status
                    aiMessageEstimate: issueEst.estimatedMessages || 0,
                    aiMessageReal: 0, // Will be updated as work progresses
                    costEstimated: issueEst.calculatedPrice,
                    costReal: 0, // Will be updated as work progresses
                    isExtra: false, // These are baseline issues from the quote
                  },
                })
              }
            }
          }
        }
      }

      // Return the project with all related data
      const projectWithData = await tx.project.findUnique({
        where: { id: newProject.id },
        include: {
          quote: {
            include: {
              client: true,
            },
          },
          milestones: {
            include: {
              issues: true,
            },
          },
          issues: true,
        },
      })

      // Convert BigInt fields to strings for JSON serialization
      return convertBigIntToString(projectWithData)
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
