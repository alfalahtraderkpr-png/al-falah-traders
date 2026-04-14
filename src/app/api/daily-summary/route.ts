import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Default to current month if no dates provided
    const now = new Date()
    const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to = dateTo ? new Date(dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Set time boundaries
    from.setHours(0, 0, 0, 0)
    to.setHours(23, 59, 59, 999)

    // Get all entries in the date range, grouped by date
    const entries = await db.dailyEntry.findMany({
      where: {
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Group by date and calculate totals
    const dailyMap = new Map<string, {
      date: string
      totalSales: number
      totalRecovery: number
      totalCredit: number
      totalStockReturn: number
      entryCount: number
    }>()

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0]

      const existing = dailyMap.get(dateKey)
      if (existing) {
        existing.totalSales += entry.summaryAmount
        existing.totalRecovery += entry.cashReceived
        existing.totalCredit += entry.creditPosted
        existing.totalStockReturn += entry.stockReturn
        existing.entryCount += 1
      } else {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalSales: entry.summaryAmount,
          totalRecovery: entry.cashReceived,
          totalCredit: entry.creditPosted,
          totalStockReturn: entry.stockReturn,
          entryCount: 1,
        })
      }
    }

    // Calculate recovery rate and build response
    const dailySummary = Array.from(dailyMap.values()).map((day) => ({
      ...day,
      recoveryRate: day.totalSales > 0
        ? Math.round((day.totalRecovery / day.totalSales) * 10000) / 100
        : 0,
    }))

    // Monthly summary
    const monthlySummary = {
      totalSales: dailySummary.reduce((s, d) => s + d.totalSales, 0),
      totalRecovery: dailySummary.reduce((s, d) => s + d.totalRecovery, 0),
      totalCredit: dailySummary.reduce((s, d) => s + d.totalCredit, 0),
      totalStockReturn: dailySummary.reduce((s, d) => s + d.totalStockReturn, 0),
      totalEntries: dailySummary.reduce((s, d) => s + d.entryCount, 0),
      activeDays: dailySummary.length,
      avgDailySales: 0,
      avgDailyRecovery: 0,
      recoveryRate: 0,
    }

    monthlySummary.avgDailySales = monthlySummary.activeDays > 0
      ? Math.round(monthlySummary.totalSales / monthlySummary.activeDays)
      : 0
    monthlySummary.avgDailyRecovery = monthlySummary.activeDays > 0
      ? Math.round(monthlySummary.totalRecovery / monthlySummary.activeDays)
      : 0
    monthlySummary.recoveryRate = monthlySummary.totalSales > 0
      ? Math.round((monthlySummary.totalRecovery / monthlySummary.totalSales) * 10000) / 100
      : 0

    return NextResponse.json({
      dailySummary,
      monthlySummary,
    })
  } catch (error) {
    console.error('Daily summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily summary' },
      { status: 500 }
    )
  }
}
