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
    const reportType = searchParams.get('type')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo)

    const baseWhere: Record<string, unknown> = {}
    if (dateFrom || dateTo) {
      baseWhere.date = dateFilter
    }

    if (reportType === 'ob-analysis') {
      return await handleOBAnalysis(searchParams, baseWhere)
    } else if (reportType === 'company-analysis') {
      return await handleCompanyAnalysis(searchParams, baseWhere)
    } else if (reportType === 'trend') {
      return await handleTrendAnalysis(baseWhere)
    } else {
      return NextResponse.json(
        { error: 'Invalid report type. Use: ob-analysis, company-analysis, or trend' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

async function handleOBAnalysis(
  searchParams: URLSearchParams,
  baseWhere: Record<string, unknown>
) {
  const orderBookerId = searchParams.get('orderBookerId')
  if (!orderBookerId) {
    return NextResponse.json(
      { error: 'orderBookerId is required for ob-analysis' },
      { status: 400 }
    )
  }

  const ob = await db.orderBooker.findUnique({
    where: { id: orderBookerId },
  })

  if (!ob) {
    return NextResponse.json(
      { error: 'Order booker not found' },
      { status: 404 }
    )
  }

  // Get all entries for this OB
  const entries = await db.dailyEntry.findMany({
    where: { ...baseWhere, orderBookerId },
    include: {
      company: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  // Overall stats
  const totalSales = entries.reduce((s, e) => s + e.summaryAmount, 0)
  const totalRecovery = entries.reduce((s, e) => s + e.cashReceived, 0)
  const totalCredit = entries.reduce((s, e) => s + e.creditPosted, 0)
  const totalStockReturn = entries.reduce((s, e) => s + e.stockReturn, 0)
  const totalOldRecovery = entries.reduce((s, e) => s + e.oldRecovery, 0)
  const recoveryRate = totalSales > 0 ? (totalRecovery / totalSales) * 100 : 0

  // Per-company breakdown
  const companyMap = new Map<
    string,
    {
      companyId: string
      companyName: string
      totalSales: number
      totalRecovery: number
      totalCredit: number
      totalStockReturn: number
      entryCount: number
      currentBalance: number
    }
  >()

  for (const entry of entries) {
    const cId = entry.companyId
    if (!companyMap.has(cId)) {
      companyMap.set(cId, {
        companyId: cId,
        companyName: entry.company.name,
        totalSales: 0,
        totalRecovery: 0,
        totalCredit: 0,
        totalStockReturn: 0,
        entryCount: 0,
        currentBalance: entry.closingBalance, // First (latest) entry's closing balance
      })
    }
    const cData = companyMap.get(cId)!
    cData.totalSales += entry.summaryAmount
    cData.totalRecovery += entry.cashReceived
    cData.totalCredit += entry.creditPosted
    cData.totalStockReturn += entry.stockReturn
    cData.entryCount++
  }

  // Daily performance
  const dailyMap = new Map<
    string,
    {
      date: string
      totalSales: number
      totalRecovery: number
      totalCredit: number
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
      })
    }
    const dData = dailyMap.get(dateKey)!
    dData.totalSales += entry.summaryAmount
    dData.totalRecovery += entry.cashReceived
    dData.totalCredit += entry.creditPosted
  }

  // Get current outstanding balance (latest balance for each company)
  const currentBalances = await db.balanceHistory.findMany({
    where: { orderBookerId },
    orderBy: { date: 'desc' },
    include: { company: { select: { name: true } } },
  })

  const latestBalances = new Map<string, { companyName: string; balance: number }>()
  for (const bh of currentBalances) {
    if (!latestBalances.has(bh.companyId)) {
      latestBalances.set(bh.companyId, {
        companyName: bh.company.name,
        balance: bh.closingBalance,
      })
    }
  }

  return NextResponse.json({
    orderBooker: { id: ob.id, name: ob.name, phone: ob.phone },
    stats: {
      totalSales,
      totalRecovery,
      totalCredit,
      totalStockReturn,
      totalOldRecovery,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      entryCount: entries.length,
    },
    companyBreakdown: Array.from(companyMap.values()),
    dailyPerformance: Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    currentBalances: Array.from(latestBalances.entries()).map(
      ([companyId, data]) => ({
        companyId,
        companyName: data.companyName,
        balance: data.balance,
      })
    ),
  })
}

async function handleCompanyAnalysis(
  searchParams: URLSearchParams,
  baseWhere: Record<string, unknown>
) {
  const companyId = searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json(
      { error: 'companyId is required for company-analysis' },
      { status: 400 }
    )
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
  })

  if (!company) {
    return NextResponse.json(
      { error: 'Company not found' },
      { status: 404 }
    )
  }

  // Get all entries for this company
  const entries = await db.dailyEntry.findMany({
    where: { ...baseWhere, companyId },
    include: {
      orderBooker: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  // Overall stats
  const totalSales = entries.reduce((s, e) => s + e.summaryAmount, 0)
  const totalRecovery = entries.reduce((s, e) => s + e.cashReceived, 0)
  const totalCredit = entries.reduce((s, e) => s + e.creditPosted, 0)
  const totalStockReturn = entries.reduce((s, e) => s + e.stockReturn, 0)
  const totalOldRecovery = entries.reduce((s, e) => s + e.oldRecovery, 0)
  const recoveryRate = totalSales > 0 ? (totalRecovery / totalSales) * 100 : 0

  // Per-OB breakdown
  const obMap = new Map<
    string,
    {
      orderBookerId: string
      orderBookerName: string
      totalSales: number
      totalRecovery: number
      totalCredit: number
      totalStockReturn: number
      entryCount: number
      currentBalance: number
    }
  >()

  for (const entry of entries) {
    const obId = entry.orderBookerId
    if (!obMap.has(obId)) {
      obMap.set(obId, {
        orderBookerId: obId,
        orderBookerName: entry.orderBooker.name,
        totalSales: entry.summaryAmount,
        totalRecovery: entry.cashReceived,
        totalCredit: entry.creditPosted,
        totalStockReturn: entry.stockReturn,
        entryCount: 1,
        currentBalance: entry.closingBalance, // First (latest) entry's closing balance
      })
    } else {
      const obData = obMap.get(obId)!
      obData.totalSales += entry.summaryAmount
      obData.totalRecovery += entry.cashReceived
      obData.totalCredit += entry.creditPosted
      obData.totalStockReturn += entry.stockReturn
      obData.entryCount++
    }
  }

  // Daily trend
  const dailyMap = new Map<
    string,
    {
      date: string
      totalSales: number
      totalRecovery: number
      totalCredit: number
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
      })
    }
    const dData = dailyMap.get(dateKey)!
    dData.totalSales += entry.summaryAmount
    dData.totalRecovery += entry.cashReceived
    dData.totalCredit += entry.creditPosted
  }

  // Current outstanding per OB
  const currentBalances = await db.balanceHistory.findMany({
    where: { companyId },
    orderBy: { date: 'desc' },
    include: { orderBooker: { select: { name: true } } },
  })

  const latestBalances = new Map<string, { orderBookerName: string; balance: number }>()
  for (const bh of currentBalances) {
    if (!latestBalances.has(bh.orderBookerId)) {
      latestBalances.set(bh.orderBookerId, {
        orderBookerName: bh.orderBooker.name,
        balance: bh.closingBalance,
      })
    }
  }

  return NextResponse.json({
    company: { id: company.id, name: company.name, category: company.category },
    stats: {
      totalSales,
      totalRecovery,
      totalCredit,
      totalStockReturn,
      totalOldRecovery,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      entryCount: entries.length,
    },
    orderBookerBreakdown: Array.from(obMap.values()),
    dailyTrend: Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    currentBalances: Array.from(latestBalances.entries()).map(
      ([obId, data]) => ({
        orderBookerId: obId,
        orderBookerName: data.orderBookerName,
        balance: data.balance,
      })
    ),
  })
}

async function handleTrendAnalysis(baseWhere: Record<string, unknown>) {
  const entries = await db.dailyEntry.findMany({
    where: baseWhere,
    include: {
      orderBooker: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  })

  // Daily aggregated trend
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

  const dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  // Risk indicators
  const totalSales = entries.reduce((s, e) => s + e.summaryAmount, 0)
  const totalRecovery = entries.reduce((s, e) => s + e.cashReceived, 0)
  const totalCredit = entries.reduce((s, e) => s + e.creditPosted, 0)
  const overallRecoveryRate =
    totalSales > 0 ? (totalRecovery / totalSales) * 100 : 0

  // OB risk analysis - OBs with high outstanding credit
  const obRiskMap = new Map<
    string,
    {
      orderBookerId: string
      orderBookerName: string
      totalSales: number
      totalRecovery: number
      totalCredit: number
      recoveryRate: number
      riskLevel: 'low' | 'medium' | 'high'
    }
  >()

  for (const entry of entries) {
    const obId = entry.orderBookerId
    if (!obRiskMap.has(obId)) {
      obRiskMap.set(obId, {
        orderBookerId: obId,
        orderBookerName: entry.orderBooker.name,
        totalSales: 0,
        totalRecovery: 0,
        totalCredit: 0,
        recoveryRate: 0,
        riskLevel: 'low',
      })
    }
    const obData = obRiskMap.get(obId)!
    obData.totalSales += entry.summaryAmount
    obData.totalRecovery += entry.cashReceived
    obData.totalCredit += entry.creditPosted
  }

  const obRiskAnalysis = Array.from(obRiskMap.values()).map((ob) => {
    const rate = ob.totalSales > 0 ? (ob.totalRecovery / ob.totalSales) * 100 : 0
    ob.recoveryRate = Math.round(rate * 100) / 100
    ob.riskLevel =
      rate < 40 ? 'high' : rate < 70 ? 'medium' : 'low'
    return ob
  })

  // Company risk analysis
  const companyRiskMap = new Map<
    string,
    {
      companyId: string
      companyName: string
      totalSales: number
      totalRecovery: number
      totalCredit: number
      recoveryRate: number
      riskLevel: 'low' | 'medium' | 'high'
    }
  >()

  for (const entry of entries) {
    const cId = entry.companyId
    if (!companyRiskMap.has(cId)) {
      companyRiskMap.set(cId, {
        companyId: cId,
        companyName: entry.company.name,
        totalSales: 0,
        totalRecovery: 0,
        totalCredit: 0,
        recoveryRate: 0,
        riskLevel: 'low',
      })
    }
    const cData = companyRiskMap.get(cId)!
    cData.totalSales += entry.summaryAmount
    cData.totalRecovery += entry.cashReceived
    cData.totalCredit += entry.creditPosted
  }

  const companyRiskAnalysis = Array.from(companyRiskMap.values()).map((c) => {
    const rate = c.totalSales > 0 ? (c.totalRecovery / c.totalSales) * 100 : 0
    c.recoveryRate = Math.round(rate * 100) / 100
    c.riskLevel =
      rate < 40 ? 'high' : rate < 70 ? 'medium' : 'low'
    return c
  })

  return NextResponse.json({
    overallStats: {
      totalSales,
      totalRecovery,
      totalCredit,
      overallRecoveryRate: Math.round(overallRecoveryRate * 100) / 100,
      entryCount: entries.length,
    },
    dailyTrend,
    obRiskAnalysis: obRiskAnalysis.sort((a, b) => a.recoveryRate - b.recoveryRate),
    companyRiskAnalysis: companyRiskAnalysis.sort(
      (a, b) => a.recoveryRate - b.recoveryRate
    ),
  })
}
