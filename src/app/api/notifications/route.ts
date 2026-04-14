import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const twoDaysAgo = new Date(now)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const notifications: Array<{
      id: string
      type: 'overdue' | 'high-outstanding' | 'low-recovery' | 'no-entries' | 'monthly-warning'
      severity: 'critical' | 'warning' | 'info'
      title: string
      message: string
      relatedOB?: string
      amount?: number
      timestamp: string
    }> = []

    // Get all entries with relations for analysis
    const allEntries = await db.dailyEntry.findMany({
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    })

    // Get current month entries
    const monthEntries = allEntries.filter((e) => new Date(e.date) >= startOfMonth)

    // --- 1. Overdue Balances: OBs with closing balance > 0 that haven't had entries in 3+ days ---
    const obLatestEntry = new Map<string, { name: string; latestDate: Date; totalClosingBalance: number }>()

    for (const entry of allEntries) {
      const obId = entry.orderBookerId
      if (!obLatestEntry.has(obId)) {
        obLatestEntry.set(obId, {
          name: entry.orderBooker.name,
          latestDate: new Date(entry.date),
          totalClosingBalance: 0,
        })
      }
      const obData = obLatestEntry.get(obId)!
      const entryDate = new Date(entry.date)
      if (entryDate > obData.latestDate) {
        obData.latestDate = entryDate
      }
    }

    // Calculate current outstanding per OB (latest closing balance per OB+Company)
    const obCompanyLatest = new Map<string, { obName: string; closingBalance: number }>()
    for (const entry of allEntries) {
      const key = `${entry.orderBookerId}_${entry.companyId}`
      if (!obCompanyLatest.has(key)) {
        obCompanyLatest.set(key, {
          obName: entry.orderBooker.name,
          closingBalance: entry.closingBalance,
        })
      }
      // Since sorted by date desc, first entry is the latest
    }

    // Sum closing balances per OB
    const obOutstandingByName = new Map<string, number>()
    for (const [, data] of obCompanyLatest) {
      const current = obOutstandingByName.get(data.obName) || 0
      obOutstandingByName.set(data.obName, current + data.closingBalance)
    }

    // Update obLatestEntry with total outstanding
    for (const [obId, data] of obLatestEntry) {
      data.totalClosingBalance = obOutstandingByName.get(data.name) || 0
    }

    for (const [obId, data] of obLatestEntry) {
      if (data.totalClosingBalance > 0 && data.latestDate < threeDaysAgo) {
        const daysSince = Math.floor((now.getTime() - data.latestDate.getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          id: `overdue-${obId}`,
          type: 'overdue',
          severity: 'critical',
          title: 'Overdue Balance',
          message: `${data.name} has PKR ${data.totalClosingBalance.toLocaleString()} outstanding with no entries in ${daysSince} days`,
          relatedOB: data.name,
          amount: data.totalClosingBalance,
          timestamp: now.toISOString(),
        })
      }
    }

    // --- 2. High Outstanding: Any OB+Company combination with outstanding > 50,000 PKR ---
    for (const [key, data] of obCompanyLatest) {
      if (data.closingBalance > 50000) {
        const obName = data.obName
        // Extract company name from the key - we need to look it up
        const matchingEntry = allEntries.find(
          (e) => `${e.orderBookerId}_${e.companyId}` === key
        )
        const companyName = matchingEntry?.company.name || 'Unknown'
        notifications.push({
          id: `high-outstanding-${key}`,
          type: 'high-outstanding',
          severity: 'warning',
          title: 'High Outstanding',
          message: `${obName} - ${companyName}: PKR ${data.closingBalance.toLocaleString()} outstanding exceeds threshold`,
          relatedOB: obName,
          amount: data.closingBalance,
          timestamp: now.toISOString(),
        })
      }
    }

    // --- 3. Low Recovery Rate: OBs with overall recovery rate < 40% ---
    const obStats = new Map<string, { name: string; totalSales: number; totalRecovery: number }>()
    for (const entry of allEntries) {
      const obId = entry.orderBookerId
      if (!obStats.has(obId)) {
        obStats.set(obId, {
          name: entry.orderBooker.name,
          totalSales: 0,
          totalRecovery: 0,
        })
      }
      const stats = obStats.get(obId)!
      stats.totalSales += entry.summaryAmount
      stats.totalRecovery += entry.cashReceived
    }

    for (const [obId, stats] of obStats) {
      if (stats.totalSales > 0) {
        const recoveryRate = (stats.totalRecovery / stats.totalSales) * 100
        if (recoveryRate < 40) {
          notifications.push({
            id: `low-recovery-${obId}`,
            type: 'low-recovery',
            severity: 'critical',
            title: 'Low Recovery Rate',
            message: `${stats.name}: Recovery rate is ${recoveryRate.toFixed(1)}% (below 40% threshold). Total Sales: PKR ${stats.totalSales.toLocaleString()}, Recovery: PKR ${stats.totalRecovery.toLocaleString()}`,
            relatedOB: stats.name,
            amount: recoveryRate,
            timestamp: now.toISOString(),
          })
        }
      }
    }

    // --- 4. No Recent Entries: OBs that haven't submitted entries in the last 2 days ---
    for (const [obId, data] of obLatestEntry) {
      if (data.latestDate < twoDaysAgo) {
        const daysSince = Math.floor((now.getTime() - data.latestDate.getTime()) / (1000 * 60 * 60 * 24))
        // Skip if already flagged as overdue (avoid duplicate)
        if (daysSince < 3) {
          notifications.push({
            id: `no-entries-${obId}`,
            type: 'no-entries',
            severity: 'warning',
            title: 'No Recent Entries',
            message: `${data.name} hasn't submitted entries in ${daysSince} day${daysSince !== 1 ? 's' : ''}`,
            relatedOB: data.name,
            timestamp: now.toISOString(),
          })
        }
      }
    }

    // --- 5. Monthly Target: If current month recovery rate is below 60%, flag as warning ---
    if (monthEntries.length > 0) {
      const monthTotalSales = monthEntries.reduce((sum, e) => sum + e.summaryAmount, 0)
      const monthTotalRecovery = monthEntries.reduce((sum, e) => sum + e.cashReceived, 0)

      if (monthTotalSales > 0) {
        const monthRecoveryRate = (monthTotalRecovery / monthTotalSales) * 100
        if (monthRecoveryRate < 60) {
          const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })
          notifications.push({
            id: 'monthly-warning-current',
            type: 'monthly-warning',
            severity: 'warning',
            title: 'Monthly Target Warning',
            message: `${monthName} recovery rate is ${monthRecoveryRate.toFixed(1)}% (below 60% target). Sales: PKR ${monthTotalSales.toLocaleString()}, Recovery: PKR ${monthTotalRecovery.toLocaleString()}`,
            amount: monthRecoveryRate,
            timestamp: now.toISOString(),
          })
        }
      }
    }

    // Sort notifications: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    })
  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
