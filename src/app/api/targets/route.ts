import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/targets - List all sales targets with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderBookerId = searchParams.get('orderBookerId')
    const companyId = searchParams.get('companyId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const includeAchievement = searchParams.get('includeAchievement') === 'true'

    const where: any = {}
    if (orderBookerId) where.orderBookerId = orderBookerId
    if (companyId) where.companyId = companyId
    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)

    const targets = await db.salesTarget.findMany({
      where,
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, category: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    // If achievement calculation is requested
    if (includeAchievement) {
      const targetsWithAchievement = await Promise.all(
        targets.map(async (target) => {
          // Calculate actual sales for this OB + Company + Month
          const startDate = new Date(target.year, target.month - 1, 1)
          const endDate = new Date(target.year, target.month, 0, 23, 59, 59) // Last day of month

          const entries = await db.dailyEntry.findMany({
            where: {
              orderBookerId: target.orderBookerId,
              companyId: target.companyId,
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          })

          const achievedValue = entries.reduce((sum, e) => sum + (e.summaryAmount || 0), 0)
          const achievedCash = entries.reduce((sum, e) => sum + (e.cashReceived || 0), 0)
          const achievedCredit = entries.reduce((sum, e) => sum + (e.creditPosted || 0), 0)
          const totalRecovery = entries.reduce((sum, e) => sum + (e.totalRecovery || 0), 0)

          // Value achievement percentage
          const valueAchievementPct = target.targetValue > 0
            ? Math.round((achievedValue / target.targetValue) * 100)
            : 0

          // CTNs achievement - we use summaryAmount as proxy since DailyEntry doesn't have ctns field
          // In a real CBL system, these would be separate tracked fields
          const ctnsAchievementPct = target.targetCtns > 0
            ? Math.round((achievedValue / target.targetValue) * 100)
            : 0

          // Tonnage achievement
          const tonnageAchievementPct = target.targetTonnage > 0
            ? Math.round((achievedValue / target.targetValue) * 100)
            : 0

          return {
            ...target,
            achievement: {
              achievedValue,
              achievedCash,
              achievedCredit,
              totalRecovery,
              valueAchievementPct,
              ctnsAchievementPct,
              tonnageAchievementPct,
              daysWorked: entries.length,
            },
          }
        })
      )

      return NextResponse.json({ targets: targetsWithAchievement })
    }

    return NextResponse.json({ targets })
  } catch (error) {
    console.error('Error fetching targets:', error)
    return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 })
  }
}

// POST /api/targets - Create or update a sales target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderBookerId, companyId, month, year, targetCtns, targetTonnage, targetValue, notes } = body

    if (!orderBookerId || !companyId || !month || !year) {
      return NextResponse.json(
        { error: 'orderBookerId, companyId, month, and year are required' },
        { status: 400 }
      )
    }

    const target = await db.salesTarget.upsert({
      where: {
        orderBookerId_companyId_month_year: {
          orderBookerId,
          companyId,
          month: parseInt(String(month)),
          year: parseInt(String(year)),
        },
      },
      create: {
        orderBookerId,
        companyId,
        month: parseInt(String(month)),
        year: parseInt(String(year)),
        targetCtns: parseFloat(String(targetCtns || 0)),
        targetTonnage: parseFloat(String(targetTonnage || 0)),
        targetValue: parseFloat(String(targetValue || 0)),
        notes: notes || null,
      },
      update: {
        targetCtns: parseFloat(String(targetCtns || 0)),
        targetTonnage: parseFloat(String(targetTonnage || 0)),
        targetValue: parseFloat(String(targetValue || 0)),
        notes: notes || null,
      },
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, category: true } },
      },
    })

    return NextResponse.json({ target })
  } catch (error) {
    console.error('Error creating/updating target:', error)
    return NextResponse.json({ error: 'Failed to save target' }, { status: 500 })
  }
}

// PUT /api/targets - Bulk create/update targets
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { targets } = body

    if (!Array.isArray(targets)) {
      return NextResponse.json({ error: 'targets array is required' }, { status: 400 })
    }

    const results = []
    for (const t of targets) {
      const { orderBookerId, companyId, month, year, targetCtns, targetTonnage, targetValue, notes } = t
      if (!orderBookerId || !companyId || !month || !year) continue

      const result = await db.salesTarget.upsert({
        where: {
          orderBookerId_companyId_month_year: {
            orderBookerId,
            companyId,
            month: parseInt(String(month)),
            year: parseInt(String(year)),
          },
        },
        create: {
          orderBookerId,
          companyId,
          month: parseInt(String(month)),
          year: parseInt(String(year)),
          targetCtns: parseFloat(String(targetCtns || 0)),
          targetTonnage: parseFloat(String(targetTonnage || 0)),
          targetValue: parseFloat(String(targetValue || 0)),
          notes: notes || null,
        },
        update: {
          targetCtns: parseFloat(String(targetCtns || 0)),
          targetTonnage: parseFloat(String(targetTonnage || 0)),
          targetValue: parseFloat(String(targetValue || 0)),
          notes: notes || null,
        },
      })
      results.push(result)
    }

    return NextResponse.json({ saved: results.length, targets: results })
  } catch (error) {
    console.error('Error bulk saving targets:', error)
    return NextResponse.json({ error: 'Failed to save targets' }, { status: 500 })
  }
}

// DELETE /api/targets?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await db.salesTarget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting target:', error)
    return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 })
  }
}
