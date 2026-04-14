import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * Calculate computed fields for a daily entry
 */
function calculateFields(data: {
  openingBalance: number
  summaryAmount: number
  stockReturn: number
  cashReceived: number
  oldRecovery: number
}) {
  const postedSummary = data.summaryAmount - data.stockReturn
  const creditPosted = postedSummary - data.cashReceived
  const closingBalance = data.openingBalance - data.oldRecovery + creditPosted

  return {
    postedSummary,
    creditPosted,
    closingBalance,
  }
}

/**
 * Get the opening balance for a given OB+Company before a date
 * by finding the most recent BalanceHistory closing balance
 */
async function getOpeningBalance(
  orderBookerId: string,
  companyId: string,
  date: Date
): Promise<number> {
  const latestBalance = await db.balanceHistory.findFirst({
    where: {
      orderBookerId,
      companyId,
      date: { lt: date },
    },
    orderBy: { date: 'desc' },
  })

  return latestBalance?.closingBalance ?? 0
}

/**
 * Cascade balance changes forward after an entry is created/updated/deleted
 * This recalculates opening and closing balances for all subsequent entries
 */
async function cascadeBalanceUpdates(
  orderBookerId: string,
  companyId: string,
  fromDate: Date
) {
  // Get all entries for this OB+Company on or after the given date, ordered by date
  const subsequentEntries = await db.dailyEntry.findMany({
    where: {
      orderBookerId,
      companyId,
      date: { gte: fromDate },
    },
    orderBy: { date: 'asc' },
  })

  // Process each entry sequentially
  for (let i = 0; i < subsequentEntries.length; i++) {
    const entry = subsequentEntries[i]

    // Get opening balance from the most recent balance history BEFORE this entry's date
    const openingBalance = await getOpeningBalance(
      orderBookerId,
      companyId,
      entry.date
    )

    const computed = calculateFields({
      openingBalance,
      summaryAmount: entry.summaryAmount,
      stockReturn: entry.stockReturn,
      cashReceived: entry.cashReceived,
      oldRecovery: entry.oldRecovery,
    })

    // Update the entry with new computed values
    await db.dailyEntry.update({
      where: { id: entry.id },
      data: {
        openingBalance,
        postedSummary: computed.postedSummary,
        creditPosted: computed.creditPosted,
        closingBalance: computed.closingBalance,
      },
    })

    // Upsert the balance history for this date+OB+Company
    await db.balanceHistory.upsert({
      where: {
        date_orderBookerId_companyId: {
          date: entry.date,
          orderBookerId,
          companyId,
        },
      },
      update: {
        closingBalance: computed.closingBalance,
      },
      create: {
        date: entry.date,
        orderBookerId,
        companyId,
        closingBalance: computed.closingBalance,
      },
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const orderBookerId = searchParams.get('orderBookerId')
    const companyId = searchParams.get('companyId')

    const where: Record<string, unknown> = {}

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      where.date = dateFilter
    }

    if (orderBookerId) {
      where.orderBookerId = orderBookerId
    }

    if (companyId) {
      where.companyId = companyId
    }

    const entries = await db.dailyEntry.findMany({
      where,
      orderBy: [{ date: 'desc' }, { orderBookerId: 'asc' }],
      include: {
        orderBooker: {
          select: { id: true, name: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        orderBookerId: entry.orderBookerId,
        orderBookerName: entry.orderBooker.name,
        companyId: entry.companyId,
        companyName: entry.company.name,
        openingBalance: entry.openingBalance,
        summaryAmount: entry.summaryAmount,
        stockReturn: entry.stockReturn,
        postedSummary: entry.postedSummary,
        cashReceived: entry.cashReceived,
        creditPosted: entry.creditPosted,
        oldRecovery: entry.oldRecovery,
        closingBalance: entry.closingBalance,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get entries error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      date,
      orderBookerId,
      companyId,
      summaryAmount = 0,
      stockReturn = 0,
      cashReceived = 0,
      oldRecovery = 0,
      notes,
    } = body

    if (!date || !orderBookerId || !companyId) {
      return NextResponse.json(
        { error: 'Date, order booker, and company are required' },
        { status: 400 }
      )
    }

    const entryDate = new Date(date)

    // Check for unique constraint violation
    const existingEntry = await db.dailyEntry.findUnique({
      where: {
        date_orderBookerId_companyId: {
          date: entryDate,
          orderBookerId,
          companyId,
        },
      },
    })

    if (existingEntry) {
      return NextResponse.json(
        {
          error:
            'An entry already exists for this date, order booker, and company combination',
        },
        { status: 409 }
      )
    }

    // Get opening balance from the most recent balance history
    const openingBalance = await getOpeningBalance(
      orderBookerId,
      companyId,
      entryDate
    )

    // Calculate computed fields
    const computed = calculateFields({
      openingBalance,
      summaryAmount,
      stockReturn,
      cashReceived,
      oldRecovery,
    })

    // Create the entry
    const entry = await db.dailyEntry.create({
      data: {
        date: entryDate,
        orderBookerId,
        companyId,
        openingBalance,
        summaryAmount,
        stockReturn,
        postedSummary: computed.postedSummary,
        cashReceived,
        creditPosted: computed.creditPosted,
        oldRecovery,
        closingBalance: computed.closingBalance,
        notes: notes || null,
      },
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    })

    // Upsert balance history for this date+OB+Company
    await db.balanceHistory.upsert({
      where: {
        date_orderBookerId_companyId: {
          date: entryDate,
          orderBookerId,
          companyId,
        },
      },
      update: {
        closingBalance: computed.closingBalance,
      },
      create: {
        date: entryDate,
        orderBookerId,
        companyId,
        closingBalance: computed.closingBalance,
      },
    })

    // Cascade balance updates for subsequent entries
    await cascadeBalanceUpdates(orderBookerId, companyId, entryDate)

    return NextResponse.json(
      {
        entry: {
          id: entry.id,
          date: entry.date,
          orderBookerId: entry.orderBookerId,
          orderBookerName: entry.orderBooker.name,
          companyId: entry.companyId,
          companyName: entry.company.name,
          openingBalance: entry.openingBalance,
          summaryAmount: entry.summaryAmount,
          stockReturn: entry.stockReturn,
          postedSummary: entry.postedSummary,
          cashReceived: entry.cashReceived,
          creditPosted: entry.creditPosted,
          oldRecovery: entry.oldRecovery,
          closingBalance: entry.closingBalance,
          notes: entry.notes,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create entry error:', error)
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    )
  }
}
