'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Client {
  id: string
  name: string
  email?: string
}

interface CreateQuoteFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

export function CreateQuoteForm({ onSubmit, onCancel, isLoading }: CreateQuoteFormProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    source: '',
    sourceLink: '',
  })

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Create quote in DRAFT status with minimal required fields
    const submitData = {
      ...formData,
      // Set default values for required fields that will be filled later
      priceEstimated: 0,
      minimumPrice: 0,
      requirements: [],
      status: 'DRAFT'
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Brief description of the project..."
            rows={4}
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Draft Quote</p>
            <p className="text-blue-700">
              This quote will be created in <strong>DRAFT</strong> status. You'll need to add pricing information, 
              requirements, and at least one estimated milestone before it can be marked as <strong>QUOTED</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name || !formData.clientId}>
          {isLoading ? 'Creating...' : 'Create Draft Quote'}
        </Button>
      </div>
    </form>
  )
}
