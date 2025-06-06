import { Octokit } from 'octokit'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

export interface GitHubIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  created_at: string
  updated_at: string
  pull_request?: {
    url: string
  }
}

export interface GitHubMilestone {
  id: number
  title: string
  state: 'open' | 'closed'
  created_at: string
  updated_at: string
}

export async function fetchRepositoryIssues(
  owner: string,
  repo: string
): Promise<GitHubIssue[]> {
  try {
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 100,
    })

    return data.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state as 'open' | 'closed',
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      pull_request: issue.pull_request ? { url: issue.pull_request.url } : undefined,
    }))
  } catch (error) {
    console.error('Error fetching GitHub issues:', error)
    throw new Error('Failed to fetch GitHub issues')
  }
}

export async function fetchRepositoryMilestones(
  owner: string,
  repo: string
): Promise<GitHubMilestone[]> {
  try {
    const { data } = await octokit.rest.issues.listMilestones({
      owner,
      repo,
      state: 'all',
      per_page: 100,
    })

    return data.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      state: milestone.state as 'open' | 'closed',
      created_at: milestone.created_at,
      updated_at: milestone.updated_at,
    }))
  } catch (error) {
    console.error('Error fetching GitHub milestones:', error)
    throw new Error('Failed to fetch GitHub milestones')
  }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/
  const match = url.match(regex)
  
  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace('.git', ''),
    }
  }
  
  return null
}
