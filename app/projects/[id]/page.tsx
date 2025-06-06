'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Edit, DollarSign, Calendar, TrendingUp, AlertCircle, User, FileText, Activity, MessageSquare, Github } from 'lucide-react'
import { GitHubIntegration } from '@/components/quotes/github-integration'
import { AIMessageTracker } from '@/components/projects/ai-message-tracker'
import Link from 'next/link'

interface Project {
  id: string
  reference: number
  name: string
  description?: string
  startDate: string
  endDate?: string
  agreedPrice: number
  aiMessageRate: number
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELED'
  quote: {
    id: string
    githubRepository?: string
    client: {
      id: string
      name: string
      email?: string
    }
  }
  payments: Array<{
    id: string
    amount: number
    method: string
    description?: string
    date: string
  }>
  issues: Array<{
    id: string
    title: string
    status: string
    aiMessageEstimate: number
    aiMessages: Array<{
      amount: number
      cost: number
      date: string
    }>
  }>
  manualTasks: Array<{
    id: string
    description: string
    cost: number
  }>
  extraExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
  }>
  profitability: {
    totalIncome: number
    totalCosts: number
    netProfit: number
    profitMargin: number
  }
  metrics: {
    totalPaid: number
    totalAiMessages: number
    paymentProgress: number
    unreadAlerts: number
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/projects')
          return
        }
        throw new Error('Failed to fetch project')
      }

      const data = await response.json()
      setProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncGitHub = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'syncGitHub' }),
      })

      if (response.ok) {
        await fetchProject() // Refresh project data
      } else {
        console.error('Failed to sync with GitHub')
      }
    } catch (error) {
      console.error('Error syncing with GitHub:', error)
    }
  }

  const handleAiMessageUpdate = async (issueId: string, actualMessages: number) => {
    try {
      const response = await fetch(`/api/projects/${params.id}/ai-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateActualMessages',
          issueId,
          actualMessages,
        }),
      })

      if (response.ok) {
        await fetchProject() // Refresh project data
      } else {
        console.error('Failed to update AI messages')
      }
    } catch (error) {
      console.error('Error updating AI messages:', error)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success'
      case 'CANCELED': return 'destructive'
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

  if (!project) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Project not found</p>
        <Button asChild className="mt-4">
          <Link href="/projects">Back to Projects</Link>
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
            <Link href="/projects">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">Project #{project.reference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(project.status)}>
            {project.status}
          </Badge>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold">{formatCurrency(project.metrics.totalPaid)}</p>
                <p className="text-xs text-gray-500">of {formatCurrency(project.agreedPrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${project.profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(project.profitability.netProfit)}
                </p>
                <p className="text-xs text-gray-500">{project.profitability.profitMargin.toFixed(1)}% margin</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">AI Messages</p>
                <p className="text-2xl font-bold">{project.metrics.totalAiMessages}</p>
                <p className="text-xs text-gray-500">Cost: {formatCurrency(project.profitability.totalCosts)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold">{project.metrics.paymentProgress.toFixed(0)}%</p>
                <Progress value={project.metrics.paymentProgress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle>Project Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payments ({project.payments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No payments recorded</p>
                  <Button className="mt-4">Add Payment</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              {formatCurrency(payment.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.method}</Badge>
                          </TableCell>
                          <TableCell>{payment.description || '-'}</TableCell>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issues & AI Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Issues & AI Usage ({project.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.issues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No issues tracked</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {project.issues.map((issue) => {
                    const totalMessages = issue.aiMessages.reduce((sum, msg) => sum + msg.amount, 0)
                    const totalCost = issue.aiMessages.reduce((sum, msg) => sum + msg.cost, 0)
                    
                    return (
                      <div key={issue.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{issue.title}</h4>
                          <Badge variant="outline">{issue.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Estimated Messages</p>
                            <p className="font-medium">{issue.aiMessageEstimate}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Actual Messages</p>
                            <p className="font-medium">{totalMessages}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">AI Cost</p>
                            <p className="font-medium">{formatCurrency(totalCost)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* GitHub Integration */}
          {project.quote.githubRepository && (
            <GitHubIntegration
              mode="project"
              projectId={project.id}
              currentRepository={project.quote.githubRepository}
              currentAiMessageRate={project.aiMessageRate}
              onUpdate={fetchProject}
              onSyncGitHub={handleSyncGitHub}
              onAiMessageUpdate={handleAiMessageUpdate}
              showRepositorySearch={false}
              showPricing={false}
              showAiMessageTracking={true}
              showEstimatedVsActual={true}
              readonly={false}
            />
          )}

          {/* AI Message Tracking */}
          <AIMessageTracker
            projectId={project.id}
            projectName={project.name}
            aiMessageRate={project.aiMessageRate}
            onUpdate={fetchProject}
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
                <p className="font-medium">{project.quote.client.name}</p>
                {project.quote.client.email && (
                  <p className="text-sm text-gray-600">{project.quote.client.email}</p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/clients/${project.quote.client.id}`}>
                  View Client Details
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/quotes/${project.quote.id}`}>
                  View Original Quote
                </Link>
              </Button>
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
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-medium">{formatDate(project.startDate)}</p>
              </div>
              {project.endDate && (
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium">{formatDate(project.endDate)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Agreed Price</p>
                <p className="font-medium text-green-600">{formatCurrency(project.agreedPrice)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">AI Messages</span>
                <span className="font-medium">{formatCurrency(project.profitability.totalCosts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Manual Tasks</span>
                <span className="font-medium">
                  {formatCurrency(project.manualTasks.reduce((sum, task) => sum + task.cost, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Extra Expenses</span>
                <span className="font-medium">
                  {formatCurrency(project.extraExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
                </span>
              </div>
              <hr />
              <div className="flex justify-between font-medium">
                <span>Total Costs</span>
                <span>{formatCurrency(project.profitability.totalCosts)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Net Profit</span>
                <span className={project.profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(project.profitability.netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <DollarSign className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
              <Button variant="outline" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Log AI Usage
              </Button>
              <Button variant="outline" className="w-full">
                <Activity className="w-4 h-4 mr-2" />
                Add Manual Task
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
