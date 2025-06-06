'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
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

export function NotificationDropdown() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

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

  useEffect(() => {
    fetchAlerts()
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const getAlertIcon = (message: string) => {
    if (message.includes('No payment')) return '💰'
    if (message.includes('exceeded estimate')) return '🤖'
    if (message.includes('overdue')) return '⏰'
    if (message.includes('usage at')) return '⚠️'
    return '📢'
  }

  const truncateMessage = (message: string, maxLength = 60) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {alerts.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {alerts.length > 9 ? '9+' : alerts.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading notifications...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="border-b last:border-b-0">
                <div className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="text-lg">{getAlertIcon(alert.message)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {truncateMessage(alert.message)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(alert.date)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(alert.id)
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      </div>
                      <Link
                        href={`/projects/${alert.project.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => setOpen(false)}
                      >
                        {alert.project.name}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {alerts.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href="/alerts" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full text-sm">
                  View all {alerts.length} notifications
                </Button>
              </Link>
            </div>
          </>
        )}
        
        {alerts.length > 0 && alerts.length <= 5 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href="/alerts" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full text-sm">
                  View all notifications
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
