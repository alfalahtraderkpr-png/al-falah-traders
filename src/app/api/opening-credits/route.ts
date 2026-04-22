import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/opening-credits - List all opening credits with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderBookerId = searchParams.get('orderBookerId')
    const companyId = searchParams.get('companyId')
    const date = searchParams.get('date')

    const where: any = {}
    if (orderBookerId) where.orderBookerId = orderBookerId
    if (companyId) where.companyId = companyId
    if (date) where.date = new Date(date)

    const openingCredits = await db.openingCredit.findMany({
      where,
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, category: true } },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ openingCredits })
  } catch (error) {
    console.error('Error fetching opening credits:', error)
    return NextResponse.json({ error: 'Failed to fetch opening credits' }, { status: 500 })
  }
}

// POST /api/opening-credits - Create or update an opening credit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderBookerId, companyId, amount, date, notes } = body

    if (!orderBookerId || !companyId || amount === undefined || !date) {
      return NextResponse.json(
        { error: 'orderBookerId, companyId, amount, and date are required' },
        { status: 400 }
      )
    }

    // Upsert: create or update based on unique constraint
    const openingCredit = await db.openingCredit.upsert({
      where: {
        orderBookerId_companyId_date: {
          orderBookerId,
          companyId,
          date: new Date(date),
        },
      },
      create: {
        orderBookerId,
        companyId,
        amount: parseFloat(String(amount)),
        date: new Date(date),
        notes: notes || null,
      },
      update: {
        amount: parseFloat(String(amount)),
        notes: notes || null,
      },
      include: {
        orderBooker: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, category: true } },
      },
    })

    return NextResponse.json({ openingCredit })
  } catch (error) {
    console.error('Error creating/updating opening credit:', error)
    return NextResponse.json({ error: 'Failed to save opening credit' }, { status: 500 })
  }
}

// PUT /api/opening-credits - Bulk create/update opening credits
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { credits } = body // Array of { orderBookerId, companyId, amount, date, notes }

    if (!Array.isArray(credits)) {
      return NextResponse.json({ error: 'credits array is required' }, { status: 400 })
    }

    const results = []
    for (const credit of credits) {
      const { orderBookerId, companyId, amount, date, notes } = credit
      if (!orderBookerId || !companyId || amount === undefined || !date) continue

      const result = await db.openingCredit.upsert({
        where: {
          orderBookerId_companyId_date: {
            orderBookerId,
            companyId,
            date: new Date(date),
          },
        },
        create: {
          orderBookerId,
          companyId,
          amount: parseFloat(String(amount)),
          date: new Date(date),
          notes: notes || null,
        },
        update: {
          amount: parseFloat(String(amount)),
          notes: notes || null,
        },
      })
      results.push(result)
    }

    return NextResponse.json({ saved: results.length, openingCredits: results })
  } catch (error) {
    console.error('Error bulk saving opening credits:', error)
    return NextResponse.json({ error: 'Failed to save opening credits' }, { status: 500 })
  }
}

// DELETE /api/opening-credits?id=xxx - Delete an opening credit
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await db.openingCredit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting opening credit:', error)
    return NextResponse.json({ error: 'Failed to delete opening credit' }, { status: 500 })
  }
}
