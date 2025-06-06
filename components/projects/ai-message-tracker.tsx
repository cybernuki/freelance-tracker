'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, MessageSquare, TrendingUp, TrendingDown, AlertTriangle, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AIMessageStatistics {
  issueId: string
  issueTitle: string
  issueNumber: number
  issueType: string
  milestoneTitle?: string
  estimated: {
    messages: number
    cost: number
  }
  actual: {
    messages: number
    cost: number
  }
  variance: {
    messages: number
    cost: number
    percentage: number
  }
  aiMessages: Array<{
    id: string
    amount: number
    cost: number
    date: string
  }>
}

interface AIMessageTrackerProps {
  projectId: string
  projectName: string
  aiMessageRate: number
  onUpdate?: () => void
}

export function AIMessageTracker({ projectId, projectName, aiMessageRate, onUpdate }: AIMessageTrackerProps) {
  const [statistics, setStatistics] = useState<AIMessageStatistics[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<AIMessageStatistics | null>(null)
  const [newMessages, setNewMessages] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [projectId])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/ai-messages`)
      if (response.ok) {
        const data = await response.json()
        setStatistics(data.statistics)
        setTotals(data.totals)
      }
    } catch (error) {
      console.error('Error fetching AI message statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateActualMessages = async (issueId: string, actualMessages: number) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/projects/${projectId}/ai-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateActualMessages',
          issueId,
          actualMessages,
        }),
      })

      if (response.ok) {
        await fetchStatistics()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error updating actual messages:', error)
    } finally {
      setSaving(false)
    }
  }

  const addAiMessageEntry = async (issueId: string, amount: number) => {
    try {
      setSaving(true)
      const cost = amount * aiMessageRate
      const response = await fetch(`/api/projects/${projectId}/ai-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addAiMessage',
          issueId,
          amount,
          cost,
        }),
      })

      if (response.ok) {
        await fetchStatistics()
        onUpdate?.()
        setNewMessages('')
        setSelectedIssue(null)
      }
    } catch (error) {
      console.error('Error adding AI message entry:', error)
    } finally {
      setSaving(false)
    }
  }

  const getVarianceColor = (percentage: number) => {
    if (percentage > 20) return 'text-red-600'
    if (percentage > 10) return 'text-yellow-600'
    if (percentage < -10) return 'text-blue-600'
    return 'text-green-600'
  }

  const getVarianceIcon = (percentage: number) => {
    if (percentage > 10) return <TrendingUp className="w-4 h-4" />
    if (percentage < -10) return <TrendingDown className="w-4 h-4" />
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            AI Message Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading statistics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          AI Message Tracking - {projectName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        {totals && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Estimated</p>
                  <p className="text-xl font-bold">{totals.estimated.messages} messages</p>
                  <p className="text-sm text-gray-500">{formatCurrency(totals.estimated.cost)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Actual</p>
                  <p className="text-xl font-bold">{totals.actual.messages} messages</p>
                  <p className="text-sm text-gray-500">{formatCurrency(totals.actual.cost)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Variance</p>
                  <p className={`text-xl font-bold ${getVarianceColor(
                    totals.estimated.messages > 0 
                      ? ((totals.actual.messages - totals.estimated.messages) / totals.estimated.messages) * 100 
                      : 0
                  )}`}>
                    {totals.actual.messages - totals.estimated.messages} messages
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(totals.actual.cost - totals.estimated.cost)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Issues Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Issue-by-Issue Breakdown</h3>
          {statistics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No issues with AI message estimates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Estimated</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.map((stat) => (
                    <TableRow key={stat.issueId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">#{stat.issueNumber} {stat.issueTitle}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stat.issueType === 'AUGMENT' ? 'default' : 'secondary'}>
                          {stat.issueType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{stat.milestoneTitle || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{stat.estimated.messages}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(stat.estimated.cost)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{stat.actual.messages}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(stat.actual.cost)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${getVarianceColor(stat.variance.percentage)}`}>
                          {getVarianceIcon(stat.variance.percentage)}
                          <div>
                            <p className="font-medium">{stat.variance.messages > 0 ? '+' : ''}{stat.variance.messages}</p>
                            <p className="text-sm">{stat.variance.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedIssue(stat)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Log
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Log AI Messages - Issue #{stat.issueNumber}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Number of AI Messages Used</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={newMessages}
                                  onChange={(e) => setNewMessages(e.target.value)}
                                  placeholder="Enter number of messages"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                  Cost: {formatCurrency((parseInt(newMessages) || 0) * aiMessageRate)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => addAiMessageEntry(stat.issueId, parseInt(newMessages) || 0)}
                                  disabled={!newMessages || saving}
                                  className="flex-1"
                                >
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                  Add Entry
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
