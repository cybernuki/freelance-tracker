'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface QuoteProgressItem {
  id: string
  label: string
  completed: boolean
  required: boolean
  description?: string
}

interface QuoteProgressBarProps {
  status: 'DRAFT' | 'QUOTED' | 'ACCEPTED' | 'REJECTED'
  progressItems: QuoteProgressItem[]
}

export function QuoteProgressBar({ status, progressItems }: QuoteProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (status !== 'DRAFT') {
    return null // Only show for draft quotes
  }

  const requiredItems = progressItems.filter(item => item.required)
  const completedRequired = requiredItems.filter(item => item.completed)
  const progressPercentage = requiredItems.length > 0
    ? (completedRequired.length / requiredItems.length) * 100
    : 0

  const canTransitionToQuoted = progressPercentage === 100

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-orange-900">Quote Draft Progress</h3>
              <p className="text-sm text-orange-700">
                Complete all required fields to transition to QUOTED status
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={canTransitionToQuoted ? "default" : "secondary"}
                className={canTransitionToQuoted ? "bg-green-600" : ""}
              >
                {Math.round(progressPercentage)}% Complete
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-orange-700 hover:text-orange-800 hover:bg-orange-100"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-700">
                {completedRequired.length} of {requiredItems.length} required items completed
              </span>
              <span className="text-orange-700 font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          </div>

          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {progressItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 p-2 rounded-lg ${
                    item.completed
                      ? 'bg-green-50 border border-green-200'
                      : item.required
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : item.required ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        item.completed
                          ? 'text-green-900'
                          : item.required
                            ? 'text-red-900'
                            : 'text-gray-700'
                      }`}>
                        {item.label}
                      </span>
                      {item.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className={`text-xs mt-1 ${
                        item.completed
                          ? 'text-green-700'
                          : item.required
                            ? 'text-red-700'
                            : 'text-gray-600'
                      }`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canTransitionToQuoted && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Ready to Quote!
                  </p>
                  <p className="text-xs text-green-700">
                    All required information has been completed. You can now transition this quote to QUOTED status.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to calculate progress items for a quote
export function calculateQuoteProgress(quote: any): QuoteProgressItem[] {
  const items: QuoteProgressItem[] = [
    {
      id: 'basic-info',
      label: 'Basic Information',
      completed: !!(quote.name && quote.clientId),
      required: true,
      description: 'Quote name and client (description is optional)'
    },
    {
      id: 'pricing',
      label: 'Pricing Information',
      completed: !!(quote.minimumPrice && quote.minimumPrice > 0 && quote.priceEstimated && quote.priceEstimated > 0),
      required: true,
      description: 'Both minimum price and estimated price must be set'
    },
    {
      id: 'requirements',
      label: 'Requirements',
      completed: !!(quote.requirements && quote.requirements.length > 0),
      required: true,
      description: 'Project requirements documented'
    },
    {
      id: 'timeline',
      label: 'Timeline',
      completed: !!(quote.startDateEstimated && quote.endDateEstimated),
      required: true,
      description: 'Estimated start and end dates'
    },
    {
      id: 'milestones',
      label: 'Milestone Estimations',
      completed: !!(quote.milestoneEstimations && quote.milestoneEstimations.length > 0 &&
        quote.milestoneEstimations.some((milestone: any) =>
          milestone.includeInQuote &&
          milestone.calculatedPrice > 0 &&
          // Ensure issues are loaded and properly estimated
          milestone.issues && milestone.issues.length > 0 &&
          milestone.issues.every((issue: any) =>
            issue.issueType !== 'UNCATEGORIZED' &&
            ((issue.issueType === 'AUGMENT' && issue.estimatedMessages > 0) ||
             (issue.issueType === 'MANUAL' && issue.fixedPrice > 0))
          )
        )),
      required: true,
      description: 'All issues within milestones must be properly estimated'
    }
  ]

  return items
}
