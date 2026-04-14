import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

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
    const { name, phone } = body

    const existing = await db.orderBooker.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Order booker not found' },
        { status: 404 }
      )
    }

    // Check for name conflict if name is being changed
    if (name && name.trim() !== existing.name) {
      const nameConflict = await db.orderBooker.findUnique({
        where: { name: name.trim() },
      })
      if (nameConflict) {
        return NextResponse.json(
          { error: 'Order booker with this name already exists' },
          { status: 409 }
        )
      }
    }

    const orderBooker = await db.orderBooker.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    })

    return NextResponse.json({ orderBooker })
  } catch (error) {
    console.error('Update order booker error:', error)
    return NextResponse.json(
      { error: 'Failed to update order booker' },
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

    const existing = await db.orderBooker.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Order booker not found' },
        { status: 404 }
      )
    }

    // Soft delete - deactivate
    const orderBooker = await db.orderBooker.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ orderBooker })
  } catch (error) {
    console.error('Delete order booker error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate order booker' },
      { status: 500 }
    )
  }
}
