import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateClientSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        quotes: {
          include: {
            project: {
              include: {
                payments: true,
                issues: {
                  include: {
                    aiMessages: true,
                  },
                },
                manualTasks: true,
                extraExpenses: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Calculate client metrics
    const totalQuotes = client.quotes.length
    const acceptedQuotes = client.quotes.filter(q => q.status === 'ACCEPTED').length
    const activeProjects = client.quotes.filter(q => q.project?.status === 'ACTIVE').length
    const totalRevenue = client.quotes
      .filter(q => q.project)
      .reduce((sum, q) => {
        const payments = q.project?.payments || []
        return sum + payments.reduce((pSum, p) => pSum + p.amount, 0)
      }, 0)

    const clientWithMetrics = {
      ...client,
      metrics: {
        totalQuotes,
        acceptedQuotes,
        activeProjects,
        totalRevenue,
      }
    }

    return NextResponse.json(clientWithMetrics)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
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
    const validatedData = updateClientSchema.parse(body)

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: params.id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== existingClient.email) {
      const emailExists = await prisma.client.findUnique({
        where: { email: validatedData.email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email address is already in use' },
          { status: 400 }
        )
      }
    }

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        contact: validatedData.contact,
        email: validatedData.email || null,
        phone: validatedData.phone,
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        quotes: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if client has any projects
    const hasProjects = existingClient.quotes.some(quote => quote.project)
    
    if (hasProjects) {
      return NextResponse.json(
        { error: 'Cannot delete client with associated projects. Please complete or cancel projects first.' },
        { status: 400 }
      )
    }

    // Delete client (this will cascade delete quotes due to foreign key constraints)
    await prisma.client.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
