import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * Dashboard API
 *
 * Business Formulas (Al-Falah Traders):
 * =====================================
 * CREDIT = Total Summary - Stock Return - Summary Cash
 *   (i.e., creditPosted = summaryAmount - stockReturn - cashReceived)
 *
 * CLOSING CREDIT = Today Opening Credit - Old Recovery - Claim Cleared
 *                  - Return Stock/Claim by OB + Credit Posted
 *   (i.e., closingBalance = openingBalance - oldRecovery - claimCleared
 *          - returnStockClaimByOB + creditPosted)
 *
 * TOTAL RECOVERY = Summary Cash + Old Recovery + Claim Cleared + Return Stock/Claim by OB
 *   (i.e., totalRecovery = cashReceived + oldRecovery + claimCleared + returnStockClaimByOB)
 *
 * Example:
 *   Opening: 10000, Old Recovery: 2000, Summary: 10000,
 *   Cash: 5000, Stock Return: 0, Claim Cleared: 1000
 *   Credit = 10000 - 0 - 5000 = 5000
 *   Closing = 10000 - 2000 - 1000 - 0 + 5000 = 12000
 */
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
    const totalSales = entries.reduce((sum, e) => sum + (e.summaryAmount ?? 0), 0)
    const totalCashReceived = entries.reduce(
      (sum, e) => sum + (e.cashReceived ?? 0),
      0
    )
    const totalCredit = entries.reduce((sum, e) => sum + (e.creditPosted ?? 0), 0)
    const totalStockReturn = entries.reduce(
      (sum, e) => sum + (e.stockReturn ?? 0),
      0
    )
    const totalOldRecovery = entries.reduce(
      (sum, e) => sum + (e.oldRecovery ?? 0),
      0
    )
    const totalClaimCleared = entries.reduce(
      (sum, e) => sum + (e.claimCleared ?? 0),
      0
    )
    const totalReturnStockByOB = entries.reduce(
      (sum, e) => sum + (e.returnStockClaimByOB ?? 0),
      0
    )
    // Total Recovery = Cash Received + Old Recovery + Claim Cleared + Return Stock/Claim by OB
    const totalRecovery =
      totalCashReceived + totalOldRecovery + totalClaimCleared + totalReturnStockByOB

    // Per Order Booker breakdown with closing credit calculation
    const obMap = new Map<
      string,
      {
        id: string
        name: string
        totalSales: number
        totalRecovery: number
        totalCashReceived: number
        totalCredit: number
        totalStockReturn: number
        totalOldRecovery: number
        totalClaimCleared: number
        totalReturnStockByOB: number
        entryCount: number
        openingCredit: number
        closingCredit: number
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
          totalCashReceived: 0,
          totalCredit: 0,
          totalStockReturn: 0,
          totalOldRecovery: 0,
          totalClaimCleared: 0,
          totalReturnStockByOB: 0,
          entryCount: 0,
          openingCredit: 0,
          closingCredit: 0,
        })
      }
      const obData = obMap.get(obId)!
      obData.totalSales += entry.summaryAmount ?? 0
      obData.totalCashReceived += entry.cashReceived ?? 0
      obData.totalCredit += entry.creditPosted ?? 0
      obData.totalStockReturn += entry.stockReturn ?? 0
      obData.totalOldRecovery += entry.oldRecovery ?? 0
      obData.totalClaimCleared += entry.claimCleared ?? 0
      obData.totalReturnStockByOB += entry.returnStockClaimByOB ?? 0
      obData.totalRecovery =
        obData.totalCashReceived +
        obData.totalOldRecovery +
        obData.totalClaimCleared +
        obData.totalReturnStockByOB
      obData.entryCount++
    }

    // Get opening and closing credit per OB from BalanceHistory
    // For each OB, find the opening balance before dateFrom and the closing balance at dateTo
    const obIds = Array.from(obMap.keys())

    for (const obId of obIds) {
      const obData = obMap.get(obId)!

      // Find the most recent balance before the date range (opening credit)
      const openDate = dateFrom ? new Date(dateFrom) : new Date('2000-01-01')
      const openingBalance = await db.balanceHistory.findFirst({
        where: {
          orderBookerId: obId,
          date: { lt: openDate },
        },
        orderBy: { date: 'desc' },
      })
      obData.openingCredit = openingBalance?.closingBalance ?? 0

      // Find the most recent balance in or before the date range (closing credit)
      const closeDate = dateTo ? new Date(dateTo) : new Date()
      const closingBalance = await db.balanceHistory.findFirst({
        where: {
          orderBookerId: obId,
          date: { lte: closeDate },
        },
        orderBy: { date: 'desc' },
      })
      // Closing credit = closing balance from balance history
      // This is the sum of all OB+Company closing balances for this OB
      obData.closingCredit = closingBalance?.closingBalance ?? 0
    }

    // Actually, let's compute closing credit properly by summing all balance history entries
    // for each OB at the latest date
    for (const obId of obIds) {
      const obData = obMap.get(obId)!

      // Get ALL balance history entries for this OB, find the latest closing balances per company
      const latestBalances = await db.balanceHistory.findMany({
        where: {
          orderBookerId: obId,
          ...(dateTo ? { date: { lte: new Date(dateTo) } } : {}),
        },
        orderBy: { date: 'desc' },
        include: { company: { select: { id: true } } },
      })

      // Sum the latest closing balance per company
      const companyClosingMap = new Map<string, number>()
      for (const bal of latestBalances) {
        if (!companyClosingMap.has(bal.companyId)) {
          companyClosingMap.set(bal.companyId, bal.closingBalance ?? 0)
        }
      }
      obData.closingCredit = Array.from(companyClosingMap.values()).reduce((s, v) => s + v, 0)

      // Get opening credit: sum of latest balances per company BEFORE the date range
      if (dateFrom) {
        const openingBalances = await db.balanceHistory.findMany({
          where: {
            orderBookerId: obId,
            date: { lt: new Date(dateFrom) },
          },
          orderBy: { date: 'desc' },
        })
        const companyOpeningMap = new Map<string, number>()
        for (const bal of openingBalances) {
          if (!companyOpeningMap.has(bal.companyId)) {
            companyOpeningMap.set(bal.companyId, bal.closingBalance ?? 0)
          }
        }
        obData.openingCredit = Array.from(companyOpeningMap.values()).reduce((s, v) => s + v, 0)
      } else {
        // No date filter - opening is 0 (or we can use the earliest balance)
        obData.openingCredit = 0
      }
    }

    // Per Company breakdown
    const companyMap = new Map<
      string,
      {
        id: string
        name: string
        totalSales: number
        totalRecovery: number
        totalCashReceived: number
        totalCredit: number
        totalStockReturn: number
        totalOldRecovery: number
        totalClaimCleared: number
        totalReturnStockByOB: number
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
          totalCashReceived: 0,
          totalCredit: 0,
          totalStockReturn: 0,
          totalOldRecovery: 0,
          totalClaimCleared: 0,
          totalReturnStockByOB: 0,
          entryCount: 0,
        })
      }
      const cData = companyMap.get(cId)!
      cData.totalSales += entry.summaryAmount ?? 0
      cData.totalCashReceived += entry.cashReceived ?? 0
      cData.totalCredit += entry.creditPosted ?? 0
      cData.totalStockReturn += entry.stockReturn ?? 0
      cData.totalOldRecovery += entry.oldRecovery ?? 0
      cData.totalClaimCleared += entry.claimCleared ?? 0
      cData.totalReturnStockByOB += entry.returnStockClaimByOB ?? 0
      cData.totalRecovery =
        cData.totalCashReceived +
        cData.totalOldRecovery +
        cData.totalClaimCleared +
        cData.totalReturnStockByOB
      cData.entryCount++
    }

    // Daily trend data
    const dailyMap = new Map<
      string,
      {
        date: string
        totalSales: number
        totalRecovery: number
        totalCashReceived: number
        totalCredit: number
        totalStockReturn: number
        totalOldRecovery: number
        totalClaimCleared: number
        totalReturnStockByOB: number
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
          totalCashReceived: 0,
          totalCredit: 0,
          totalStockReturn: 0,
          totalOldRecovery: 0,
          totalClaimCleared: 0,
          totalReturnStockByOB: 0,
          entryCount: 0,
        })
      }
      const dData = dailyMap.get(dateKey)!
      dData.totalSales += entry.summaryAmount ?? 0
      dData.totalCashReceived += entry.cashReceived ?? 0
      dData.totalCredit += entry.creditPosted ?? 0
      dData.totalStockReturn += entry.stockReturn ?? 0
      dData.totalOldRecovery += entry.oldRecovery ?? 0
      dData.totalClaimCleared += entry.claimCleared ?? 0
      dData.totalReturnStockByOB += entry.returnStockClaimByOB ?? 0
      dData.totalRecovery =
        dData.totalCashReceived +
        dData.totalOldRecovery +
        dData.totalClaimCleared +
        dData.totalReturnStockByOB
      dData.entryCount++
    }

    // Sort daily trend by date ascending
    const dailyTrend = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    // Calculate total opening and closing credit across all OBs
    const totalOpeningCredit = Array.from(obMap.values()).reduce(
      (sum, ob) => sum + ob.openingCredit,
      0
    )
    const totalClosingCredit = Array.from(obMap.values()).reduce(
      (sum, ob) => sum + ob.closingCredit,
      0
    )

    return NextResponse.json({
      summary: {
        totalSales,
        totalRecovery,
        totalCashReceived,
        totalCredit,
        totalStockReturn,
        totalOldRecovery,
        totalClaimCleared,
        totalReturnStockByOB,
        totalOpeningCredit,
        totalClosingCredit,
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
