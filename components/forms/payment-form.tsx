'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaymentFormProps {
  payment?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

export function PaymentForm({ payment, onSubmit, onCancel, isLoading }: PaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: payment?.amount || '',
    method: payment?.method || '',
    description: payment?.description || '',
    date: payment?.date ? new Date(payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || parseFloat(formData.amount.toString()) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (!formData.method) {
      newErrors.method = 'Payment method is required'
    }

    if (!formData.date) {
      newErrors.date = 'Payment date is required'
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
      amount: parseFloat(formData.amount.toString()),
      method: formData.method,
      description: formData.description.trim() || undefined,
      date: formData.date,
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Payment Amount ($) *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="5000.00"
              className={errors.amount ? 'border-red-500' : ''}
              required
            />
            {errors.amount && (
              <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="method">Payment Method *</Label>
            <Select value={formData.method} onValueChange={(value) => handleInputChange('method', value)}>
              <SelectTrigger className={errors.method ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="PAYPAL">PayPal</SelectItem>
                <SelectItem value="STRIPE">Stripe</SelectItem>
                <SelectItem value="WISE">Wise</SelectItem>
                <SelectItem value="CRYPTOCURRENCY">Cryptocurrency</SelectItem>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.method && (
              <p className="text-sm text-red-600 mt-1">{errors.method}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Payment Date *</Label>
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

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="e.g., Initial payment - 30%, Milestone payment, Final payment..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Payment Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Record payments as soon as they are received</li>
          <li>• Include milestone or invoice references in the description</li>
          <li>• Double-check the amount to ensure accuracy</li>
          <li>• Use the actual date the payment was received</li>
        </ul>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : payment ? 'Update Payment' : 'Record Payment'}
        </Button>
      </div>
    </form>
  )
}
