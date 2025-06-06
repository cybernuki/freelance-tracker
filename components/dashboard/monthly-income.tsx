import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

async function getMonthlyIncome() {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  const startOfMonth = new Date(currentYear, currentMonth, 1)
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0)
  
  const [currentMonthIncome, lastMonthIncome] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        date: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lte: new Date(currentYear, currentMonth, 0),
        },
      },
      _sum: { amount: true },
    }),
  ])

  const current = currentMonthIncome._sum.amount || 0
  const last = lastMonthIncome._sum.amount || 0
  const growth = last > 0 ? ((current - last) / last) * 100 : 0

  return {
    current,
    last,
    growth,
    monthName: currentDate.toLocaleDateString('en-US', { month: 'long' }),
  }
}

export async function MonthlyIncome() {
  const income = await getMonthlyIncome()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          {income.monthName} Income
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(income.current)}
            </div>
            <p className="text-sm text-gray-600">This month</p>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last month:</span>
            <span className="font-medium">{formatCurrency(income.last)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Growth:</span>
            <span
              className={`font-medium ${
                income.growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {income.growth >= 0 ? '+' : ''}
              {income.growth.toFixed(1)}%
            </span>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Track your monthly earnings and growth trends
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
