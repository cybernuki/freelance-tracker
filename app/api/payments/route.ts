import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPaymentSchema = z.object({
  projectId: z.string().uuid('Valid project ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  method: z.enum(['BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'WISE', 'CRYPTOCURRENCY', 'CHECK', 'CASH', 'OTHER']),
  description: z.string().optional(),
  date: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}
    if (projectId) where.projectId = projectId

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ])

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if project is active
    if (project.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Can only add payments to active projects' },
        { status: 400 }
      )
    }

    // Calculate total payments so far
    const existingPayments = await prisma.payment.findMany({
      where: { projectId: validatedData.projectId },
    })

    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const newTotal = totalPaid + validatedData.amount

    // Check if new total exceeds agreed price
    if (newTotal > project.agreedPrice) {
      return NextResponse.json(
        { 
          error: `Payment would exceed agreed price. Remaining: $${(project.agreedPrice - totalPaid).toFixed(2)}`,
          remainingAmount: project.agreedPrice - totalPaid
        },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.create({
      data: {
        projectId: validatedData.projectId,
        amount: validatedData.amount,
        method: validatedData.method,
        description: validatedData.description,
        date: new Date(validatedData.date),
      },
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
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
