import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * Calculate computed fields for a daily entry
 * 
 * FORMULA:
 * - Credit Posted = Summary Amount - Stock Return - Cash Received
 * - Total Recovery = Cash Received + Old Recovery + Claim Cleared + Return Stock/Claim by OB
 * - Closing Balance = Opening Balance - Old Recovery - Claim Cleared - Return Stock/Claim by OB + Credit Posted
 */
function calculateFields(data: {
  openingBalance: number
  summaryAmount: number
  stockReturn: number
  cashReceived: number
  claimCleared: number
  oldRecovery: number
  returnStockClaimByOB: number
}) {
  const postedSummary = data.summaryAmount - data.stockReturn
  const creditPosted = postedSummary - data.cashReceived
  const totalRecovery = data.cashReceived + data.oldRecovery + data.claimCleared + data.returnStockClaimByOB
  const closingBalance = data.openingBalance - data.oldRecovery - data.claimCleared - data.returnStockClaimByOB + creditPosted

  return {
    postedSummary,
    creditPosted,
    totalRecovery,
    closingBalance,
  }
}

/**
 * Get the opening balance for a given OB+Company before a date
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
 */
async function cascadeBalanceUpdates(
  orderBookerId: string,
  companyId: string,
  fromDate: Date
) {
  const subsequentEntries = await db.dailyEntry.findMany({
    where: {
      orderBookerId,
      companyId,
      date: { gte: fromDate },
    },
    orderBy: { date: 'asc' },
  })

  for (const entry of subsequentEntries) {
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
      claimCleared: entry.claimCleared,
      oldRecovery: entry.oldRecovery,
      returnStockClaimByOB: entry.returnStockClaimByOB,
    })

    await db.dailyEntry.update({
      where: { id: entry.id },
      data: {
        openingBalance,
        postedSummary: computed.postedSummary,
        creditPosted: computed.creditPosted,
        totalRecovery: computed.totalRecovery,
        closingBalance: computed.closingBalance,
      },
    })

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const entry = await db.dailyEntry.findUnique({
      where: { id },
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
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
        claimCleared: entry.claimCleared,
        oldRecovery: entry.oldRecovery,
        returnStockClaimByOB: entry.returnStockClaimByOB,
        totalRecovery: entry.totalRecovery,
        closingBalance: entry.closingBalance,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get entry error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entry' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await db.dailyEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    // Merge existing data with updates
    const updatedData = {
      date: body.date ? new Date(body.date) : existing.date,
      orderBookerId: body.orderBookerId ?? existing.orderBookerId,
      companyId: body.companyId ?? existing.companyId,
      summaryAmount: body.summaryAmount ?? existing.summaryAmount,
      stockReturn: body.stockReturn ?? existing.stockReturn,
      cashReceived: body.cashReceived ?? existing.cashReceived,
      claimCleared: body.claimCleared ?? existing.claimCleared,
      oldRecovery: body.oldRecovery ?? existing.oldRecovery,
      returnStockClaimByOB: body.returnStockClaimByOB ?? existing.returnStockClaimByOB,
      notes: body.notes !== undefined ? body.notes || null : existing.notes,
    }

    // Get opening balance - if date/OB/Company changed, recalculate
    const openingBalance = await getOpeningBalance(
      updatedData.orderBookerId,
      updatedData.companyId,
      updatedData.date
    )

    // Calculate computed fields with new formula
    const computed = calculateFields({
      openingBalance,
      summaryAmount: updatedData.summaryAmount,
      stockReturn: updatedData.stockReturn,
      cashReceived: updatedData.cashReceived,
      claimCleared: updatedData.claimCleared,
      oldRecovery: updatedData.oldRecovery,
      returnStockClaimByOB: updatedData.returnStockClaimByOB,
    })

    // If the date, OB, or company changed, we need to handle the old entry's balance history
    const keyChanged =
      existing.date.getTime() !== updatedData.date.getTime() ||
      existing.orderBookerId !== updatedData.orderBookerId ||
      existing.companyId !== updatedData.companyId

    if (keyChanged) {
      // Delete old balance history for old combination
      await db.balanceHistory.deleteMany({
        where: {
          date: existing.date,
          orderBookerId: existing.orderBookerId,
          companyId: existing.companyId,
        },
      })

      // Cascade updates for the OLD combination from the old date forward
      const oldSubsequentEntries = await db.dailyEntry.findMany({
        where: {
          orderBookerId: existing.orderBookerId,
          companyId: existing.companyId,
          date: { gte: existing.date },
          id: { not: id },
        },
        orderBy: { date: 'asc' },
      })

      for (const entry of oldSubsequentEntries) {
        const ob = await getOpeningBalance(
          entry.orderBookerId,
          entry.companyId,
          entry.date
        )
        const c = calculateFields({
          openingBalance: ob,
          summaryAmount: entry.summaryAmount,
          stockReturn: entry.stockReturn,
          cashReceived: entry.cashReceived,
          claimCleared: entry.claimCleared,
          oldRecovery: entry.oldRecovery,
          returnStockClaimByOB: entry.returnStockClaimByOB,
        })

        await db.dailyEntry.update({
          where: { id: entry.id },
          data: {
            openingBalance: ob,
            postedSummary: c.postedSummary,
            creditPosted: c.creditPosted,
            totalRecovery: c.totalRecovery,
            closingBalance: c.closingBalance,
          },
        })

        await db.balanceHistory.upsert({
          where: {
            date_orderBookerId_companyId: {
              date: entry.date,
              orderBookerId: entry.orderBookerId,
              companyId: entry.companyId,
            },
          },
          update: { closingBalance: c.closingBalance },
          create: {
            date: entry.date,
            orderBookerId: entry.orderBookerId,
            companyId: entry.companyId,
            closingBalance: c.closingBalance,
          },
        })
      }
    }

    // Update the entry
    const entry = await db.dailyEntry.update({
      where: { id },
      data: {
        date: updatedData.date,
        orderBookerId: updatedData.orderBookerId,
        companyId: updatedData.companyId,
        openingBalance,
        summaryAmount: updatedData.summaryAmount,
        stockReturn: updatedData.stockReturn,
        postedSummary: computed.postedSummary,
        cashReceived: updatedData.cashReceived,
        creditPosted: computed.creditPosted,
        claimCleared: updatedData.claimCleared,
        oldRecovery: updatedData.oldRecovery,
        returnStockClaimByOB: updatedData.returnStockClaimByOB,
        totalRecovery: computed.totalRecovery,
        closingBalance: computed.closingBalance,
        notes: updatedData.notes,
      },
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    })

    // Upsert balance history
    await db.balanceHistory.upsert({
      where: {
        date_orderBookerId_companyId: {
          date: updatedData.date,
          orderBookerId: updatedData.orderBookerId,
          companyId: updatedData.companyId,
        },
      },
      update: { closingBalance: computed.closingBalance },
      create: {
        date: updatedData.date,
        orderBookerId: updatedData.orderBookerId,
        companyId: updatedData.companyId,
        closingBalance: computed.closingBalance,
      },
    })

    // Cascade balance updates for the new combination
    await cascadeBalanceUpdates(
      updatedData.orderBookerId,
      updatedData.companyId,
      updatedData.date
    )

    return NextResponse.json({
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
        claimCleared: entry.claimCleared,
        oldRecovery: entry.oldRecovery,
        returnStockClaimByOB: entry.returnStockClaimByOB,
        totalRecovery: entry.totalRecovery,
        closingBalance: entry.closingBalance,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update entry error:', error)
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.dailyEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    const { orderBookerId, companyId, date } = existing

    // Delete the entry
    await db.dailyEntry.delete({ where: { id } })

    // Delete balance history for this date+OB+Company combo
    await db.balanceHistory.deleteMany({
      where: {
        date,
        orderBookerId,
        companyId,
      },
    })

    // Cascade updates for subsequent entries
    const subsequentEntries = await db.dailyEntry.findMany({
      where: {
        orderBookerId,
        companyId,
        date: { gte: date },
      },
      orderBy: { date: 'asc' },
    })

    for (const entry of subsequentEntries) {
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
        claimCleared: entry.claimCleared,
        oldRecovery: entry.oldRecovery,
        returnStockClaimByOB: entry.returnStockClaimByOB,
      })

      await db.dailyEntry.update({
        where: { id: entry.id },
        data: {
          openingBalance,
          postedSummary: computed.postedSummary,
          creditPosted: computed.creditPosted,
          totalRecovery: computed.totalRecovery,
          closingBalance: computed.closingBalance,
        },
      })

      await db.balanceHistory.upsert({
        where: {
          date_orderBookerId_companyId: {
            date: entry.date,
            orderBookerId,
            companyId,
          },
        },
        update: { closingBalance: computed.closingBalance },
        create: {
          date: entry.date,
          orderBookerId,
          companyId,
          closingBalance: computed.closingBalance,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete entry error:', error)
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    )
  }
}
