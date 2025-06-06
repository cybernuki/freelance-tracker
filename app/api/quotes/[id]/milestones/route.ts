import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const issueEstimationSchema = z.object({
  githubIssueId: z.number().transform(BigInt), // Convert number to BigInt
  issueNumber: z.number(),
  issueTitle: z.string(),
  issueType: z.enum(['AUGMENT', 'MANUAL']),
  estimatedMessages: z.number().nullable().optional(),
  fixedPrice: z.number().nullable().optional(),
  calculatedPrice: z.number().default(0),
})

const milestoneEstimationSchema = z.object({
  githubMilestoneId: z.number().transform(BigInt), // Convert number to BigInt
  milestoneTitle: z.string(),
  // milestoneType is calculated automatically based on issues
  estimatedMessages: z.number().optional(),
  fixedPrice: z.number().optional(),
  includeInQuote: z.boolean().default(true),
  issues: z.array(issueEstimationSchema).optional(),
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

    // Convert BigInt fields to numbers for JSON serialization
    const serializedMilestones = quote.milestoneEstimations?.map(milestone => ({
      ...milestone,
      githubMilestoneId: Number(milestone.githubMilestoneId),
      issueEstimations: milestone.issueEstimations?.map(issue => ({
        ...issue,
        githubIssueId: Number(issue.githubIssueId),
      })) || []
    })) || []

    return NextResponse.json({
      githubRepository: quote.githubRepository,
      aiMessageRate: quote.aiMessageRate,
      milestoneEstimations: serializedMilestones,
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
    console.log('Received payload:', JSON.stringify(body, null, 2))
    const validatedData = updateQuoteRepositorySchema.parse(body)
    console.log('Validated data processed successfully')

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

      // Clean up orphaned milestones (milestones that no longer exist in GitHub)
      if (validatedData.githubRepository) {
        const currentMilestoneIds = validatedData.milestones?.map(m => m.githubMilestoneId) || []

        // Remove milestones that are not in the current list
        await tx.quoteMilestoneEstimation.deleteMany({
          where: {
            quoteId: params.id,
            githubMilestoneId: {
              notIn: currentMilestoneIds,
            },
          },
        })
      } else {
        // If no repository is selected, remove all estimations
        await tx.quoteMilestoneEstimation.deleteMany({
          where: { quoteId: params.id },
        })
      }

      // Add or update milestone estimations if provided
      if (validatedData.milestones && validatedData.milestones.length > 0) {
        for (const milestone of validatedData.milestones) {
          // Calculate milestone total from issues
          let milestoneCalculatedPrice = 0
          if (milestone.issues && milestone.issues.length > 0) {
            milestoneCalculatedPrice = milestone.issues.reduce((sum, issue) => sum + issue.calculatedPrice, 0)
          }



          // Upsert milestone estimation
          const upsertedMilestone = await tx.quoteMilestoneEstimation.upsert({
            where: {
              quoteId_githubMilestoneId: {
                quoteId: params.id,
                githubMilestoneId: milestone.githubMilestoneId,
              },
            },
            update: {
              milestoneTitle: milestone.milestoneTitle,
              estimatedMessages: milestone.estimatedMessages,
              fixedPrice: milestone.fixedPrice,
              calculatedPrice: milestoneCalculatedPrice,
              includeInQuote: milestone.includeInQuote,
            },
            create: {
              quoteId: params.id,
              githubMilestoneId: milestone.githubMilestoneId,
              milestoneTitle: milestone.milestoneTitle,
              estimatedMessages: milestone.estimatedMessages,
              fixedPrice: milestone.fixedPrice,
              calculatedPrice: milestoneCalculatedPrice,
              includeInQuote: milestone.includeInQuote,
            },
          })

          // Remove existing issue estimations for this milestone
          await tx.quoteIssueEstimation.deleteMany({
            where: { milestoneEstimationId: upsertedMilestone.id },
          })

          // Create new issue estimations if provided
          if (milestone.issues && milestone.issues.length > 0) {
            const issueEstimationsToCreate = milestone.issues.map((issue) => ({
              milestoneEstimationId: upsertedMilestone.id,
              githubIssueId: issue.githubIssueId,
              issueNumber: issue.issueNumber,
              issueTitle: issue.issueTitle,
              issueType: issue.issueType,
              estimatedMessages: issue.estimatedMessages,
              fixedPrice: issue.fixedPrice,
              calculatedPrice: issue.calculatedPrice,
            }))

            await tx.quoteIssueEstimation.createMany({
              data: issueEstimationsToCreate,
            })
          }
        }
      }

      // Fetch updated quote with estimations
      return await tx.quote.findUnique({
        where: { id: params.id },
        include: {
          milestoneEstimations: {
            include: {
              issueEstimations: true,
            },
          },
        },
      })
    })

    // Convert BigInt fields to numbers for JSON serialization
    const serializedResult = {
      ...result,
      milestoneEstimations: result?.milestoneEstimations?.map(milestone => ({
        ...milestone,
        githubMilestoneId: Number(milestone.githubMilestoneId),
        issueEstimations: milestone.issueEstimations?.map(issue => ({
          ...issue,
          githubIssueId: Number(issue.githubIssueId),
        })) || []
      })) || []
    }

    return NextResponse.json(serializedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.errors)
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
