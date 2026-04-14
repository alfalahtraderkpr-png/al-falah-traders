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

    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo)

    const where: Record<string, unknown> = {}
    if (dateFrom || dateTo) {
      where.date = dateFilter
    }

    // Get all entries in the date range with relations
    const entries = await db.dailyEntry.findMany({
      where,
      include: {
        orderBooker: { select: { id: true, name: true, isActive: true } },
        company: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: { date: 'desc' },
    })

    // Aggregated totals
    const totalSales = entries.reduce((sum, e) => sum + e.summaryAmount, 0)
    const totalRecovery = entries.reduce((sum, e) => sum + e.cashReceived, 0)
    const totalCredit = entries.reduce((sum, e) => sum + e.creditPosted, 0)
    const totalStockReturn = entries.reduce(
      (sum, e) => sum + e.stockReturn,
      0
    )
    const totalOldRecovery = entries.reduce(
      (sum, e) => sum + e.oldRecovery,
      0
    )

    // Per Order Booker breakdown
    const obMap = new Map<
      string,
      {
        id: string
        name: string
        totalSales: number
        totalRecovery: number
        totalCredit: number
        totalStockReturn: number
        totalOldRecovery: number
        entryCount: number
      }
    >()

    for (const entry of entries) {
      const obId = entry.orderBookerId
      if (!obMap.has(obId)) {
        obMap.set(obId, {
          id: obId,
          name: entry.orderBooker.name,
          totalSales: 0,
          totalRecovery: 0,
          totalCredit: 0,
          totalStockReturn: 0,
          totalOldRecovery: 0,
          entryCount: 0,
        })
      }
      const obData = obMap.get(obId)!
      obData.totalSales += entry.summaryAmount
      obData.totalRecovery += entry.cashReceived
      obData.totalCredit += entry.creditPosted
      obData.totalStockReturn += entry.stockReturn
      obData.totalOldRecovery += entry.oldRecovery
      obData.entryCount++
    }

    // Per Company breakdown
    const companyMap = new Map<
      string,
      {
        id: string
        name: string
        totalSales: number
        totalRecovery: number
        totalCredit: number
        totalStockReturn: number
        entryCount: number
      }
    >()

    for (const entry of entries) {
      const cId = entry.companyId
      if (!companyMap.has(cId)) {
        companyMap.set(cId, {
          id: cId,
          name: entry.company.name,
          totalSales: 0,
          totalRecovery: 0,
          totalCredit: 0,
          totalStockReturn: 0,
          entryCount: 0,
        })
      }
      const cData = companyMap.get(cId)!
      cData.totalSales += entry.summaryAmount
      cData.totalRecovery += entry.cashReceived
      cData.totalCredit += entry.creditPosted
      cData.totalStockReturn += entry.stockReturn
      cData.entryCount++
    }

    // Daily trend data
    const dailyMap = new Map<
      string,
      {
        date: string
        totalSales: number
        totalRecovery: number
        totalCredit: number
        totalStockReturn: number
        entryCount: number
      }
    >()

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0]
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalSales: 0,
          totalRecovery: 0,
          totalCredit: 0,
          totalStockReturn: 0,
          entryCount: 0,
        })
      }
      const dData = dailyMap.get(dateKey)!
      dData.totalSales += entry.summaryAmount
      dData.totalRecovery += entry.cashReceived
      dData.totalCredit += entry.creditPosted
      dData.totalStockReturn += entry.stockReturn
      dData.entryCount++
    }

    // Sort daily trend by date ascending
    const dailyTrend = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    return NextResponse.json({
      summary: {
        totalSales,
        totalRecovery,
        totalCredit,
        totalStockReturn,
        totalOldRecovery,
        entryCount: entries.length,
      },
      orderBookerBreakdown: Array.from(obMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      companyBreakdown: Array.from(companyMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      dailyTrend,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
