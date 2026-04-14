import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sixtyDaysAgo = new Date(now)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // Get all active order bookers
    const orderBookers = await db.orderBooker.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    })

    // Get all active companies
    const companies = await db.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' },
    })

    // Get all entries ordered by date for each OB+Company combination
    const entries = await db.dailyEntry.findMany({
      orderBy: { date: 'desc' },
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, category: true } },
      },
    })

    // Build a map of OB+Company -> latest closing balance and aging data
    const balanceMap = new Map<
      string,
      {
        orderBookerId: string
        orderBookerName: string
        orderBookerPhone: string | null
        companyId: string
        companyName: string
        companyCategory: string | null
        closingBalance: number
        lastEntryDate: Date
        aging: {
          current: number // 0-30 days
          thirtyToSixty: number // 30-60 days
          sixtyToNinety: number // 60-90 days
          overNinety: number // 90+ days
        }
      }
    >()

    // Group entries by OB+Company
    const obCompanyEntries = new Map<string, typeof entries>()

    for (const entry of entries) {
      const key = `${entry.orderBookerId}_${entry.companyId}`
      if (!obCompanyEntries.has(key)) {
        obCompanyEntries.set(key, [])
      }
      obCompanyEntries.get(key)!.push(entry)
    }

    // Calculate balances and aging for each OB+Company combination
    for (const [key, groupEntries] of obCompanyEntries) {
      const latest = groupEntries[0] // already sorted by date desc
      const closingBalance = latest.closingBalance

      // Only include if there's an outstanding balance
      if (closingBalance <= 0) continue

      // Calculate aging based on credit posted in different time periods
      let current = 0
      let thirtyToSixty = 0
      let sixtyToNinety = 0
      let overNinety = 0

      for (const e of groupEntries) {
        if (e.creditPosted > 0) {
          const entryDate = new Date(e.date)
          if (entryDate >= thirtyDaysAgo) {
            current += e.creditPosted
          } else if (entryDate >= sixtyDaysAgo) {
            thirtyToSixty += e.creditPosted
          } else if (entryDate >= ninetyDaysAgo) {
            sixtyToNinety += e.creditPosted
          } else {
            overNinety += e.creditPosted
          }
        }
      }

      balanceMap.set(key, {
        orderBookerId: latest.orderBookerId,
        orderBookerName: latest.orderBooker.name,
        orderBookerPhone: latest.orderBooker.phone || null,
        companyId: latest.companyId,
        companyName: latest.company.name,
        companyCategory: latest.company.category || null,
        closingBalance,
        lastEntryDate: latest.date,
        aging: { current, thirtyToSixty, sixtyToNinety, overNinety },
      })
    }

    // Group by Order Booker
    const obBalanceMap = new Map<
      string,
      {
        orderBookerId: string
        orderBookerName: string
        phone: string | null
        companyBalances: Array<{
          companyId: string
          companyName: string
          category: string | null
          outstanding: number
          lastEntryDate: string | null
          aging: { current: number; thirtyToSixty: number; sixtyToNinety: number; overNinety: number }
        }>
        totalOutstanding: number
        aging: { current: number; thirtyToSixty: number; sixtyToNinety: number; overNinety: number }
      }
    >()

    let overallTotal = 0
    let overallCurrent = 0
    let overall30to60 = 0
    let overall60to90 = 0
    let overallOver90 = 0

    for (const [, balance] of balanceMap) {
      const obId = balance.orderBookerId
      if (!obBalanceMap.has(obId)) {
        obBalanceMap.set(obId, {
          orderBookerId: obId,
          orderBookerName: balance.orderBookerName,
          phone: balance.orderBookerPhone,
          companyBalances: [],
          totalOutstanding: 0,
          aging: { current: 0, thirtyToSixty: 0, sixtyToNinety: 0, overNinety: 0 },
        })
      }

      const obData = obBalanceMap.get(obId)!
      obData.companyBalances.push({
        companyId: balance.companyId,
        companyName: balance.companyName,
        category: balance.companyCategory,
        outstanding: balance.closingBalance,
        lastEntryDate: balance.lastEntryDate.toISOString(),
        aging: balance.aging,
      })
      obData.totalOutstanding += balance.closingBalance
      obData.aging.current += balance.aging.current
      obData.aging.thirtyToSixty += balance.aging.thirtyToSixty
      obData.aging.sixtyToNinety += balance.aging.sixtyToNinety
      obData.aging.overNinety += balance.aging.overNinety

      overallTotal += balance.closingBalance
      overallCurrent += balance.aging.current
      overall30to60 += balance.aging.thirtyToSixty
      overall60to90 += balance.aging.sixtyToNinety
      overallOver90 += balance.aging.overNinety
    }

    // Sort OBs by total outstanding (highest first)
    const obBalances = Array.from(obBalanceMap.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding
    )

    return NextResponse.json({
      obBalances,
      overallTotal,
      overallAging: {
        current: overallCurrent,
        thirtyToSixty: overall30to60,
        sixtyToNinety: overall60to90,
        overNinety: overallOver90,
      },
      orderBookers: orderBookers.map((ob) => ({ id: ob.id, name: ob.name })),
      companies: companies.map((co) => ({ id: co.id, name: co.name })),
    })
  } catch (error) {
    console.error('Balances error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    )
  }
}
