'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, CheckCircle, RefreshCw, MarkAsRead } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface Alert {
  id: string
  message: string
  date: string
  read: boolean
  project: {
    id: string
    name: string
    quote: {
      client: {
        name: string
      }
    }
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAlerts = async (generate = false) => {
    try {
      const url = generate ? '/api/alerts?action=generate' : '/api/alerts'
      const response = await fetch(url)
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      await fetch(`/api/alerts?id=${alertId}`, {
        method: 'PATCH',
      })
      setAlerts(alerts.filter(alert => alert.id !== alertId))
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/alerts?action=mark-all-read', {
        method: 'PATCH',
      })
      setAlerts([])
    } catch (error) {
      console.error('Error marking all alerts as read:', error)
    }
  }

  const refreshAlerts = async () => {
    setRefreshing(true)
    await fetchAlerts(true)
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const getAlertType = (message: string) => {
    if (message.includes('No payment')) return 'payment'
    if (message.includes('exceeded estimate')) return 'ai-exceeded'
    if (message.includes('overdue')) return 'overdue'
    if (message.includes('usage at')) return 'ai-warning'
    return 'general'
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'payment': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'ai-exceeded': return 'bg-red-50 border-red-200 text-red-800'
      case 'overdue': return 'bg-red-50 border-red-200 text-red-800'
      case 'ai-warning': return 'bg-orange-50 border-orange-200 text-orange-800'
      default: return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💰'
      case 'ai-exceeded': return '🤖'
      case 'overdue': return '⏰'
      case 'ai-warning': return '⚠️'
      default: return '📢'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600">Loading alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600">
            Manage your project alerts and notifications ({alerts.length} active)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshAlerts}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {alerts.length > 0 && (
            <Button onClick={markAllAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600">No active alerts. All projects are on track!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const alertType = getAlertType(alert.message)
            const alertColor = getAlertColor(alertType)
            const alertIcon = getAlertIcon(alertType)

            return (
              <Card key={alert.id} className={`border-l-4 ${alertColor}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">{alertIcon}</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDateTime(alert.date)}
                          </div>
                          <Link
                            href={`/projects/${alert.project.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {alert.project.name}
                          </Link>
                          <span>•</span>
                          <span>{alert.project.quote.client.name}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(alert.id)}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
