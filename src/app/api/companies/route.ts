import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companies = await db.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    })

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        isActive: c.isActive,
        entryCount: c._count.entries,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get companies error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
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
    const { name, category } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const existing = await db.company.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Company with this name already exists' },
        { status: 409 }
      )
    }

    const company = await db.company.create({
      data: {
        name: name.trim(),
        category: category?.trim() || null,
      },
    })

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
