'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CreateQuoteForm } from '@/components/forms/create-quote-form'
import { QuoteForm } from '@/components/forms/quote-form'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { FileText, Plus, Search, Filter, Eye, Edit, Trash2, FolderPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Quote {
  id: string
  reference: number
  name: string
  description?: string
  priceEstimated: number
  minimumPrice: number
  status: 'QUOTED' | 'ACCEPTED' | 'REJECTED'
  source?: string
  createdAt: string
  client: {
    id: string
    name: string
    email?: string
  }
  project?: {
    id: string
    name: string
  }
}

interface QuotesResponse {
  quotes: Quote[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/quotes?${params}`)
      if (!response.ok) throw new Error('Failed to fetch quotes')
      
      const data: QuotesResponse = await response.json()
      setQuotes(data.quotes)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [currentPage, statusFilter])

  const filteredQuotes = quotes.filter(quote =>
    quote.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (quote.description && quote.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'outline'
      case 'QUOTED': return 'secondary'
      case 'ACCEPTED': return 'success'
      case 'REJECTED': return 'destructive'
      default: return 'secondary'
    }
  }

  const handleCreateQuote = async (data: any) => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to create quote')

      setShowCreateDialog(false)
      fetchQuotes() // Refresh the list
    } catch (error) {
      console.error('Error creating quote:', error)
      alert('Failed to create quote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditQuote = async (data: any) => {
    if (!editingQuote) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/quotes/${editingQuote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to update quote')

      setEditingQuote(null)
      fetchQuotes() // Refresh the list
    } catch (error) {
      console.error('Error updating quote:', error)
      alert('Failed to update quote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete quote')

      fetchQuotes() // Refresh the list
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Failed to delete quote. Please try again.')
    }
  }

  const handleCreateProject = async (quote: Quote) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          name: quote.name,
          description: quote.description,
          startDate: new Date().toISOString(),
          endDate: quote.endDateEstimated,
          agreedPrice: quote.priceEstimated,
          minimumCost: quote.minimumPrice,
          aiMessageRate: 0.1,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      const project = await response.json()

      // Navigate to the new project
      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert(error instanceof Error ? error.message : 'Failed to create project. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600">Manage your project quotes and proposals</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
            </DialogHeader>
            <CreateQuoteForm
              onSubmit={handleCreateQuote}
              onCancel={() => setShowCreateDialog(false)}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search quotes, clients, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="QUOTED">Quoted</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Quotes ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No quotes found</p>
              <p className="text-sm">Create your first quote to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{quote.name}</div>
                          <div className="text-sm text-gray-500">#{quote.reference}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{quote.client.name}</div>
                          {quote.client.email && (
                            <div className="text-sm text-gray-500">{quote.client.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatCurrency(quote.priceEstimated)}</div>
                          <div className="text-sm text-gray-500">
                            Min: {formatCurrency(quote.minimumPrice)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(quote.status)}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {quote.source ? (
                          <span className="text-sm">{quote.source}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(quote.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/quotes/${quote.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          {quote.status === 'ACCEPTED' && !quote.project && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateProject(quote)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Create Project"
                            >
                              <FolderPlus className="w-4 h-4" />
                            </Button>
                          )}
                          {quote.project && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/projects/${quote.project.id}`} title="View Project">
                                <FolderPlus className="w-4 h-4 text-green-600" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingQuote(quote)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuote(quote.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
                {pagination.total} quotes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={currentPage === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Quote Dialog */}
      <Dialog open={!!editingQuote} onOpenChange={() => setEditingQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
          </DialogHeader>
          {editingQuote && (
            <QuoteForm
              quote={editingQuote}
              onSubmit={handleEditQuote}
              onCancel={() => setEditingQuote(null)}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
