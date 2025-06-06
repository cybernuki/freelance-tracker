import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createAiMessageSchema = z.object({
  issueId: z.string().uuid('Valid issue ID is required'),
  amount: z.number().min(1, 'Amount must be at least 1'),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  date: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const issueId = searchParams.get('issueId')
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}
    if (issueId) {
      where.issueId = issueId
    } else if (projectId) {
      where.issue = {
        projectId: projectId
      }
    }

    const [aiMessages, total] = await Promise.all([
      prisma.aiMessage.findMany({
        where,
        include: {
          issue: {
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
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aiMessage.count({ where }),
    ])

    return NextResponse.json({
      aiMessages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching AI messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createAiMessageSchema.parse(body)

    // Verify issue exists
    const issue = await prisma.issue.findUnique({
      where: { id: validatedData.issueId },
      include: {
        project: true,
      },
    })

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      )
    }

    // Calculate cost if not provided (using project's AI message rate)
    const cost = validatedData.cost ?? (validatedData.amount * issue.project.aiMessageRate)

    // Get current total AI messages for this issue
    const existingMessages = await prisma.aiMessage.findMany({
      where: { issueId: validatedData.issueId },
    })

    const currentTotal = existingMessages.reduce((sum, msg) => sum + msg.amount, 0)
    const newTotal = currentTotal + validatedData.amount

    // Check if new total exceeds estimate
    const exceedsEstimate = newTotal > issue.aiMessageEstimate
    const percentageUsed = (newTotal / issue.aiMessageEstimate) * 100

    const aiMessage = await prisma.aiMessage.create({
      data: {
        issueId: validatedData.issueId,
        amount: validatedData.amount,
        cost: cost,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
      },
      include: {
        issue: {
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
        },
      },
    })

    // Create alert if usage exceeds 80% of estimate
    if (percentageUsed >= 80 && !exceedsEstimate) {
      await prisma.alert.create({
        data: {
          projectId: issue.projectId,
          message: `AI message usage at ${percentageUsed.toFixed(0)}% for issue "${issue.title}"`,
        },
      })
    } else if (exceedsEstimate) {
      await prisma.alert.create({
        data: {
          projectId: issue.projectId,
          message: `AI message usage exceeded estimate for issue "${issue.title}" (${newTotal}/${issue.aiMessageEstimate})`,
        },
      })
    }

    return NextResponse.json({
      ...aiMessage,
      usage: {
        currentTotal: newTotal,
        estimate: issue.aiMessageEstimate,
        percentageUsed: percentageUsed,
        exceedsEstimate: exceedsEstimate,
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating AI message:', error)
    return NextResponse.json(
      { error: 'Failed to create AI message' },
      { status: 500 }
    )
  }
}
