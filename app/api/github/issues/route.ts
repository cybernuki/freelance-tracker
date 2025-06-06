import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from 'octokit'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const repository = searchParams.get('repository') // Format: owner/repo
    const milestoneId = searchParams.get('milestone') // GitHub milestone ID
    const state = searchParams.get('state') || 'all' // open, closed, all

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

    // Fetch issues from GitHub
    const requestParams: any = {
      owner,
      repo,
      state: state as 'open' | 'closed' | 'all',
      per_page: 100,
    }

    // Add milestone filter if provided
    if (milestoneId) {
      // GitHub API expects milestone number (not ID) or special values like 'none' or '*'
      // First, try to get the milestone to find its number
      try {
        const milestonesResponse = await octokit.rest.issues.listMilestones({
          owner,
          repo,
          state: 'all'
        })

        const milestone = milestonesResponse.data.find(m => m.id.toString() === milestoneId.toString())
        if (milestone) {
          requestParams.milestone = milestone.number
        } else {
          // If milestone not found by ID, try using the value directly (might be a number already)
          requestParams.milestone = milestoneId
        }
      } catch (error) {
        console.error('Error fetching milestones for ID lookup:', error)
        // Fallback: use the provided value directly
        requestParams.milestone = milestoneId
      }
    }

    const { data } = await octokit.rest.issues.listForRepo(requestParams)

    const issues = data
      .filter(issue => !issue.pull_request) // Exclude pull requests
      .map((issue) => {
        // Determine issue type based on labels
        let issueType: 'AUGMENT' | 'MANUAL' | 'UNCATEGORIZED' = 'UNCATEGORIZED'
        
        const labels = issue.labels.map(label => 
          typeof label === 'string' ? label : label.name
        ).filter(Boolean)

        if (labels.includes('AUGMENT')) {
          issueType = 'AUGMENT'
        } else if (labels.includes('MANUAL')) {
          issueType = 'MANUAL'
        }

        return {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          closed_at: issue.closed_at,
          labels: labels,
          milestone: issue.milestone ? {
            id: issue.milestone.id,
            number: issue.milestone.number,
            title: issue.milestone.title,
          } : null,
          assignees: issue.assignees?.map(assignee => ({
            login: assignee.login,
            avatar_url: assignee.avatar_url,
          })) || [],
          issueType, // Our categorization based on labels
        }
      })

    return NextResponse.json({
      issues,
      repository: {
        owner,
        repo,
        full_name: repository,
      },
      milestone_id: milestoneId,
    })
  } catch (error) {
    console.error('Error fetching GitHub issues:', error)
    
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
      { error: 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}
