import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createQuoteSchema = z.object({
  name: z.string().min(1, 'Quote name is required'),
  description: z.string().optional(),
  clientId: z.string().uuid('Valid client ID is required'),
  startDateEstimated: z.string().optional(),
  endDateEstimated: z.string().optional(),
  source: z.string().optional(),
  sourceLink: z.string().url().optional().or(z.literal('')),
  priceEstimated: z.number().min(0, 'Price must be positive').optional().default(0),
  minimumPrice: z.number().min(0, 'Minimum price must be positive').optional().default(0),
  requirements: z.array(z.string()).default([]),
  aiMessagesUsedForRequirements: z.number().min(0).optional(),
  profitMarginPercentage: z.number().min(0).max(100).optional(),
  recommendedPrice: z.number().min(0).optional(),
  savedEstimatedTotal: z.number().min(0).optional(),
  savedEstimatedPrice: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'QUOTED', 'ACCEPTED', 'REJECTED']).optional().default('DRAFT'),
})

const updateQuoteSchema = createQuoteSchema.partial().extend({
  status: z.enum(['QUOTED', 'ACCEPTED', 'REJECTED']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          client: true,
          project: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ])

    return NextResponse.json({
      quotes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createQuoteSchema.parse(body)

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const quote = await prisma.quote.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        clientId: validatedData.clientId,
        startDateEstimated: validatedData.startDateEstimated
          ? new Date(validatedData.startDateEstimated)
          : null,
        endDateEstimated: validatedData.endDateEstimated
          ? new Date(validatedData.endDateEstimated)
          : null,
        source: validatedData.source,
        sourceLink: validatedData.sourceLink || null,
        priceEstimated: validatedData.priceEstimated,
        minimumPrice: validatedData.minimumPrice,
        requirements: validatedData.requirements,
        status: validatedData.status || 'DRAFT', // Explicitly set status
        aiMessagesUsedForRequirements: validatedData.aiMessagesUsedForRequirements,
        profitMarginPercentage: validatedData.profitMarginPercentage,
        recommendedPrice: validatedData.recommendedPrice,
      },
      include: {
        client: true,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating quote:', error)
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    )
  }
}
