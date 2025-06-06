'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, CheckCircle, ExternalLink } from 'lucide-react'
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

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
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

  useEffect(() => {
    fetchAlerts()
  }, [])

  const getAlertIcon = (message: string) => {
    if (message.includes('No payment')) return '💰'
    if (message.includes('exceeded estimate')) return '🤖'
    if (message.includes('overdue')) return '⏰'
    if (message.includes('usage at')) return '⚠️'
    return '📢'
  }

  const getAlertColor = (message: string) => {
    if (message.includes('No payment')) return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    if (message.includes('exceeded estimate')) return 'bg-red-50 border-red-200 text-red-800'
    if (message.includes('overdue')) return 'bg-red-50 border-red-200 text-red-800'
    if (message.includes('usage at')) return 'bg-orange-50 border-orange-200 text-orange-800'
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading alerts...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Active Alerts ({alerts.length})
          </div>
          {alerts.length > 0 && (
            <Link href="/alerts">
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>No active alerts</p>
            <p className="text-sm">All projects are on track!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 border rounded-lg ${getAlertColor(alert.message)}`}
              >
                <div className="text-lg">{getAlertIcon(alert.message)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">
                        {formatDateTime(alert.date)}
                      </span>
                      {alert.project && (
                        <Link
                          href={`/projects/${alert.project.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          • {alert.project.name}
                        </Link>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <div className="text-center pt-4">
                <Link href="/alerts">
                  <Button variant="outline" size="sm">
                    View all {alerts.length} alerts
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
