import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from 'octokit'
import { z } from 'zod'

const updateMilestoneSchema = z.object({
  repository: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  state: z.enum(['open', 'closed']).optional(),
  due_on: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const milestoneId = parseInt(params.id)
    if (isNaN(milestoneId)) {
      return NextResponse.json({ error: 'Invalid milestone ID' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateMilestoneSchema.parse(body)

    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 })
    }

    const octokit = new Octokit({ auth: githubToken })
    const [owner, repo] = validatedData.repository.split('/')

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Invalid repository format' }, { status: 400 })
    }

    // Update milestone in GitHub
    const response = await octokit.rest.issues.updateMilestone({
      owner,
      repo,
      milestone_number: milestoneId,
      title: validatedData.title,
      description: validatedData.description,
      state: validatedData.state,
      due_on: validatedData.due_on,
    })

    return NextResponse.json({
      milestone: {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        description: response.data.description,
        state: response.data.state,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        due_on: response.data.due_on,
        open_issues: response.data.open_issues,
        closed_issues: response.data.closed_issues,
      },
    })
  } catch (error) {
    console.error('Error updating milestone:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
}
