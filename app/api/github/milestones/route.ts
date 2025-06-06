import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from 'octokit'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const repository = searchParams.get('repository') // Format: owner/repo
    const state = searchParams.get('state') || 'open' // open, closed, all

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository parameter is required (format: owner/repo)' },
        { status: 400 }
      )
    }

    const [owner, repo] = repository.split('/')
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Invalid repository format. Use: owner/repo' },
        { status: 400 }
      )
    }

    // Fetch milestones from GitHub
    const { data } = await octokit.rest.issues.listMilestones({
      owner,
      repo,
      state: state as 'open' | 'closed' | 'all',
      per_page: 100,
    })

    const milestones = data.map((milestone) => {
      // Determine milestone type based on title
      let milestoneType: 'AUGMENT' | 'MANUAL' | 'UNCATEGORIZED' = 'UNCATEGORIZED'
      
      if (milestone.title.startsWith('[AUGMENT]')) {
        milestoneType = 'AUGMENT'
      } else if (milestone.title.startsWith('[MANUAL]')) {
        milestoneType = 'MANUAL'
      }

      return {
        id: milestone.id,
        number: milestone.number,
        title: milestone.title,
        description: milestone.description,
        state: milestone.state,
        created_at: milestone.created_at,
        updated_at: milestone.updated_at,
        due_on: milestone.due_on,
        open_issues: milestone.open_issues,
        closed_issues: milestone.closed_issues,
        milestoneType, // Our categorization
      }
    })

    return NextResponse.json({
      milestones,
      repository: {
        owner,
        repo,
        full_name: repository,
      },
    })
  } catch (error) {
    console.error('Error fetching GitHub milestones:', error)
    
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'GitHub API rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json(
        { error: 'Repository not found or not accessible' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}
