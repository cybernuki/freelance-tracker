import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateQuoteSchema = z.object({
  name: z.string().min(1, 'Quote name is required').optional(),
  description: z.string().optional(),
  startDateEstimated: z.string().optional(),
  endDateEstimated: z.string().optional(),
  source: z.string().optional(),
  sourceLink: z.string().url().optional().or(z.literal('')),
  priceEstimated: z.number().min(0, 'Price must be positive').optional(),
  minimumPrice: z.number().min(0, 'Minimum price must be positive').optional(),
  requirements: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'QUOTED', 'ACCEPTED', 'REJECTED']).optional(),
  aiMessagesUsedForRequirements: z.number().min(0).optional(),
  profitMarginPercentage: z.number().min(0).max(100).optional(),
  recommendedPrice: z.number().min(0).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        project: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
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
    const validatedData = updateQuoteSchema.parse(body)

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

    // If status is being changed to ACCEPTED, check if project already exists
    if (validatedData.status === 'ACCEPTED') {
      const existingProject = await prisma.project.findUnique({
        where: { quoteId: params.id },
      })

      if (existingProject) {
        return NextResponse.json(
          { error: 'Project already exists for this quote' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.source !== undefined) updateData.source = validatedData.source
    if (validatedData.sourceLink !== undefined) updateData.sourceLink = validatedData.sourceLink || null
    if (validatedData.priceEstimated !== undefined) updateData.priceEstimated = validatedData.priceEstimated
    if (validatedData.minimumPrice !== undefined) updateData.minimumPrice = validatedData.minimumPrice
    if (validatedData.requirements !== undefined) updateData.requirements = validatedData.requirements
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    
    if (validatedData.startDateEstimated !== undefined) {
      updateData.startDateEstimated = validatedData.startDateEstimated 
        ? new Date(validatedData.startDateEstimated) 
        : null
    }
    
    if (validatedData.endDateEstimated !== undefined) {
      updateData.endDateEstimated = validatedData.endDateEstimated 
        ? new Date(validatedData.endDateEstimated) 
        : null
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        project: true,
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating quote:', error)
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if quote exists
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { project: true },
    })

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Don't allow deletion if there's an associated project
    if (existingQuote.project) {
      return NextResponse.json(
        { error: 'Cannot delete quote with associated project' },
        { status: 400 }
      )
    }

    await prisma.quote.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Quote deleted successfully' })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    )
  }
}
