import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderBookers = await db.orderBooker.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    })

    return NextResponse.json({
      orderBookers: orderBookers.map((ob) => ({
        id: ob.id,
        name: ob.name,
        phone: ob.phone,
        isActive: ob.isActive,
        entryCount: ob._count.entries,
        createdAt: ob.createdAt,
        updatedAt: ob.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get order bookers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order bookers' },
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
    const { name, phone } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const existing = await db.orderBooker.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Order booker with this name already exists' },
        { status: 409 }
      )
    }

    const orderBooker = await db.orderBooker.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
      },
    })

    return NextResponse.json({ orderBooker }, { status: 201 })
  } catch (error) {
    console.error('Create order booker error:', error)
    return NextResponse.json(
      { error: 'Failed to create order booker' },
      { status: 500 }
    )
  }
}
