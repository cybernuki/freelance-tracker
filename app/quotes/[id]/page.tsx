'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QuoteForm } from '@/components/forms/quote-form'
import { CreateProjectForm } from '@/components/forms/create-project-form'
import { GitHubIntegration } from '@/components/quotes/github-integration'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle, FileText, User, Calendar, DollarSign, ExternalLink, FolderPlus, Github } from 'lucide-react'
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
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchQuote()
    }
  }, [params.id])

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

  const handleEditQuote = async (data: any) => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to update quote')

      setShowEditDialog(false)
      fetchQuote() // Refresh the quote
    } catch (error) {
      console.error('Error updating quote:', error)
      alert('Failed to update quote. Please try again.')
    } finally {
      setIsSubmitting(false)
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
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDeleteQuote}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Actions */}
      {quote.status === 'DRAFT' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-yellow-900">Draft Quote</h3>
                <p className="text-sm text-yellow-700">
                  This quote is incomplete. Add pricing information and requirements to mark it as quoted.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEditDialog(true)}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <Edit className="w-4 h-4 mr-2" />
                Complete Quote
              </Button>
            </div>
          </CardContent>
        </Card>
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
          {quote.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {quote.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* GitHub Integration */}
          <GitHubIntegration
            quoteId={quote.id}
            currentRepository={quote.githubRepository}
            currentAiMessageRate={quote.aiMessageRate}
            onUpdate={fetchQuote}
            onMilestonesValidationChange={(isValid) => {
              // This could be used to show validation status in the quote detail page
              console.log('Milestones validation status:', isValid)
            }}
          />
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
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {quote.aiMessagesUsedForRequirements && quote.aiMessagesUsedForRequirements > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm text-gray-600">AI Messages for Requirements</p>
                  <p className="text-lg font-medium">{quote.aiMessagesUsedForRequirements} messages</p>
                  <p className="text-xs text-gray-500">Cost: {formatCurrency((quote.aiMessagesUsedForRequirements * (quote.aiMessageRate || 0.1)))}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">{formatDate(quote.createdAt)}</p>
              </div>
              {quote.startDateEstimated && (
                <div>
                  <p className="text-sm text-gray-600">Estimated Start</p>
                  <p className="font-medium">{formatDate(quote.startDateEstimated)}</p>
                </div>
              )}
              {quote.endDateEstimated && (
                <div>
                  <p className="text-sm text-gray-600">Estimated End</p>
                  <p className="font-medium">{formatDate(quote.endDateEstimated)}</p>
                </div>
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
          </DialogHeader>
          <QuoteForm
            quote={quote}
            onSubmit={handleEditQuote}
            onCancel={() => setShowEditDialog(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

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
