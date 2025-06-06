import { NextRequest, NextResponse } from 'next/server'
import { getUnreadAlerts, markAlertAsRead, markAllAlertsAsRead, generateProjectAlerts } from '@/lib/alerts'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'generate') {
      // Generate new alerts for all active projects
      await generateProjectAlerts()
    }

    const alerts = await getUnreadAlerts()
    
    return NextResponse.json({
      alerts,
      count: alerts.length,
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('id')
    const action = searchParams.get('action')

    if (action === 'mark-all-read') {
      await markAllAlertsAsRead()
      return NextResponse.json({ success: true })
    }

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      )
    }

    await markAlertAsRead(alertId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
