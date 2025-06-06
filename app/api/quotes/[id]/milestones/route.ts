import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const milestoneEstimationSchema = z.object({
  githubMilestoneId: z.number(),
  milestoneTitle: z.string(),
  milestoneType: z.enum(['AUGMENT', 'MANUAL']),
  estimatedMessages: z.number().optional(),
  fixedPrice: z.number().optional(),
  includeInQuote: z.boolean().default(true),
})

const updateQuoteRepositorySchema = z.object({
  githubRepository: z.string().nullable(),
  aiMessageRate: z.number().optional(),
  milestones: z.array(milestoneEstimationSchema).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        milestoneEstimations: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      githubRepository: quote.githubRepository,
      aiMessageRate: quote.aiMessageRate,
      milestoneEstimations: quote.milestoneEstimations,
    })
  } catch (error) {
    console.error('Error fetching quote milestones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote milestones' },
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
    const validatedData = updateQuoteRepositorySchema.parse(body)

    // Check if quote exists
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Start a transaction to update quote and milestones
    const result = await prisma.$transaction(async (tx) => {
      // Update quote with repository and AI message rate
      const updatedQuote = await tx.quote.update({
        where: { id: params.id },
        data: {
          githubRepository: validatedData.githubRepository,
          aiMessageRate: validatedData.aiMessageRate,
        },
      })

      // If repository is being changed or cleared, remove existing estimations
      if (validatedData.githubRepository !== existingQuote.githubRepository) {
        await tx.quoteMilestoneEstimation.deleteMany({
          where: { quoteId: params.id },
        })
      }

      // Add new milestone estimations if provided
      if (validatedData.milestones && validatedData.milestones.length > 0) {
        const estimationsToCreate = validatedData.milestones.map((milestone) => {
          let calculatedPrice = 0
          
          if (milestone.milestoneType === 'AUGMENT' && milestone.estimatedMessages && validatedData.aiMessageRate) {
            calculatedPrice = milestone.estimatedMessages * validatedData.aiMessageRate
          } else if (milestone.milestoneType === 'MANUAL' && milestone.fixedPrice) {
            calculatedPrice = milestone.fixedPrice
          }

          return {
            quoteId: params.id,
            githubMilestoneId: milestone.githubMilestoneId,
            milestoneTitle: milestone.milestoneTitle,
            milestoneType: milestone.milestoneType,
            estimatedMessages: milestone.estimatedMessages,
            fixedPrice: milestone.fixedPrice,
            calculatedPrice,
            includeInQuote: milestone.includeInQuote,
          }
        })

        await tx.quoteMilestoneEstimation.createMany({
          data: estimationsToCreate,
        })
      }

      // Fetch updated quote with estimations
      return await tx.quote.findUnique({
        where: { id: params.id },
        include: {
          milestoneEstimations: true,
        },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating quote milestones:', error)
    return NextResponse.json(
      { error: 'Failed to update quote milestones' },
      { status: 500 }
    )
  }
}
