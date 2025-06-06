'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Calculator } from 'lucide-react'
import { ProfitCalculator } from '@/components/quotes/profit-calculator'
import { GitHubIntegration } from '@/components/quotes/github-integration'
import { RequirementsManager } from '@/components/quotes/requirements-manager'

interface Client {
  id: string
  name: string
  email?: string
}

interface QuoteFormProps {
  quote?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

export function QuoteForm({ quote, onSubmit, onCancel, isLoading }: QuoteFormProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [requirements, setRequirements] = useState<string[]>(quote?.requirements || [])
  const [newRequirement, setNewRequirement] = useState('')
  const [formData, setFormData] = useState({
    name: quote?.name || '',
    description: quote?.description || '',
    clientId: quote?.clientId || '',
    startDateEstimated: quote?.startDateEstimated ? new Date(quote.startDateEstimated).toISOString().split('T')[0] : '',
    endDateEstimated: quote?.endDateEstimated ? new Date(quote.endDateEstimated).toISOString().split('T')[0] : '',
    source: quote?.source || '',
    sourceLink: quote?.sourceLink || '',
    priceEstimated: quote?.priceEstimated || '',
    minimumPrice: quote?.minimumPrice || '',
    aiMessagesUsedForRequirements: quote?.aiMessagesUsedForRequirements || 0,
    profitMarginPercentage: quote?.profitMarginPercentage || 20,
    recommendedPrice: quote?.recommendedPrice || 0,
  })

  // State for profit calculation
  const [profitCalculation, setProfitCalculation] = useState({
    profitMarginPercentage: 20,
    recommendedPrice: 0,
    totalCost: 0,
    profitAmount: 0
  })

  // State for milestones validation
  const [milestonesValid, setMilestonesValid] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addRequirement = () => {
    if (newRequirement.trim() && !requirements.includes(newRequirement.trim())) {
      setRequirements([...requirements, newRequirement.trim()])
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  const handleProfitCalculation = (calculation: any) => {
    setProfitCalculation(calculation)
    // Update form data with calculated values
    setFormData(prev => ({
      ...prev,
      profitMarginPercentage: calculation.profitMarginPercentage,
      recommendedPrice: calculation.recommendedPrice
    }))
  }

  const handleSaveEstimatedTotal = async (total: number) => {
    try {
      if (quote?.id) {
        const response = await fetch(`/api/quotes/${quote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ savedEstimatedTotal: total }),
        })
        if (response.ok) {
          setFormData(prev => ({ ...prev, savedEstimatedTotal: total }))
        }
      }
    } catch (error) {
      console.error('Error saving estimated total:', error)
    }
  }

  const handleSaveEstimatedPrice = async (price: number) => {
    try {
      if (quote?.id) {
        const response = await fetch(`/api/quotes/${quote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ savedEstimatedPrice: price }),
        })
        if (response.ok) {
          setFormData(prev => ({ ...prev, savedEstimatedPrice: price }))
        }
      }
    } catch (error) {
      console.error('Error saving estimated price:', error)
    }
  }

  // Check if quote can be marked as QUOTED
  const canMarkAsQuoted = () => {
    const hasBasicInfo = formData.name && formData.clientId
    const hasValidPricing = formData.priceEstimated && formData.minimumPrice &&
                           parseFloat(formData.priceEstimated.toString()) > 0 &&
                           parseFloat(formData.minimumPrice.toString()) > 0
    const hasRequirements = requirements.length > 0
    const hasTimeline = formData.startDateEstimated && formData.endDateEstimated
    const hasValidMilestones = checkMilestonesValid()

    return hasBasicInfo && hasValidPricing && hasRequirements && hasTimeline && hasValidMilestones
  }

  // Check if all milestones are properly categorized and estimated
  const checkMilestonesValid = () => {
    return milestonesValid
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      priceEstimated: parseFloat(formData.priceEstimated.toString()) || 0,
      minimumPrice: parseFloat(formData.minimumPrice.toString()) || 0,
      aiMessagesUsedForRequirements: parseInt(formData.aiMessagesUsedForRequirements.toString()) || 0,
      profitMarginPercentage: profitCalculation.profitMarginPercentage,
      recommendedPrice: profitCalculation.recommendedPrice,
      requirements,
      // Auto-transition from DRAFT to QUOTED if conditions are met
      status: quote?.status === 'DRAFT' && canMarkAsQuoted() ? 'QUOTED' : quote?.status
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Quote Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., E-commerce Website Development"
              required
            />
          </div>

          <div>
            <Label htmlFor="clientId">Client *</Label>
            <Select value={formData.clientId} onValueChange={(value) => handleInputChange('clientId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.email && `(${client.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="source">Source</Label>
            <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Upwork">Upwork</SelectItem>
                <SelectItem value="Fiverr">Fiverr</SelectItem>
                <SelectItem value="Freelancer">Freelancer</SelectItem>
                <SelectItem value="Workana">Workana</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Direct Contact">Direct Contact</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sourceLink">Source Link</Label>
            <Input
              id="sourceLink"
              type="url"
              value={formData.sourceLink}
              onChange={(e) => handleInputChange('sourceLink', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="priceEstimated">Estimated Price ($) *</Label>
            <Input
              id="priceEstimated"
              type="number"
              min="0"
              step="0.01"
              value={formData.priceEstimated}
              onChange={(e) => handleInputChange('priceEstimated', e.target.value)}
              placeholder="15000"
              required
            />
          </div>

          <div>
            <Label htmlFor="minimumPrice">Minimum Price ($) *</Label>
            <Input
              id="minimumPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.minimumPrice}
              onChange={(e) => handleInputChange('minimumPrice', e.target.value)}
              placeholder="12000"
              required
            />
          </div>

          <div>
            <Label htmlFor="aiMessagesUsedForRequirements">AI Messages Used for Requirements Analysis</Label>
            <Input
              id="aiMessagesUsedForRequirements"
              type="number"
              min="0"
              value={formData.aiMessagesUsedForRequirements}
              onChange={(e) => handleInputChange('aiMessagesUsedForRequirements', e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of AI messages used to analyze and transform requirements
            </p>
          </div>

          <div>
            <Label htmlFor="startDateEstimated">Estimated Start Date</Label>
            <Input
              id="startDateEstimated"
              type="date"
              value={formData.startDateEstimated}
              onChange={(e) => handleInputChange('startDateEstimated', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endDateEstimated">Estimated End Date</Label>
            <Input
              id="endDateEstimated"
              type="date"
              value={formData.endDateEstimated}
              onChange={(e) => handleInputChange('endDateEstimated', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Detailed description of the project requirements..."
          rows={4}
        />
      </div>

      {/* Requirements Management */}
      <RequirementsManager
        requirements={requirements}
        onRequirementsChange={setRequirements}
        quoteId={quote?.id}
      />

      {/* GitHub Integration */}
      {quote?.id && (
        <GitHubIntegration
          quoteId={quote.id}
          currentRepository={quote.githubRepository}
          currentAiMessageRate={quote.aiMessageRate}
          onUpdate={() => {}} // No need to refresh in edit mode
          onMilestonesValidationChange={setMilestonesValid}
        />
      )}

      {/* Profit Calculator */}
      {formData.minimumPrice && (
        <ProfitCalculator
          minimumPrice={parseFloat(formData.minimumPrice.toString()) || 0}
          aiMessagesUsed={parseInt(formData.aiMessagesUsedForRequirements.toString()) || 0}
          aiMessageRate={0.1} // Default rate, can be made configurable
          onProfitCalculation={handleProfitCalculation}
          onSaveEstimatedTotal={quote?.id ? handleSaveEstimatedTotal : undefined}
          onSaveEstimatedPrice={quote?.id ? handleSaveEstimatedPrice : undefined}
        />
      )}

      {/* Status Information for DRAFT quotes */}
      {quote?.status === 'DRAFT' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Calculator className="w-5 h-5" />
              Quote Status: DRAFT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-yellow-700">
                This quote is in <strong>DRAFT</strong> status. Complete the following to mark it as <strong>QUOTED</strong>:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${formData.name && formData.clientId ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={formData.name && formData.clientId ? 'text-green-700' : 'text-gray-600'}>
                    Basic information (name and client)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${formData.priceEstimated && formData.minimumPrice &&
                    parseFloat(formData.priceEstimated.toString()) > 0 &&
                    parseFloat(formData.minimumPrice.toString()) > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={formData.priceEstimated && formData.minimumPrice &&
                    parseFloat(formData.priceEstimated.toString()) > 0 &&
                    parseFloat(formData.minimumPrice.toString()) > 0 ? 'text-green-700' : 'text-gray-600'}>
                    Valid pricing information (estimated and minimum price)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${requirements.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={requirements.length > 0 ? 'text-green-700' : 'text-gray-600'}>
                    At least one requirement
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${formData.startDateEstimated && formData.endDateEstimated ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={formData.startDateEstimated && formData.endDateEstimated ? 'text-green-700' : 'text-gray-600'}>
                    Timeline (estimated start and end dates)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${milestonesValid ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={milestonesValid ? 'text-green-700' : 'text-gray-600'}>
                    All milestones properly categorized and estimated
                  </span>
                </div>
              </div>
              {canMarkAsQuoted() && (
                <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Ready to mark as QUOTED! Save the form to automatically transition the status.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : quote ? 'Update Quote' : 'Create Quote'}
        </Button>
      </div>
    </form>
  )
}
