import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addAiMessageSchema = z.object({
  issueId: z.string().uuid(),
  amount: z.number().min(1, 'Amount must be at least 1'),
  cost: z.number().min(0, 'Cost must be positive'),
  date: z.string().optional(),
})

const updateIssueAiMessagesSchema = z.object({
  issueId: z.string().uuid(),
  actualMessages: z.number().min(0, 'Actual messages must be positive'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        issues: {
          include: {
            aiMessages: {
              orderBy: { date: 'desc' },
            },
            milestone: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate AI message statistics
    const statistics = project.issues.map(issue => {
      const totalActualMessages = issue.aiMessages.reduce((sum, msg) => sum + msg.amount, 0)
      const totalActualCost = issue.aiMessages.reduce((sum, msg) => sum + msg.cost, 0)
      const estimatedCost = issue.aiMessageEstimate * project.aiMessageRate
      
      return {
        issueId: issue.id,
        issueTitle: issue.title,
        issueNumber: issue.number,
        issueType: issue.type,
        milestoneTitle: issue.milestone?.title,
        estimated: {
          messages: issue.aiMessageEstimate,
          cost: estimatedCost,
        },
        actual: {
          messages: totalActualMessages,
          cost: totalActualCost,
        },
        variance: {
          messages: totalActualMessages - issue.aiMessageEstimate,
          cost: totalActualCost - estimatedCost,
          percentage: issue.aiMessageEstimate > 0 
            ? ((totalActualMessages - issue.aiMessageEstimate) / issue.aiMessageEstimate) * 100 
            : 0,
        },
        aiMessages: issue.aiMessages,
      }
    })

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      aiMessageRate: project.aiMessageRate,
      statistics,
      totals: {
        estimated: {
          messages: statistics.reduce((sum, stat) => sum + stat.estimated.messages, 0),
          cost: statistics.reduce((sum, stat) => sum + stat.estimated.cost, 0),
        },
        actual: {
          messages: statistics.reduce((sum, stat) => sum + stat.actual.messages, 0),
          cost: statistics.reduce((sum, stat) => sum + stat.actual.cost, 0),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching AI message statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI message statistics' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'addAiMessage') {
      const validatedData = addAiMessageSchema.parse(body)
      
      // Verify the issue belongs to this project
      const issue = await prisma.issue.findFirst({
        where: {
          id: validatedData.issueId,
          projectId: params.id,
        },
      })

      if (!issue) {
        return NextResponse.json(
          { error: 'Issue not found in this project' },
          { status: 404 }
        )
      }

      const aiMessage = await prisma.aiMessage.create({
        data: {
          issueId: validatedData.issueId,
          amount: validatedData.amount,
          cost: validatedData.cost,
          date: validatedData.date ? new Date(validatedData.date) : new Date(),
        },
      })

      // Update issue's real AI message count and cost
      const totalMessages = await prisma.aiMessage.aggregate({
        where: { issueId: validatedData.issueId },
        _sum: { amount: true, cost: true },
      })

      await prisma.issue.update({
        where: { id: validatedData.issueId },
        data: {
          aiMessageReal: totalMessages._sum.amount || 0,
          costReal: totalMessages._sum.cost || 0,
        },
      })

      return NextResponse.json(aiMessage, { status: 201 })
    }

    if (action === 'updateActualMessages') {
      const validatedData = updateIssueAiMessagesSchema.parse(body)
      
      // Verify the issue belongs to this project
      const issue = await prisma.issue.findFirst({
        where: {
          id: validatedData.issueId,
          projectId: params.id,
        },
        include: {
          project: true,
        },
      })

      if (!issue) {
        return NextResponse.json(
          { error: 'Issue not found in this project' },
          { status: 404 }
        )
      }

      const updatedIssue = await prisma.issue.update({
        where: { id: validatedData.issueId },
        data: {
          aiMessageReal: validatedData.actualMessages,
          costReal: validatedData.actualMessages * issue.project.aiMessageRate,
        },
      })

      return NextResponse.json(updatedIssue)
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error processing AI message request:', error)
    return NextResponse.json(
      { error: 'Failed to process AI message request' },
      { status: 500 }
    )
  }
}
