'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Issue {
  id: string
  title: string
  aiMessageEstimate: number
  project: {
    aiMessageRate: number
  }
}

interface AiMessageFormProps {
  projectId: string
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

export function AiMessageForm({ projectId, onSubmit, onCancel, isLoading }: AiMessageFormProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [formData, setFormData] = useState({
    issueId: '',
    amount: '',
    cost: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)

  useEffect(() => {
    fetchIssues()
  }, [projectId])

  useEffect(() => {
    // Auto-calculate cost when amount or issue changes
    if (formData.amount && selectedIssue) {
      const calculatedCost = parseFloat(formData.amount) * selectedIssue.project.aiMessageRate
      setFormData(prev => ({ ...prev, cost: calculatedCost.toFixed(2) }))
    }
  }, [formData.amount, selectedIssue])

  const fetchIssues = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/issues`)
      if (response.ok) {
        const data = await response.json()
        setIssues(data.issues || data)
      }
    } catch (error) {
      console.error('Error fetching issues:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleIssueChange = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId)
    setSelectedIssue(issue || null)
    handleInputChange('issueId', issueId)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.issueId) {
      newErrors.issueId = 'Issue is required'
    }

    if (!formData.amount || parseInt(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = {
      issueId: formData.issueId,
      amount: parseInt(formData.amount),
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      date: formData.date,
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="issueId">Issue *</Label>
            <Select value={formData.issueId} onValueChange={handleIssueChange}>
              <SelectTrigger className={errors.issueId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select an issue" />
              </SelectTrigger>
              <SelectContent>
                {issues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.title} (Est: {issue.aiMessageEstimate} messages)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.issueId && (
              <p className="text-sm text-red-600 mt-1">{errors.issueId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Number of Messages *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="25"
              className={errors.amount ? 'border-red-500' : ''}
              required
            />
            {errors.amount && (
              <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => handleInputChange('cost', e.target.value)}
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-gray-500 mt-1">
              {selectedIssue && `Rate: $${selectedIssue.project.aiMessageRate} per message`}
            </p>
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={errors.date ? 'border-red-500' : ''}
              required
            />
            {errors.date && (
              <p className="text-sm text-red-600 mt-1">{errors.date}</p>
            )}
          </div>
        </div>
      </div>

      {selectedIssue && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">Issue Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">Estimated Messages</p>
                <p className="text-blue-900">{selectedIssue.aiMessageEstimate}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Rate per Message</p>
                <p className="text-blue-900">${selectedIssue.project.aiMessageRate}</p>
              </div>
            </div>
            {formData.amount && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-blue-700 font-medium">Usage After This Entry</p>
                <p className="text-blue-900">
                  {parseInt(formData.amount)} / {selectedIssue.aiMessageEstimate} messages
                  ({((parseInt(formData.amount) / selectedIssue.aiMessageEstimate) * 100).toFixed(1)}%)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">AI Usage Tracking Tips:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Log AI messages regularly to track usage against estimates</li>
          <li>• Include all AI interactions: code generation, debugging, documentation</li>
          <li>• Cost is auto-calculated based on project rate if not specified</li>
          <li>• Monitor usage to stay within project budgets</li>
        </ul>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Log AI Usage'}
        </Button>
      </div>
    </form>
  )
}
