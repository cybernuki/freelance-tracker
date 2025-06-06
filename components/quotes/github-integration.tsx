'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Github, AlertTriangle, CheckCircle, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  private: boolean
  owner: {
    login: string
    avatar_url: string
  }
}

interface GitHubMilestone {
  id: number
  number: number
  title: string
  description: string
  state: 'open' | 'closed'
  open_issues: number
  closed_issues: number
}

interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  labels: string[]
  milestone: {
    id: number
    number: number
    title: string
  } | null
  issueType: 'AUGMENT' | 'MANUAL' | 'UNCATEGORIZED'
}

interface IssueEstimation {
  githubIssueId: number
  issueNumber: number
  issueTitle: string
  issueType: 'AUGMENT' | 'MANUAL' | 'UNCATEGORIZED'
  estimatedMessages?: number
  fixedPrice?: number
  calculatedPrice: number
}

interface MilestoneEstimation {
  githubMilestoneId: number
  milestoneTitle: string
  issues: IssueEstimation[]
  calculatedPrice: number
  includeInQuote: boolean
}

interface GitHubIntegrationProps {
  // Common props
  currentRepository?: string
  currentAiMessageRate?: number
  onUpdate: () => void

  // Quote-specific props
  quoteId?: string
  existingMilestones?: any[]
  onMilestonesValidationChange?: (isValid: boolean) => void
  onUpdateEstimatedPrice?: (price: number, milestonesData?: any) => void

  // Project-specific props
  projectId?: string
  mode?: 'quote' | 'project'
  projectMilestones?: any[]
  projectIssues?: any[]
  onAiMessageUpdate?: (issueId: string, actualMessages: number) => void
  onSyncGitHub?: () => void

  // UI customization
  showRepositorySearch?: boolean
  showPricing?: boolean
  showAiMessageTracking?: boolean
  showEstimatedVsActual?: boolean
  readonly?: boolean
}

export function GitHubIntegration({
  // Common props
  currentRepository,
  currentAiMessageRate,
  onUpdate,

  // Quote-specific props
  quoteId,
  existingMilestones,
  onMilestonesValidationChange,
  onUpdateEstimatedPrice,

  // Project-specific props
  projectId,
  mode = 'quote',
  projectMilestones,
  projectIssues,
  onAiMessageUpdate,
  onSyncGitHub,

  // UI customization
  showRepositorySearch = true,
  showPricing = true,
  showAiMessageTracking = false,
  showEstimatedVsActual = false,
  readonly = false
}: GitHubIntegrationProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState(currentRepository || '')
  const [milestones, setMilestones] = useState<GitHubMilestone[]>([])
  const [milestoneIssues, setMilestoneIssues] = useState<{[key: number]: GitHubIssue[]}>({})
  const [estimations, setEstimations] = useState<MilestoneEstimation[]>([])
  const [aiMessageRate, setAiMessageRate] = useState(currentAiMessageRate || 0.08)
  const [copToUsdRate, setCopToUsdRate] = useState(4200) // Default COP to USD rate

  const [loadingRepositories, setLoadingRepositories] = useState(false)
  const [loadingMilestones, setLoadingMilestones] = useState(false)
  const [loadingIssues, setLoadingIssues] = useState<{[key: number]: boolean}>({})
  const [saving, setSaving] = useState(false)
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false)

  // Project-specific states
  const [githubIssueStatuses, setGithubIssueStatuses] = useState<{[key: number]: any}>({})
  const [pullRequestStatuses, setPullRequestStatuses] = useState<{[key: number]: any}>({})
  const [actualAiMessages, setActualAiMessages] = useState<{[key: string]: number}>({})
  const [syncingGitHub, setSyncingGitHub] = useState(false)

  // Fetch existing estimations on component mount
  useEffect(() => {
    if (mode === 'quote' && quoteId) {
      fetchExistingEstimations()
    } else if (mode === 'project' && projectId) {
      fetchProjectData()
    }
  }, [quoteId, projectId, mode])

  // Fetch milestones when repository changes, but only if we don't have existing milestone data
  // and we've already processed existing milestones
  useEffect(() => {
    if (selectedRepository && !isLoadingExistingData && estimations.length === 0 && (!existingMilestones || existingMilestones.length === 0)) {
      fetchMilestones()
    }
  }, [selectedRepository, isLoadingExistingData, estimations.length, existingMilestones])

  // Validate milestones whenever estimations change
  useEffect(() => {
    const isValid = validateMilestones()
    onMilestonesValidationChange?.(isValid)
  }, [estimations, milestones])

  // Load existing milestones when component mounts
  useEffect(() => {
    if (existingMilestones && existingMilestones.length > 0) {
      setIsLoadingExistingData(true)

      // Convert existing milestones to the format expected by the component
      const convertedEstimations: MilestoneEstimation[] = existingMilestones.map(milestone => ({
        githubMilestoneId: milestone.githubMilestoneId,
        milestoneTitle: milestone.milestoneTitle,
        issues: milestone.issueEstimations ? milestone.issueEstimations.map((issue: any) => ({
          githubIssueId: issue.githubIssueId,
          issueNumber: issue.issueNumber,
          issueTitle: issue.issueTitle,
          issueType: issue.issueType,
          estimatedMessages: issue.estimatedMessages,
          fixedPrice: issue.fixedPrice,
          calculatedPrice: issue.calculatedPrice,
        })) : [],
        calculatedPrice: milestone.calculatedPrice,
        includeInQuote: milestone.includeInQuote,
      }))

      setEstimations(convertedEstimations)

      // Also populate milestoneIssues for the UI to work properly
      const issuesMap: {[key: number]: GitHubIssue[]} = {}
      existingMilestones.forEach(milestone => {
        if (milestone.issueEstimations) {
          issuesMap[milestone.githubMilestoneId] = milestone.issueEstimations.map((issue: any) => ({
            id: issue.githubIssueId,
            number: issue.issueNumber,
            title: issue.issueTitle,
            issueType: issue.issueType,
            state: 'open', // Default value
            html_url: '', // Default value
            body: '',
            labels: [],
            milestone: null,
          }))
        }
      })
      setMilestoneIssues(issuesMap)

      setIsLoadingExistingData(false)
    }
  }, [existingMilestones])

  const fetchExistingEstimations = async () => {
    if (!quoteId) return

    try {
      const response = await fetch(`/api/quotes/${quoteId}/milestones`)
      if (response.ok) {
        const data = await response.json()
        setSelectedRepository(data.githubRepository || '')
        setAiMessageRate(data.aiMessageRate || 0.08)
        // Convert old format to new format if needed
        // setEstimations(data.milestoneEstimations || [])
      }
    } catch (error) {
      console.error('Error fetching existing estimations:', error)
    }
  }

  const fetchProjectData = async () => {
    if (!projectId) return

    try {
      const response = await fetch(`/api/projects/${projectId}/github`)
      if (response.ok) {
        const data = await response.json()
        setSelectedRepository(data.githubRepository || '')
        setAiMessageRate(data.aiMessageRate || 0.08)

        // Convert project milestones and issues to estimations format
        if (data.milestones && data.milestones.length > 0) {
          const convertedEstimations = data.milestones.map((milestone: any) => ({
            githubMilestoneId: milestone.githubMilestoneId,
            milestoneTitle: milestone.title,
            issues: milestone.issues?.map((issue: any) => ({
              githubIssueId: issue.githubIssueId,
              issueNumber: issue.number,
              issueTitle: issue.title,
              issueType: issue.type,
              estimatedMessages: issue.aiMessageEstimate,
              actualMessages: issue.aiMessageReal,
              fixedPrice: issue.costEstimated,
              calculatedPrice: issue.costEstimated,
            })) || [],
            calculatedPrice: milestone.issues?.reduce((sum: number, issue: any) => sum + issue.costEstimated, 0) || 0,
            includeInQuote: true,
          }))
          setEstimations(convertedEstimations)
        }
      }
    } catch (error) {
      console.error('Error fetching project data:', error)
    }
  }

  const searchRepositories = async () => {
    if (!searchQuery.trim()) return

    setLoadingRepositories(true)
    try {
      const response = await fetch(`/api/github/repositories?q=${encodeURIComponent(searchQuery)}&per_page=10`)
      if (response.ok) {
        const data = await response.json()
        setRepositories(data.repositories)
      } else {
        console.error('Failed to search repositories')
      }
    } catch (error) {
      console.error('Error searching repositories:', error)
    } finally {
      setLoadingRepositories(false)
    }
  }

  const fetchAllMilestoneIssues = async (milestones: GitHubMilestone[]) => {
    if (!selectedRepository) return

    // Set loading state for all milestones
    const loadingState = milestones.reduce((acc, milestone) => {
      acc[milestone.id] = true
      return acc
    }, {} as {[key: number]: boolean})
    setLoadingIssues(loadingState)

    try {
      // Fetch issues for all milestones in parallel
      const issuePromises = milestones.map(async (milestone) => {
        try {
          const response = await fetch(
            `/api/github/issues?repository=${encodeURIComponent(selectedRepository)}&milestone=${milestone.id}&state=all`
          )
          if (response.ok) {
            const data = await response.json()
            return { milestoneId: milestone.id, milestone, issues: data.issues }
          }
          return null
        } catch (error) {
          console.error(`Error fetching issues for milestone ${milestone.id}:`, error)
          return null
        }
      })

      const results = await Promise.all(issuePromises)

      // Process results
      const newMilestoneIssues: {[key: number]: GitHubIssue[]} = {}
      const newEstimations: MilestoneEstimation[] = []

      results.forEach((result) => {
        if (result) {
          const { milestoneId, milestone, issues } = result
          newMilestoneIssues[milestoneId] = issues

          // Check if we have existing estimation for this milestone
          const existingEstimation = estimations.find(est => est.githubMilestoneId === milestoneId)

          if (existingEstimation) {
            // Merge existing estimation with new GitHub data
            const mergedIssues: IssueEstimation[] = issues.map((issue: GitHubIssue) => {
              // Check if we have existing estimation for this issue
              const existingIssue = existingEstimation.issues.find(est => est.githubIssueId === issue.id)

              if (existingIssue) {
                // Keep existing estimation data but update title and type from GitHub
                return {
                  ...existingIssue,
                  issueTitle: issue.title, // Update title in case it changed
                  issueType: issue.issueType, // Update type in case labels changed
                }
              } else {
                // New issue, create fresh estimation
                return {
                  githubIssueId: issue.id,
                  issueNumber: issue.number,
                  issueTitle: issue.title,
                  issueType: issue.issueType,
                  calculatedPrice: 0,
                }
              }
            })

            // Recalculate milestone total
            const milestoneTotal = mergedIssues.reduce((sum, issue) => sum + issue.calculatedPrice, 0)

            newEstimations.push({
              ...existingEstimation,
              milestoneTitle: milestone.title, // Update title in case it changed
              issues: mergedIssues,
              calculatedPrice: milestoneTotal,
            })
          } else {
            // Create new estimation for this milestone
            const issueEstimations: IssueEstimation[] = issues.map((issue: GitHubIssue) => ({
              githubIssueId: issue.id,
              issueNumber: issue.number,
              issueTitle: issue.title,
              issueType: issue.issueType,
              calculatedPrice: 0,
            }))

            newEstimations.push({
              githubMilestoneId: milestoneId,
              milestoneTitle: milestone.title,
              issues: issueEstimations,
              calculatedPrice: 0,
              includeInQuote: false,
            })
          }
        }
      })

      // Update state
      setMilestoneIssues(newMilestoneIssues)
      setEstimations(newEstimations)

    } catch (error) {
      console.error('Error fetching milestone issues:', error)
    } finally {
      // Clear loading state for all milestones
      setLoadingIssues({})
    }
  }

  const fetchMilestones = async () => {
    if (!selectedRepository) return

    setLoadingMilestones(true)
    try {
      const response = await fetch(`/api/github/milestones?repository=${encodeURIComponent(selectedRepository)}&state=open`)
      if (response.ok) {
        const data = await response.json()
        setMilestones(data.milestones)
        // Don't reset estimations - let fetchAllMilestoneIssues handle the merging
        setMilestoneIssues({})

        // Automatically load issues for all milestones
        if (data.milestones.length > 0) {
          await fetchAllMilestoneIssues(data.milestones)
        }
      } else {
        console.error('Failed to fetch milestones')
      }
    } catch (error) {
      console.error('Error fetching milestones:', error)
    } finally {
      setLoadingMilestones(false)
    }
  }



  const updateIssueEstimation = (
    milestoneId: number,
    issueId: number,
    field: 'estimatedMessages' | 'fixedPrice',
    value: number
  ) => {
    setEstimations(prev => prev.map(milestone => {
      if (milestone.githubMilestoneId !== milestoneId) return milestone

      const updatedIssues = milestone.issues.map(issue => {
        if (issue.githubIssueId !== issueId) return issue

        const updatedIssue = { ...issue, [field]: value }

        // Recalculate price based on issue type
        if (updatedIssue.issueType === 'AUGMENT' && updatedIssue.estimatedMessages) {
          updatedIssue.calculatedPrice = updatedIssue.estimatedMessages * aiMessageRate
        } else if (updatedIssue.issueType === 'MANUAL' && updatedIssue.fixedPrice) {
          updatedIssue.calculatedPrice = updatedIssue.fixedPrice
        } else {
          updatedIssue.calculatedPrice = 0
        }

        return updatedIssue
      })

      // Recalculate milestone total
      const milestoneTotal = updatedIssues.reduce((sum, issue) => sum + issue.calculatedPrice, 0)

      // Check if milestone can still be included after the update
      const canBeIncluded = canMilestoneBeIncluded(milestoneId)
      const shouldInclude = milestone.includeInQuote && canBeIncluded

      return {
        ...milestone,
        issues: updatedIssues,
        calculatedPrice: milestoneTotal,
        includeInQuote: shouldInclude,
      }
    }))
  }

  const toggleMilestoneInQuote = (milestoneId: number, include: boolean) => {
    setEstimations(prev => prev.map(milestone =>
      milestone.githubMilestoneId === milestoneId
        ? { ...milestone, includeInQuote: include }
        : milestone
    ))
  }

  const canMilestoneBeIncluded = (milestoneId: number) => {
    const issues = milestoneIssues[milestoneId] || []

    // Must have at least one issue
    if (issues.length === 0) return false

    // Must have at least one issue with AUGMENT or MANUAL label (not UNCATEGORIZED)
    const categorizedIssues = issues.filter(issue =>
      issue.issueType === 'AUGMENT' || issue.issueType === 'MANUAL'
    )

    return categorizedIssues.length > 0
  }

  const getMilestoneInclusionMessage = (milestoneId: number) => {
    const issues = milestoneIssues[milestoneId] || []

    if (issues.length === 0) {
      return "No issues found in this milestone"
    }

    const categorizedIssues = issues.filter(issue =>
      issue.issueType === 'AUGMENT' || issue.issueType === 'MANUAL'
    )

    if (categorizedIssues.length === 0) {
      return "All issues need AUGMENT or MANUAL labels to include in quote"
    }

    return null
  }

  const validateMilestones = () => {
    if (milestones.length === 0) return true // No milestones is valid

    // Only validate milestones that are included in the quote
    const includedEstimations = estimations.filter(est => est.includeInQuote)

    return includedEstimations.every(estimation => {
      // All issues in the milestone must be properly categorized and estimated
      return estimation.issues.every(issue => {
        if (issue.issueType === 'UNCATEGORIZED') return false
        
        if (issue.issueType === 'AUGMENT') {
          return issue.estimatedMessages && issue.estimatedMessages > 0
        } else if (issue.issueType === 'MANUAL') {
          return issue.fixedPrice && issue.fixedPrice > 0
        }
        
        return false
      })
    })
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      // Convert estimations to API format with issue details
      const milestonesForApi = estimations.map(estimation => {
        // Filter issues: only include categorized issues (AUGMENT or MANUAL)
        const validIssues = estimation.issues.filter(issue =>
          issue.issueType === 'AUGMENT' || issue.issueType === 'MANUAL'
        )

        // milestoneType is now calculated automatically in the backend

        return {
          githubMilestoneId: estimation.githubMilestoneId,
          milestoneTitle: estimation.milestoneTitle,
          // milestoneType is calculated automatically in the backend
          calculatedPrice: estimation.calculatedPrice,
          includeInQuote: estimation.includeInQuote,
          issues: validIssues.map(issue => ({
            githubIssueId: issue.githubIssueId,
            issueNumber: issue.issueNumber,
            issueTitle: issue.issueTitle,
            issueType: issue.issueType,
            estimatedMessages: issue.estimatedMessages,
            fixedPrice: issue.fixedPrice,
            calculatedPrice: issue.calculatedPrice,
          })),
        }
      })

      const response = await fetch(`/api/quotes/${quoteId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubRepository: selectedRepository || null,
          aiMessageRate,
          milestones: milestonesForApi,
        }),
      })

      if (response.ok) {
        onUpdate()
      } else {
        console.error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  const totalEstimatedCost = estimations
    .filter(est => est.includeInQuote)
    .reduce((sum, est) => sum + est.calculatedPrice, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          Project Tasks & Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Message Rate and COP Rate Configuration - Only show in quote mode or if showPricing is true */}
        {(mode === 'quote' || showPricing) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>AI Message Rate ($ per message)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={aiMessageRate}
                onChange={(e) => setAiMessageRate(parseFloat(e.target.value) || 0)}
                disabled={readonly}
              />
            </div>
            <div>
              <Label>COP to USD Rate</Label>
              <Input
                type="number"
                min="0"
                value={copToUsdRate}
                onChange={(e) => setCopToUsdRate(parseFloat(e.target.value) || 0)}
                disabled={readonly}
              />
              <p className="text-xs text-muted-foreground mt-1">
                AI Rate in COP: {formatCurrency(aiMessageRate * copToUsdRate, 'COP')}
              </p>
            </div>
          </div>
        )}

        {/* Repository Search - Only show if showRepositorySearch is true */}
        {showRepositorySearch && (
          <div className="space-y-4">
            <div>
              <Label>Search GitHub Repository</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchRepositories()}
                  disabled={readonly}
                />
                <Button
                  onClick={searchRepositories}
                  disabled={loadingRepositories || !searchQuery.trim() || readonly}
                >
                  {loadingRepositories ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>

            {repositories.length > 0 && (
              <div>
                <Label>Select Repository</Label>
                <Select value={selectedRepository} onValueChange={setSelectedRepository} disabled={readonly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.full_name}>
                        <div className="flex items-center gap-2">
                          <img
                            src={repo.owner.avatar_url}
                            alt={repo.owner.login}
                            className="w-4 h-4 rounded-full"
                          />
                          <span>{repo.full_name}</span>
                          {repo.private && <Badge variant="secondary" className="text-xs">Private</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Repository Display - Show current repository when search is disabled */}
        {!showRepositorySearch && selectedRepository && (
          <div className="space-y-2">
            <Label>Connected Repository</Label>
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
              <Github className="w-4 h-4" />
              <span className="font-medium">{selectedRepository}</span>
              {onSyncGitHub && (
                <Button
                  onClick={onSyncGitHub}
                  variant="outline"
                  size="sm"
                  disabled={syncingGitHub}
                  className="ml-auto"
                >
                  {syncingGitHub ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync'}
                </Button>
              )}
            </div>
          </div>
        )}



        {/* Milestones */}
        {selectedRepository && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Milestones</h3>
              <Button 
                onClick={fetchMilestones} 
                variant="outline" 
                size="sm"
                disabled={loadingMilestones}
              >
                {loadingMilestones ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            {loadingMilestones ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading milestones...</span>
              </div>
            ) : estimations.length === 0 && milestones.length === 0 ? (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  No milestones found in this repository.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Show milestones from GitHub if available, otherwise show from estimations */}
                {(milestones.length > 0 ? milestones : estimations.map(est => ({
                  id: est.githubMilestoneId,
                  title: est.milestoneTitle,
                  open_issues: 0,
                  closed_issues: 0
                }))).map((milestone) => {
                  const estimation = estimations.find(e => e.githubMilestoneId === milestone.id)
                  const issues = milestoneIssues[milestone.id] || []
                  const isLoadingIssues = loadingIssues[milestone.id]

                  return (
                    <Card key={milestone.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{milestone.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {milestone.open_issues} open, {milestone.closed_issues} closed
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={estimation?.includeInQuote ?? false}
                              disabled={!canMilestoneBeIncluded(milestone.id)}
                              onCheckedChange={(checked) => {
                                if (canMilestoneBeIncluded(milestone.id)) {
                                  toggleMilestoneInQuote(milestone.id, checked as boolean)
                                }
                              }}
                            />
                            <Label className={`text-sm ${!canMilestoneBeIncluded(milestone.id) ? 'text-muted-foreground' : ''}`}>
                              Include in quote
                            </Label>
                            {!canMilestoneBeIncluded(milestone.id) && (
                              <span className="text-xs text-red-600">
                                {getMilestoneInclusionMessage(milestone.id)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isLoadingIssues && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading issues...
                          </div>
                        )}

                        {!isLoadingIssues && issues.length === 0 && (!estimation || estimation.issues.length === 0) && (
                          <div className="text-sm text-muted-foreground">
                            No issues found in this milestone.
                          </div>
                        )}

                        {!isLoadingIssues && estimation && estimation.issues.length > 0 && (
                          <div className="space-y-3">
                            {estimation.issues.map((issueEst) => {
                              const issue = issues.find(i => i.id === issueEst.githubIssueId)
                              // If no GitHub issue data, create a minimal issue object from estimation data
                              const displayIssue = issue || {
                                id: issueEst.githubIssueId,
                                number: issueEst.issueNumber,
                                title: issueEst.issueTitle,
                                issueType: issueEst.issueType,
                                state: 'open',
                                html_url: '',
                                body: '',
                                labels: [],
                                milestone: null,
                              }

                              return (
                                <div key={displayIssue.id} className="border rounded-lg p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium text-sm">#{displayIssue.number} {displayIssue.title}</h5>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant={
                                            displayIssue.issueType === 'AUGMENT' ? 'default' :
                                            displayIssue.issueType === 'MANUAL' ? 'secondary' : 'destructive'
                                          }
                                          className="text-xs"
                                        >
                                          {displayIssue.issueType}
                                        </Badge>
                                        {displayIssue.issueType === 'UNCATEGORIZED' && (
                                          <span className="text-xs text-red-600">
                                            Fix the issue labels with AUGMENT or MANUAL
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium text-sm">
                                        {formatCurrency(issueEst.calculatedPrice)}
                                      </div>
                                    </div>
                                  </div>

                                  {displayIssue.issueType === 'AUGMENT' && (
                                    <div>
                                      <Label className="text-xs">Estimated Messages</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={issueEst.estimatedMessages || ''}
                                        onChange={(e) =>
                                          updateIssueEstimation(
                                            milestone.id,
                                            displayIssue.id,
                                            'estimatedMessages',
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        className="h-8"
                                      />
                                    </div>
                                  )}

                                  {displayIssue.issueType === 'MANUAL' && (
                                    <div>
                                      <Label className="text-xs">Fixed Price ($)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={issueEst.fixedPrice || ''}
                                        onChange={(e) =>
                                          updateIssueEstimation(
                                            milestone.id,
                                            displayIssue.id,
                                            'fixedPrice',
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="h-8"
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                            })}

                            <div className="border-t pt-2 flex justify-between items-center">
                              <span className="font-medium">Milestone Total:</span>
                              <span className="font-bold">{formatCurrency(estimation.calculatedPrice)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {estimations.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">Total Estimated Cost</h3>
                  <p className="text-sm text-blue-700">
                    From {estimations.filter(e => e.includeInQuote).length} included milestones
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(totalEstimatedCost)}
                  </div>
                  <div className="text-sm text-blue-700">
                    {formatCurrency(totalEstimatedCost * copToUsdRate, 'COP')}
                  </div>
                </div>
              </div>

              {/* Update Estimated Price Button */}
              {onUpdateEstimatedPrice && estimations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <Button
                    onClick={() => {
                      // Prepare milestones data for saving
                      const milestonesForApi = estimations
                        .filter(estimation => estimation.includeInQuote) // Only include milestones marked for inclusion
                        .map(estimation => {
                          // Filter issues: only include categorized issues (AUGMENT or MANUAL)
                          const validIssues = estimation.issues.filter(issue =>
                            issue.issueType === 'AUGMENT' || issue.issueType === 'MANUAL'
                          )

                          // Skip milestone if no valid issues
                          if (validIssues.length === 0) {
                            return null
                          }

                          // milestoneType is now calculated automatically in the backend

                          return {
                            githubMilestoneId: estimation.githubMilestoneId,
                            milestoneTitle: estimation.milestoneTitle,
                            // milestoneType is calculated automatically in the backend
                            // Use undefined instead of null for optional fields
                            estimatedMessages: undefined,
                            fixedPrice: undefined,
                            includeInQuote: estimation.includeInQuote,
                            issues: validIssues.map(issue => ({
                              githubIssueId: issue.githubIssueId,
                              issueNumber: issue.issueNumber,
                              issueTitle: issue.issueTitle,
                              issueType: issue.issueType,
                              estimatedMessages: issue.estimatedMessages,
                              fixedPrice: issue.fixedPrice,
                              calculatedPrice: issue.calculatedPrice,
                            }))
                          }
                        })
                        .filter(milestone => milestone !== null) // Remove null milestones

                      const milestonesData = {
                        githubRepository: selectedRepository,
                        aiMessageRate,
                        milestones: milestonesForApi,
                      }

                      onUpdateEstimatedPrice(totalEstimatedCost, milestonesData)
                    }}
                    variant="outline"
                    className="w-full bg-white hover:bg-blue-50"
                    disabled={totalEstimatedCost === 0}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    {totalEstimatedCost > 0
                      ? `Update Estimated Price (${formatCurrency(totalEstimatedCost)})`
                      : 'Update Estimated Price (Configure milestones first)'
                    }
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        {selectedRepository && (
          <div className="flex justify-end">
            <Button 
              onClick={saveConfiguration} 
              disabled={saving || !validateMilestones()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
              Save Configuration
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
