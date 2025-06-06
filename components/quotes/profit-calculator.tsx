'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, DollarSign, Save } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ProfitCalculatorProps {
  minimumPrice: number
  aiMessagesUsed?: number
  aiMessageRate?: number
  onProfitCalculation: (data: {
    profitMarginPercentage: number
    recommendedPrice: number
    totalCost: number
    profitAmount: number
  }) => void
  onSaveEstimatedPrice?: (price: number) => void
}

export function ProfitCalculator({
  minimumPrice,
  aiMessagesUsed = 0,
  aiMessageRate = 0.08,
  onProfitCalculation,
  onSaveEstimatedPrice
}: ProfitCalculatorProps) {
  const [profitMarginPercentage, setProfitMarginPercentage] = useState(20)
  const [customMargin, setCustomMargin] = useState('')
  const [isCustomMargin, setIsCustomMargin] = useState(false)

  // Calculate costs - minimumPrice now already includes AI messages cost
  const aiMessagesCost = aiMessagesUsed * aiMessageRate
  const totalCost = minimumPrice // minimumPrice already includes AI messages cost

  // Calculate profit and recommended price
  const currentMargin = isCustomMargin ? parseFloat(customMargin) || 0 : profitMarginPercentage
  const profitAmount = totalCost * (currentMargin / 100)
  const recommendedPrice = totalCost + profitAmount

  // Predefined profit margin options
  const profitOptions = [
    { value: 15, label: '15% - Conservative', color: 'bg-blue-100 text-blue-800' },
    { value: 20, label: '20% - Standard', color: 'bg-green-100 text-green-800' },
    { value: 25, label: '25% - Good', color: 'bg-yellow-100 text-yellow-800' },
    { value: 30, label: '30% - High', color: 'bg-orange-100 text-orange-800' },
    { value: 40, label: '40% - Premium', color: 'bg-red-100 text-red-800' },
  ]

  // Update parent component when calculations change
  useEffect(() => {
    onProfitCalculation({
      profitMarginPercentage: currentMargin,
      recommendedPrice,
      totalCost,
      profitAmount
    })
  }, [currentMargin, recommendedPrice, totalCost, profitAmount]) // Removed onProfitCalculation from dependencies

  const handleMarginSelect = (value: string) => {
    if (value === 'custom') {
      setIsCustomMargin(true)
      setCustomMargin('')
    } else {
      setIsCustomMargin(false)
      setProfitMarginPercentage(parseInt(value))
    }
  }

  const handleCustomMarginChange = (value: string) => {
    setCustomMargin(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Profit Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Cost Breakdown</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum Price (includes AI messages):</span>
              <span className="font-medium">{formatCurrency(minimumPrice)}</span>
            </div>
            {aiMessagesUsed > 0 && (
              <div className="flex justify-between text-xs text-gray-500 ml-4">
                <span>• AI Messages for Requirements ({aiMessagesUsed}):</span>
                <span>{formatCurrency(aiMessagesCost)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total Cost:</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>
          {aiMessagesUsed > 0 && (
            <p className="text-xs text-gray-500">
              💡 AI Messages Used for Requirements Analysis: {aiMessagesUsed} × {formatCurrency(aiMessageRate)} = {formatCurrency(aiMessagesCost)}
            </p>
          )}
        </div>

        {/* Profit Margin Selection */}
        <div className="space-y-3">
          <Label>Profit Margin</Label>
          <Select 
            value={isCustomMargin ? 'custom' : profitMarginPercentage.toString()} 
            onValueChange={handleMarginSelect}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profitOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={option.color}>
                      {option.value}%
                    </Badge>
                    <span>{option.label.split(' - ')[1]}</span>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom Percentage</SelectItem>
            </SelectContent>
          </Select>

          {isCustomMargin && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Enter custom %"
                value={customMargin}
                onChange={(e) => handleCustomMarginChange(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          )}
        </div>

        {/* Profit Calculation Results */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Profit Calculation
          </h4>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Margin:</span>
              <span className="font-medium">{currentMargin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Amount:</span>
              <span className="font-medium text-green-600">{formatCurrency(profitAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold text-lg">
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Recommended Price:
              </span>
              <span className="text-green-600">{formatCurrency(recommendedPrice)}</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {onSaveEstimatedPrice && (
          <Button
            onClick={() => onSaveEstimatedPrice(recommendedPrice)}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Estimated Price ({formatCurrency(recommendedPrice)})
          </Button>
        )}

        {/* Quick Comparison */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>Tip:</strong> The recommended price includes your costs plus the selected profit margin.</p>
          <p>📊 Industry standard profit margins typically range from 15-30% for freelance work.</p>
        </div>
      </CardContent>
    </Card>
  )
}
