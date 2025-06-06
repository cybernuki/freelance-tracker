'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateProjectForm } from '@/components/forms/create-project-form'
import { GitHubIntegration } from '@/components/quotes/github-integration'
import { ProfitCalculator } from '@/components/quotes/profit-calculator'
import { QuoteProgressBar, calculateQuoteProgress } from '@/components/quotes/quote-progress-bar'
import { RequirementsManager } from '@/components/quotes/requirements-manager'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle, FileText, User, Calendar, DollarSign, ExternalLink, FolderPlus, Github, Save, X, Plus, ChevronDown, ChevronUp, Calculator } from 'lucide-react'
import Link from 'next/link'

interface Quote {
  id: string
  reference: number
  name: string
  description?: string
  priceEstimated: number
  minimumPrice: number
  status: 'DRAFT' | 'QUOTED' | 'ACCEPTED' | 'REJECTED'
  source?: string
  sourceLink?: string
  startDateEstimated?: string
  endDateEstimated?: string
  requirements: string[]
  githubRepository?: string
  aiMessageRate?: number
  aiMessagesUsedForRequirements?: number
  profitMarginPercentage?: number
  recommendedPrice?: number
  createdAt: string
  client: {
    id: string
    name: string
    email?: string
    phone?: string
    contact?: string
  }
  project?: {
    id: string
    name: string
    status: string
  }
  milestoneEstimations?: {
    id: string
    githubMilestoneId: number
    milestoneTitle: string
    milestoneType: string
    estimatedMessages?: number
    fixedPrice?: number
    calculatedPrice: number
    includeInQuote: boolean
    issueEstimations: {
      id: string
      githubIssueId: number
      issueNumber: number
      issueTitle: string
      issueType: string
      estimatedMessages?: number
      fixedPrice?: number
      calculatedPrice: number
    }[]
  }[]
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editingPricing, setEditingPricing] = useState(false)
  const [editingRequirements, setEditingRequirements] = useState(false)
  const [editingTimeline, setEditingTimeline] = useState(false)
  const [showProfitCalculator, setShowProfitCalculator] = useState(false)
  const [editingAiMessages, setEditingAiMessages] = useState(false)
  const [aiMessagesInput, setAiMessagesInput] = useState('')
  const [tempPricing, setTempPricing] = useState({
    priceEstimated: quote?.priceEstimated || 0,
    minimumPrice: quote?.minimumPrice || 0
  })
  const [tempRequirements, setTempRequirements] = useState<string[]>(quote?.requirements || [])
  const [tempTimeline, setTempTimeline] = useState({
    startDateEstimated: quote?.startDateEstimated || '',
    endDateEstimated: quote?.endDateEstimated || ''
  })
  const [profitCalculation, setProfitCalculation] = useState({
    profitMarginPercentage: 20,
    recommendedPrice: 0,
    totalCost: 0,
    profitAmount: 0
  })

  useEffect(() => {
    if (params.id) {
      fetchQuote()
    }
  }, [params.id])

  // Update temp state when quote changes
  useEffect(() => {
    if (quote) {
      setTempPricing({
        priceEstimated: quote.priceEstimated,
        minimumPrice: quote.minimumPrice
      })
      setTempRequirements(quote.requirements)
      setTempTimeline({
        startDateEstimated: quote.startDateEstimated || '',
        endDateEstimated: quote.endDateEstimated || ''
      })
    }
  }, [quote])

  const fetchQuote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/quotes/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/quotes')
          return
        }
        throw new Error('Failed to fetch quote')
      }
      
      const data = await response.json()
      setQuote(data)
    } catch (error) {
      console.error('Error fetching quote:', error)
    } finally {
      setLoading(false)
    }
  }



  const handleCreateProject = async (data: any) => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      const project = await response.json()
      setShowCreateProjectDialog(false)

      // Navigate to the new project
      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert(error instanceof Error ? error.message : 'Failed to create project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteQuote = async () => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete quote')

      router.push('/quotes')
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Failed to delete quote. Please try again.')
    }
  }

  const handleStatusChange = async (newStatus: 'ACCEPTED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update quote status')

      fetchQuote() // Refresh the quote
    } catch (error) {
      console.error('Error updating quote status:', error)
      alert('Failed to update quote status. Please try again.')
    }
  }

  const handleTransitionToQuoted = async () => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'QUOTED' }),
      })

      if (!response.ok) throw new Error('Failed to transition quote to QUOTED status')

      fetchQuote() // Refresh the quote
    } catch (error) {
      console.error('Error transitioning quote to QUOTED:', error)
      alert('Failed to transition quote to QUOTED status. Please try again.')
    }
  }

  const handleSavePricing = async () => {
    try {
      // Note: When manually editing minimum price, we assume it already includes AI messages cost
      // The user is responsible for ensuring the price is correct
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceEstimated: tempPricing.priceEstimated,
          minimumPrice: tempPricing.minimumPrice,
        }),
      })

      if (!response.ok) throw new Error('Failed to update pricing')

      setEditingPricing(false)
      fetchQuote() // Refresh the quote
    } catch (error) {
      console.error('Error updating pricing:', error)
      alert('Failed to update pricing. Please try again.')
    }
  }

  const handleSaveRequirements = async () => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: tempRequirements,
        }),
      })

      if (!response.ok) throw new Error('Failed to update requirements')

      setEditingRequirements(false)
      fetchQuote() // Refresh the quote
    } catch (error) {
      console.error('Error updating requirements:', error)
      alert('Failed to update requirements. Please try again.')
    }
  }

  const handleCancelPricing = () => {
    setTempPricing({
      priceEstimated: quote?.priceEstimated || 0,
      minimumPrice: quote?.minimumPrice || 0
    })
    setEditingPricing(false)
  }

  const handleCancelRequirements = () => {
    setTempRequirements(quote?.requirements || [])
    setEditingRequirements(false)
  }

  const handleSaveTimeline = async () => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDateEstimated: tempTimeline.startDateEstimated,
          endDateEstimated: tempTimeline.endDateEstimated,
        }),
      })

      if (!response.ok) throw new Error('Failed to update timeline')

      setEditingTimeline(false)
      fetchQuote() // Refresh the quote
    } catch (error) {
      console.error('Error updating timeline:', error)
      alert('Failed to update timeline. Please try again.')
    }
  }

  const handleCancelTimeline = () => {
    setTempTimeline({
      startDateEstimated: quote?.startDateEstimated || '',
      endDateEstimated: quote?.endDateEstimated || ''
    })
    setEditingTimeline(false)
  }

  const handleUpdateEstimatedPrice = async (price: number, milestonesData?: any) => {
    try {
      // First save milestones if provided
      if (milestonesData) {
        const milestonesResponse = await fetch(`/api/quotes/${params.id}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(milestonesData),
        })

        if (!milestonesResponse.ok) {
          throw new Error('Failed to save milestones')
        }
      }

      // Calculate minimum price including AI messages for requirements
      const aiMessagesUsed = quote?.aiMessagesUsedForRequirements || 0
      const aiMessageRate = quote?.aiMessageRate || 0.08
      const aiMessagesCost = aiMessagesUsed * aiMessageRate
      const totalMinimumPrice = price + aiMessagesCost

      // Then update the minimum price
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minimumPrice: totalMinimumPrice,
        }),
      })

      if (!response.ok) throw new Error('Failed to update minimum price')

      fetchQuote() // Refresh the quote
    } catch (error) {
      console.error('Error updating minimum price:', error)
      alert('Failed to update minimum price. Please try again.')
    }
  }

  const handleProfitCalculation = (calculation: any) => {
    setProfitCalculation(calculation)
  }



  const handleSaveEstimatedPrice = async (price: number) => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          savedEstimatedPrice: price,
          priceEstimated: price // Also update the main estimated price
        }),
      })
      if (response.ok) {
        fetchQuote() // Refresh the quote
      }
    } catch (error) {
      console.error('Error saving estimated price:', error)
    }
  }

  const handleSaveAiMessages = async () => {
    try {
      const aiMessagesUsed = parseInt(aiMessagesInput) || 0
      const aiMessageRate = quote?.aiMessageRate || 0.08

      // Calculate new minimum price including AI messages cost
      const baseMilestonePrice = quote?.minimumPrice || 0
      const currentAiMessagesCost = (quote?.aiMessagesUsedForRequirements || 0) * aiMessageRate
      const basePrice = Math.max(0, baseMilestonePrice - currentAiMessagesCost)
      const newAiMessagesCost = aiMessagesUsed * aiMessageRate
      const newMinimumPrice = basePrice + newAiMessagesCost

      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiMessagesUsedForRequirements: aiMessagesUsed,
          minimumPrice: newMinimumPrice
        }),
      })
      if (response.ok) {
        setEditingAiMessages(false)
        fetchQuote() // Refresh the quote
      }
    } catch (error) {
      console.error('Error saving AI messages:', error)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'outline'
      case 'QUOTED': return 'secondary'
      case 'ACCEPTED': return 'success'
      case 'REJECTED': return 'destructive'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Quote not found</p>
        <Button asChild className="mt-4">
          <Link href="/quotes">Back to Quotes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/quotes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotes
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{quote.name}</h1>
            <p className="text-gray-600">Quote #{quote.reference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(quote.status)}>
            {quote.status}
          </Badge>

          <Button variant="outline" onClick={handleDeleteQuote}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Quote Progress Bar */}
      {quote.status === 'DRAFT' && (
        <QuoteProgressBar
          status={quote.status}
          progressItems={calculateQuoteProgress(quote)}
          onTransitionToQuoted={handleTransitionToQuoted}
        />
      )}

      {quote.status === 'QUOTED' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Quote Status</h3>
                <p className="text-sm text-blue-700">This quote is pending client response</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusChange('REJECTED')}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as Rejected
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleStatusChange('ACCEPTED')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Accepted
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Link */}
      {quote.project && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">Associated Project</h3>
                <p className="text-sm text-green-700">{quote.project.name}</p>
              </div>
              <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                <Link href={`/projects/${quote.project.id}`}>
                  View Project
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Project */}
      {quote.status === 'ACCEPTED' && !quote.project && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">Ready to Start Project</h3>
                <p className="text-sm text-green-700">This quote has been accepted. Create a project to begin work.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowCreateProjectDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {quote.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Requirements
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingRequirements(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingRequirements ? (
                <RequirementsManager
                  requirements={tempRequirements}
                  onRequirementsChange={setTempRequirements}
                  quoteId={quote.id}
                  readOnly={false}
                />
              ) : (
                <>
                  {quote.requirements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">No requirements added yet</p>
                      <p className="text-xs mt-1">Click the + button to add requirements</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quote.requirements.map((requirement, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              REQ-{(index + 1).toString().padStart(3, '0')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {requirement}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {editingRequirements && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={handleSaveRequirements}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Requirements
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelRequirements}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Tasks & Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                Project Tasks & Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Messages Used for Requirements Analysis */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">AI Messages Used for Requirements Analysis</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingAiMessages ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={aiMessagesInput}
                          onChange={(e) => setAiMessagesInput(e.target.value)}
                          className="w-20 h-8 no-spinner"
                        />
                        <Button size="sm" onClick={handleSaveAiMessages}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAiMessages(false)
                            setAiMessagesInput(String(quote.aiMessagesUsedForRequirements || 0))
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold text-blue-600">
                            {quote.aiMessagesUsedForRequirements || 0} messages
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingAiMessages(true)
                              setAiMessagesInput(String(quote.aiMessagesUsedForRequirements || 0))
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                        {quote.aiMessageRate && quote.aiMessagesUsedForRequirements && (
                          <div className="text-sm text-blue-700">
                            Cost: {formatCurrency((quote.aiMessagesUsedForRequirements * quote.aiMessageRate))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-blue-700">
                  Number of AI messages used to analyze and transform project requirements into actionable tasks.
                </p>
              </div>

              {/* GitHub Integration Component */}
              <GitHubIntegration
                quoteId={quote.id}
                currentRepository={quote.githubRepository}
                currentAiMessageRate={quote.aiMessageRate}
                existingMilestones={quote.milestoneEstimations}
                onUpdate={fetchQuote}
                onMilestonesValidationChange={(isValid: boolean) => {
                  // This could be used to show validation status in the quote detail page
                  console.log('Milestones validation status:', isValid)
                }}
                onUpdateEstimatedPrice={handleUpdateEstimatedPrice}
              />
            </CardContent>
          </Card>


        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{quote.client.name}</p>
                {quote.client.contact && (
                  <p className="text-sm text-gray-600">{quote.client.contact}</p>
                )}
              </div>
              {quote.client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Email:</span>
                  <a href={`mailto:${quote.client.email}`} className="text-blue-600 hover:underline">
                    {quote.client.email}
                  </a>
                </div>
              )}
              {quote.client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Phone:</span>
                  <a href={`tel:${quote.client.phone}`} className="text-blue-600 hover:underline">
                    {quote.client.phone}
                  </a>
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/clients/${quote.client.id}`}>
                  View Client Details
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing
                </div>
                <div className="flex items-center gap-2">
                  {quote.minimumPrice && quote.minimumPrice > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProfitCalculator(!showProfitCalculator)}
                    >
                      <Calculator className="w-4 h-4 mr-1" />
                      {showProfitCalculator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  )}
                  {!editingPricing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPricing(true)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingPricing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Estimated Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tempPricing.priceEstimated}
                      onChange={(e) => setTempPricing(prev => ({
                        ...prev,
                        priceEstimated: parseFloat(e.target.value) || 0
                      }))}
                      className="no-spinner"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Minimum Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tempPricing.minimumPrice}
                      onChange={(e) => setTempPricing(prev => ({
                        ...prev,
                        minimumPrice: parseFloat(e.target.value) || 0
                      }))}
                      className="no-spinner"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSavePricing}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelPricing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Price</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(quote.priceEstimated)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Minimum Price</p>
                    <p className="text-lg font-medium">{formatCurrency(quote.minimumPrice)}</p>
                  </div>
                  {quote.recommendedPrice && quote.recommendedPrice > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-gray-600">Recommended Price (with {quote.profitMarginPercentage}% profit)</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(quote.recommendedPrice)}</p>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-600">AI Messages for Requirements</p>
                    <p className="text-lg font-medium">{quote.aiMessagesUsedForRequirements || 0} messages</p>
                    <p className="text-xs text-gray-500">Cost: {formatCurrency(((quote.aiMessagesUsedForRequirements || 0) * (quote.aiMessageRate || 0.08)))}</p>
                  </div>
                </>
              )}

              {/* Profit Calculator Dropdown */}
              {showProfitCalculator && quote.minimumPrice && quote.minimumPrice > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <ProfitCalculator
                    minimumPrice={quote.minimumPrice}
                    aiMessagesUsed={quote.aiMessagesUsedForRequirements || 0}
                    aiMessageRate={quote.aiMessageRate || 0.08}
                    onProfitCalculation={handleProfitCalculation}
                    onSaveEstimatedPrice={handleSaveEstimatedPrice}
                  />
                </div>
              )}
            </CardContent>
          </Card>


          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Timeline
                </div>
                {!editingTimeline && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTimeline(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">{formatDate(quote.createdAt)}</p>
              </div>

              {editingTimeline ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Estimated Start Date</label>
                    <Input
                      type="date"
                      value={tempTimeline.startDateEstimated}
                      onChange={(e) => setTempTimeline(prev => ({
                        ...prev,
                        startDateEstimated: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Estimated End Date</label>
                    <Input
                      type="date"
                      value={tempTimeline.endDateEstimated}
                      onChange={(e) => setTempTimeline(prev => ({
                        ...prev,
                        endDateEstimated: e.target.value
                      }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTimeline}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelTimeline}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {quote.startDateEstimated ? (
                    <div>
                      <p className="text-sm text-gray-600">Estimated Start</p>
                      <p className="font-medium">{formatDate(quote.startDateEstimated)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">Estimated Start</p>
                      <p className="text-gray-400 italic">Not set</p>
                    </div>
                  )}
                  {quote.endDateEstimated ? (
                    <div>
                      <p className="text-sm text-gray-600">Estimated End</p>
                      <p className="font-medium">{formatDate(quote.endDateEstimated)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">Estimated End</p>
                      <p className="text-gray-400 italic">Not set</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Source */}
          {quote.source && (
            <Card>
              <CardHeader>
                <CardTitle>Source</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{quote.source}</p>
                {quote.sourceLink && (
                  <a 
                    href={quote.sourceLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-2"
                  >
                    View Source <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>



      {/* Create Project Dialog */}
      <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Project from Quote</DialogTitle>
          </DialogHeader>
          <CreateProjectForm
            quote={quote}
            onSubmit={handleCreateProject}
            onCancel={() => setShowCreateProjectDialog(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
