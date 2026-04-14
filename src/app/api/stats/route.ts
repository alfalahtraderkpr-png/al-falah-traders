import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalCount, aggregates, earliestEntry, latestEntry] = await Promise.all([
      db.dailyEntry.count(),
      db.dailyEntry.aggregate({
        _sum: {
          summaryAmount: true,
          cashReceived: true,
          creditPosted: true,
        },
      }),
      db.dailyEntry.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
      db.dailyEntry.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
    ])

    const totalSales = aggregates._sum.summaryAmount || 0
    const totalRecovery = aggregates._sum.cashReceived || 0
    const totalCredit = aggregates._sum.creditPosted || 0
    const totalOutstanding = Math.max(0, totalCredit)

    return NextResponse.json({
      totalEntries: totalCount,
      earliestDate: earliestEntry?.date?.toISOString() ?? null,
      latestDate: latestEntry?.date?.toISOString() ?? null,
      totalSales,
      totalRecovery,
      totalCredit,
      totalOutstanding,
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
