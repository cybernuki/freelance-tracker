import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUnreadAlerts } from '@/lib/alerts'
import { AlertCircle, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export async function AlertsPanel() {
  const alerts = await getUnreadAlerts()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Active Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No active alerts</p>
            <p className="text-sm">All projects are on track!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-800 font-medium">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-red-600" />
                    <span className="text-xs text-red-600">
                      {formatDateTime(alert.date)}
                    </span>
                    {alert.project && (
                      <span className="text-xs text-red-600">
                        • {alert.project.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500">
                  +{alerts.length - 5} more alerts
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
