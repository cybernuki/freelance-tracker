import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateProjectProfitability } from '@/lib/profitability'
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        quote: {
          include: {
            client: true,
          },
        },
        payments: {
          orderBy: { date: 'desc' },
        },
        issues: {
          include: {
            aiMessages: {
              orderBy: { date: 'desc' },
            },
            milestone: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        milestones: {
          include: {
            issues: {
              include: {
                aiMessages: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        manualTasks: {
          orderBy: { createdAt: 'desc' },
        },
        extraExpenses: {
          orderBy: { date: 'desc' },
        },
        alerts: {
          where: { read: false },
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate profitability metrics
    const profitability = await calculateProjectProfitability(params.id)

    // Calculate additional metrics
    const totalPaid = project.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalAiMessages = project.issues.reduce(
      (sum, issue) => sum + issue.aiMessages.reduce((msgSum, msg) => msgSum + msg.amount, 0),
      0
    )
    const paymentProgress = project.agreedPrice > 0 ? (totalPaid / project.agreedPrice) * 100 : 0

    const projectWithMetrics = {
      ...project,
      profitability,
      metrics: {
        totalPaid,
        totalAiMessages,
        paymentProgress,
        unreadAlerts: project.alerts.length,
      }
    }

    // Convert BigInt fields to strings for JSON serialization
    return NextResponse.json(convertBigIntToString(projectWithMetrics))
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.agreedPrice !== undefined) updateData.agreedPrice = validatedData.agreedPrice
    if (validatedData.minimumCost !== undefined) updateData.minimumCost = validatedData.minimumCost
    if (validatedData.aiMessageRate !== undefined) updateData.aiMessageRate = validatedData.aiMessageRate
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    
    if (validatedData.startDate !== undefined) {
      updateData.startDate = new Date(validatedData.startDate)
    }
    
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
    }

    // If project is being completed, calculate and store profitability
    if (validatedData.status === 'COMPLETED' && existingProject.status !== 'COMPLETED') {
      const profitability = await calculateProjectProfitability(params.id)
      updateData.totalIncome = profitability.totalIncome
      updateData.totalCosts = profitability.totalCosts
      updateData.netProfit = profitability.netProfit
      updateData.profitMargin = profitability.profitMargin
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
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
            milestone: true,
          },
        },
        milestones: {
          include: {
            issues: true,
          },
        },
        manualTasks: true,
        extraExpenses: true,
      },
    })

    // Convert BigInt fields to strings for JSON serialization
    return NextResponse.json(convertBigIntToString(project))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        payments: true,
        issues: true,
        manualTasks: true,
        extraExpenses: true,
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Don't allow deletion if there are payments, issues, or other related data
    if (existingProject.payments.length > 0 || 
        existingProject.issues.length > 0 || 
        existingProject.manualTasks.length > 0 || 
        existingProject.extraExpenses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete project with associated data. Consider marking it as canceled instead.' },
        { status: 400 }
      )
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
