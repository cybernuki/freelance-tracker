import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        quote: true,
        milestones: {
          include: {
            issues: {
              include: {
                aiMessages: true,
              },
            },
          },
        },
        issues: {
          include: {
            aiMessages: true,
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

    // Return GitHub integration data for the project
    const responseData = {
      githubRepository: project.quote.githubRepository,
      aiMessageRate: project.aiMessageRate,
      milestones: project.milestones,
      issues: project.issues,
    }

    return NextResponse.json(convertBigIntToString(responseData))
  } catch (error) {
    console.error('Error fetching project GitHub data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project GitHub data' },
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
    const { action, issueId, actualMessages } = body

    if (action === 'updateAiMessages' && issueId && actualMessages !== undefined) {
      // Update actual AI messages for an issue
      const issue = await prisma.issue.update({
        where: { id: issueId },
        data: {
          aiMessageReal: actualMessages,
          costReal: actualMessages * (await prisma.project.findUnique({
            where: { id: params.id },
            select: { aiMessageRate: true }
          }))?.aiMessageRate || 0,
        },
      })

      return NextResponse.json(issue)
    }

    if (action === 'syncGitHub') {
      // Sync with GitHub - fetch latest issue statuses and PR information
      const project = await prisma.project.findUnique({
        where: { id: params.id },
        include: {
          quote: true,
          issues: true,
        },
      })

      if (!project?.quote.githubRepository) {
        return NextResponse.json(
          { error: 'No GitHub repository connected' },
          { status: 400 }
        )
      }

      // Here we would implement GitHub API calls to sync issue statuses
      // For now, return success
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating project GitHub data:', error)
    return NextResponse.json(
      { error: 'Failed to update project GitHub data' },
      { status: 500 }
    )
  }
}
