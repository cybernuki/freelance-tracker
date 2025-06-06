'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { Github, Search, RefreshCw, Calculator, Zap, Wrench } from 'lucide-react'

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
  milestoneType: 'AUGMENT' | 'MANUAL' | 'UNCATEGORIZED'
}

interface MilestoneEstimation {
  githubMilestoneId: number
  milestoneTitle: string
  milestoneType: 'AUGMENT' | 'MANUAL'
  estimatedMessages?: number
  fixedPrice?: number
  calculatedPrice: number
}

interface GitHubIntegrationProps {
  quoteId: string
  currentRepository?: string
  currentAiMessageRate?: number
  onUpdate: () => void
}

export function GitHubIntegration({ 
  quoteId, 
  currentRepository, 
  currentAiMessageRate,
  onUpdate 
}: GitHubIntegrationProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState(currentRepository || '')
  const [milestones, setMilestones] = useState<GitHubMilestone[]>([])
  const [estimations, setEstimations] = useState<MilestoneEstimation[]>([])
  const [aiMessageRate, setAiMessageRate] = useState(currentAiMessageRate || 0.1)
  
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [loadingMilestones, setLoadingMilestones] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing estimations when component mounts
  useEffect(() => {
    if (quoteId) {
      fetchExistingEstimations()
    }
  }, [quoteId])

  // Load milestones when repository changes
  useEffect(() => {
    if (selectedRepository) {
      fetchMilestones()
    } else {
      setMilestones([])
      setEstimations([])
    }
  }, [selectedRepository])

  const fetchExistingEstimations = async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/milestones`)
      if (response.ok) {
        const data = await response.json()
        setSelectedRepository(data.githubRepository || '')
        setAiMessageRate(data.aiMessageRate || 0.1)
        setEstimations(data.milestoneEstimations || [])
      }
    } catch (error) {
      console.error('Error fetching existing estimations:', error)
    }
  }

  const searchRepositories = async () => {
    if (!searchQuery.trim()) return

    setLoadingRepos(true)
    try {
      const response = await fetch(`/api/github/repositories?q=${encodeURIComponent(searchQuery)}&per_page=10`)
      if (response.ok) {
        const data = await response.json()
        setRepositories(data.repositories)
      } else {
        console.error('Failed to fetch repositories')
      }
    } catch (error) {
      console.error('Error searching repositories:', error)
    } finally {
      setLoadingRepos(false)
    }
  }

  const handleRepositorySelect = (repoFullName: string) => {
    setSelectedRepository(repoFullName)
    // Clear the search results and query after selection
    setRepositories([])
    setSearchQuery('')
  }

  const fetchMilestones = async () => {
    if (!selectedRepository) return

    setLoadingMilestones(true)
    try {
      const response = await fetch(`/api/github/milestones?repository=${encodeURIComponent(selectedRepository)}&state=open`)
      if (response.ok) {
        const data = await response.json()
        setMilestones(data.milestones)
      } else {
        console.error('Failed to fetch milestones')
      }
    } catch (error) {
      console.error('Error fetching milestones:', error)
    } finally {
      setLoadingMilestones(false)
    }
  }

  const updateMilestoneEstimation = (
    milestoneId: number,
    field: 'milestoneType' | 'estimatedMessages' | 'fixedPrice',
    value: any
  ) => {
    setEstimations(prev => {
      const existing = prev.find(e => e.githubMilestoneId === milestoneId)
      const milestone = milestones.find(m => m.id === milestoneId)
      
      if (!milestone) return prev

      let updatedEstimation: MilestoneEstimation

      if (existing) {
        updatedEstimation = { ...existing, [field]: value }
      } else {
        updatedEstimation = {
          githubMilestoneId: milestoneId,
          milestoneTitle: milestone.title,
          milestoneType: field === 'milestoneType' ? value : 'MANUAL',
          calculatedPrice: 0,
        }
        if (field !== 'milestoneType') {
          updatedEstimation[field] = value
        }
      }

      // Recalculate price
      if (updatedEstimation.milestoneType === 'AUGMENT' && updatedEstimation.estimatedMessages) {
        updatedEstimation.calculatedPrice = updatedEstimation.estimatedMessages * aiMessageRate
      } else if (updatedEstimation.milestoneType === 'MANUAL' && updatedEstimation.fixedPrice) {
        updatedEstimation.calculatedPrice = updatedEstimation.fixedPrice
      } else {
        updatedEstimation.calculatedPrice = 0
      }

      return prev.filter(e => e.githubMilestoneId !== milestoneId).concat(updatedEstimation)
    })
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubRepository: selectedRepository || null,
          aiMessageRate,
          milestones: estimations,
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

  const totalEstimatedCost = estimations.reduce((sum, est) => sum + est.calculatedPrice, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          GitHub Repository Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repository Selection */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Search GitHub Repositories</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="search"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchRepositories()}
              />
              <Button onClick={searchRepositories} disabled={loadingRepos}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Show selected repository */}
          {selectedRepository && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">Selected Repository</p>
                  <p className="text-sm text-green-600">{selectedRepository}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRepository('')
                    setMilestones([])
                    setEstimations([])
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {repositories.length > 0 && !selectedRepository && (
            <div className="space-y-2">
              <Label>Select Repository</Label>
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRepository === repo.full_name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRepositorySelect(repo.full_name)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{repo.full_name}</p>
                      {repo.description && (
                        <p className="text-sm text-gray-600">{repo.description}</p>
                      )}
                    </div>
                    {repo.private && <Badge variant="secondary">Private</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedRepository && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Selected:</strong> {selectedRepository}
              </p>
            </div>
          )}
        </div>

        {/* AI Message Rate Configuration */}
        {selectedRepository && (
          <div>
            <Label htmlFor="aiMessageRate">AI Message Rate ($ per message)</Label>
            <Input
              id="aiMessageRate"
              type="number"
              step="0.01"
              min="0"
              value={aiMessageRate}
              onChange={(e) => setAiMessageRate(parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        )}

        {/* Milestones */}
        {selectedRepository && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Milestones</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMilestones}
                disabled={loadingMilestones}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingMilestones ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loadingMilestones ? (
              <p className="text-gray-500">Loading milestones...</p>
            ) : milestones.length === 0 ? (
              <p className="text-gray-500">No open milestones found in this repository.</p>
            ) : (
              <div className="space-y-4">
                {milestones.map((milestone) => {
                  const estimation = estimations.find(e => e.githubMilestoneId === milestone.id)
                  const milestoneType = estimation?.milestoneType || milestone.milestoneType

                  return (
                    <div key={milestone.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{milestone.title}</h4>
                          <p className="text-sm text-gray-600">
                            {milestone.open_issues} open, {milestone.closed_issues} closed
                          </p>
                        </div>
                        <Badge variant={milestoneType === 'AUGMENT' ? 'default' : 'secondary'}>
                          {milestoneType === 'AUGMENT' && <Zap className="w-3 h-3 mr-1" />}
                          {milestoneType === 'MANUAL' && <Wrench className="w-3 h-3 mr-1" />}
                          {milestoneType}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Type Selection */}
                        {milestone.milestoneType === 'UNCATEGORIZED' && (
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={milestoneType}
                              onValueChange={(value) => 
                                updateMilestoneEstimation(milestone.id, 'milestoneType', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AUGMENT">AUGMENT</SelectItem>
                                <SelectItem value="MANUAL">MANUAL</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* AUGMENT Configuration */}
                        {milestoneType === 'AUGMENT' && (
                          <div>
                            <Label>Estimated Messages</Label>
                            <Input
                              type="number"
                              min="0"
                              value={estimation?.estimatedMessages || ''}
                              onChange={(e) => 
                                updateMilestoneEstimation(
                                  milestone.id, 
                                  'estimatedMessages', 
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        )}

                        {/* MANUAL Configuration */}
                        {milestoneType === 'MANUAL' && (
                          <div>
                            <Label>Fixed Price ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={estimation?.fixedPrice || ''}
                              onChange={(e) => 
                                updateMilestoneEstimation(
                                  milestone.id, 
                                  'fixedPrice', 
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        )}

                        {/* Calculated Price */}
                        <div>
                          <Label>Calculated Price</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Calculator className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {formatCurrency(estimation?.calculatedPrice || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Total and Save */}
        {estimations.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between text-lg font-medium">
              <span>Total Estimated Cost:</span>
              <span>{formatCurrency(totalEstimatedCost)}</span>
            </div>
            
            <Button onClick={saveConfiguration} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
