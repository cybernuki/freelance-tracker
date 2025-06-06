'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Calendar, DollarSign, Zap } from 'lucide-react'

interface Quote {
  id: string
  name: string
  description?: string
  priceEstimated: number
  minimumPrice: number
  startDateEstimated?: string
  endDateEstimated?: string
  client: {
    name: string
  }
}

interface CreateProjectFormProps {
  quote: Quote
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

export function CreateProjectForm({ quote, onSubmit, onCancel, isLoading }: CreateProjectFormProps) {
  const [formData, setFormData] = useState({
    name: quote.name,
    description: quote.description || '',
    startDate: quote.startDateEstimated ? quote.startDateEstimated.split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: quote.endDateEstimated ? quote.endDateEstimated.split('T')[0] : '',
    agreedPrice: quote.priceEstimated,
    minimumCost: quote.minimumPrice,
    aiMessageRate: 0.1,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      quoteId: quote.id,
      ...formData,
    })
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quote Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Creating Project from Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Client:</span>
              <span className="ml-2">{quote.client.name}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Original Quote:</span>
              <span className="ml-2">{formatCurrency(quote.priceEstimated)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              placeholder="Project description..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="startDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="endDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              End Date (Optional)
            </Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Project Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="agreedPrice">Agreed Price</Label>
            <Input
              id="agreedPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.agreedPrice}
              onChange={(e) => handleChange('agreedPrice', parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div>
            <Label htmlFor="minimumCost">Minimum Cost</Label>
            <Input
              id="minimumCost"
              type="number"
              step="0.01"
              min="0"
              value={formData.minimumCost}
              onChange={(e) => handleChange('minimumCost', parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div>
            <Label htmlFor="aiMessageRate" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI Message Rate ($)
            </Label>
            <Input
              id="aiMessageRate"
              type="number"
              step="0.01"
              min="0"
              value={formData.aiMessageRate}
              onChange={(e) => handleChange('aiMessageRate', parseFloat(e.target.value) || 0)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Cost per AI message used</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? 'Creating Project...' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}
