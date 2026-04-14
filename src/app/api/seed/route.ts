import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Create default admin
    const admin = await db.admin.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: 'admin123',
      },
    })

    // Create sample order bookers
    const orderBookerNames = ['Danish', 'Qadeer', 'Shahid', 'Ali', 'Hassan']
    const orderBookers = []
    for (const name of orderBookerNames) {
      const ob = await db.orderBooker.upsert({
        where: { name },
        update: {},
        create: { name, isActive: true },
      })
      orderBookers.push(ob)
    }

    // Create sample companies
    const companyNames = [
      'CPL',
      'Tank',
      'Tahura',
      'Imported',
      'Shan Masala',
      'National Foods',
      'Mitchells',
      'Kolson',
    ]
    const companies = []
    for (const name of companyNames) {
      const company = await db.company.upsert({
        where: { name },
        update: {},
        create: { name, isActive: true },
      })
      companies.push(company)
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        admin: { id: admin.id, username: admin.username },
        orderBookers: orderBookers.map((ob) => ({ id: ob.id, name: ob.name })),
        companies: companies.map((c) => ({ id: c.id, name: c.name })),
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    )
  }
}
