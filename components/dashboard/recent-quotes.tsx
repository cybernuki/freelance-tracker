import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { FileText, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'

async function getRecentQuotes() {
  return prisma.quote.findMany({
    include: {
      client: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
}

export async function RecentQuotes() {
  const quotes = await getRecentQuotes()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          Recent Quotes ({quotes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No quotes yet</p>
            <p className="text-sm">Create your first quote!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {quote.name}
                    </h4>
                    <p className="text-sm text-gray-600">{quote.client.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(quote.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(quote.priceEstimated)}
                      </div>
                      {quote.source && (
                        <div className="text-xs text-gray-500">
                          via {quote.source}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        quote.status
                      )}`}
                    >
                      {quote.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
