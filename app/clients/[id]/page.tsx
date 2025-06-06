'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClientForm } from '@/components/forms/client-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Edit, Trash2, User, Mail, Phone, FileText, FolderOpen, DollarSign, TrendingUp, Eye } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  reference: number
  name: string
  contact?: string
  email?: string
  phone?: string
  createdAt: string
  quotes: Array<{
    id: string
    reference: number
    name: string
    status: 'QUOTED' | 'ACCEPTED' | 'REJECTED'
    priceEstimated: number
    createdAt: string
    project?: {
      id: string
      name: string
      status: 'ACTIVE' | 'COMPLETED' | 'CANCELED'
      payments: Array<{
        amount: number
      }>
    }
  }>
  metrics: {
    totalQuotes: number
    acceptedQuotes: number
    activeProjects: number
    totalRevenue: number
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchClient()
    }
  }, [params.id])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/clients')
          return
        }
        throw new Error('Failed to fetch client')
      }
      
      const data = await response.json()
      setClient(data)
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClient = async (data: any) => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to update client')

      setShowEditDialog(false)
      fetchClient() // Refresh the client
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Failed to update client. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated quotes and projects.')) return

    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete client')

      router.push('/clients')
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client. Please try again.')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success'
      case 'REJECTED': return 'destructive'
      case 'ACTIVE': return 'success'
      case 'COMPLETED': return 'secondary'
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

  if (!client) {
    return (
      <div className="text-center py-8">
        <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Client not found</p>
        <Button asChild className="mt-4">
          <Link href="/clients">Back to Clients</Link>
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
            <Link href="/clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600">Client #{client.reference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDeleteClient}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Quotes</p>
                <p className="text-2xl font-bold">{client.metrics.totalQuotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accepted Quotes</p>
                <p className="text-2xl font-bold">{client.metrics.acceptedQuotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{client.metrics.activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(client.metrics.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotes Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Quotes ({client.quotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.quotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No quotes found</p>
                  <Button asChild className="mt-4">
                    <Link href="/quotes">Create First Quote</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.quotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{quote.name}</div>
                              <div className="text-sm text-gray-500">#{quote.reference}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{formatCurrency(quote.priceEstimated)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(quote.status)}>
                              {quote.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {quote.project ? (
                              <div>
                                <Link 
                                  href={`/projects/${quote.project.id}`}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  {quote.project.name}
                                </Link>
                                <div className="text-sm">
                                  <Badge variant={getStatusBadgeVariant(quote.project.status)} className="text-xs">
                                    {quote.project.status}
                                  </Badge>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDate(quote.createdAt)}</span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/quotes/${quote.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Company Name</p>
                <p className="font-medium">{client.name}</p>
              </div>
              
              {client.contact && (
                <div>
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="font-medium">{client.contact}</p>
                </div>
              )}
              
              {client.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a 
                    href={`mailto:${client.email}`} 
                    className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {client.email}
                  </a>
                </div>
              )}
              
              {client.phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <a 
                    href={`tel:${client.phone}`} 
                    className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {client.phone}
                  </a>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600">Client Since</p>
                <p className="font-medium">{formatDate(client.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href={`/quotes?clientId=${client.id}`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create New Quote
                </Link>
              </Button>
              
              {client.email && (
                <Button variant="outline" asChild className="w-full">
                  <a href={`mailto:${client.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </a>
                </Button>
              )}
              
              {client.phone && (
                <Button variant="outline" asChild className="w-full">
                  <a href={`tel:${client.phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Client
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            client={client}
            onSubmit={handleEditClient}
            onCancel={() => setShowEditDialog(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
