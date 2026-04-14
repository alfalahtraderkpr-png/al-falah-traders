import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    // Allow seed without auth only if no admin exists (first-time setup)
    const existingAdmin = await db.admin.findFirst()
    if (existingAdmin) {
      const session = await getSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Create default admin (plaintext password - auth route supports both formats)
    const admin = await db.admin.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: 'admin123',
      },
    })

    // Create sample order bookers
    const orderBookerData = [
      { name: 'Danish', phone: '0300-1234567' },
      { name: 'Qadeer', phone: '0321-2345678' },
      { name: 'Shahid', phone: '0333-3456789' },
      { name: 'Ali', phone: '0345-4567890' },
      { name: 'Hassan', phone: '0312-5678901' },
    ]
    const orderBookers = []
    for (const obData of orderBookerData) {
      const ob = await db.orderBooker.upsert({
        where: { name: obData.name },
        update: {},
        create: { name: obData.name, phone: obData.phone, isActive: true },
      })
      orderBookers.push(ob)
    }

    // Create sample companies with categories
    const companyData = [
      { name: 'CPL', category: 'Beverages' },
      { name: 'Tank', category: 'Beverages' },
      { name: 'Tahura', category: 'Spices' },
      { name: 'Imported', category: 'General' },
      { name: 'Shan Masala', category: 'Spices' },
      { name: 'National Foods', category: 'Food' },
      { name: 'Mitchells', category: 'Food' },
      { name: 'Kolson', category: 'Snacks' },
    ]
    const companies = []
    for (const coData of companyData) {
      const company = await db.company.upsert({
        where: { name: coData.name },
        update: {},
        create: { name: coData.name, category: coData.category, isActive: true },
      })
      companies.push(company)
    }

    // Seed sample entries for the past 14 days (only if no entries exist)
    const existingEntries = await db.dailyEntry.count()
    let entryCount = 0

    if (existingEntries === 0) {
      const today = new Date()
      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const entryDate = new Date(today)
        entryDate.setDate(today.getDate() - dayOffset)
        // Skip Sundays
        if (entryDate.getDay() === 0) continue

        for (const ob of orderBookers.slice(0, 3)) { // Danish, Qadeer, Shahid
          for (const co of companies.slice(0, 4)) { // CPL, Tank, Tahura, Imported
            const summaryAmount = Math.floor(Math.random() * 30000) + 5000
            const stockReturn = Math.floor(Math.random() * 3000)
            const postedSummary = summaryAmount - stockReturn
            const cashReceived = Math.floor(postedSummary * (0.3 + Math.random() * 0.5))
            const creditPosted = postedSummary - cashReceived
            const oldRecovery = Math.floor(Math.random() * 5000)
            const openingBalance = Math.floor(Math.random() * 20000)
            const closingBalance = openingBalance - oldRecovery + creditPosted

            try {
              await db.dailyEntry.create({
                data: {
                  date: entryDate,
                  orderBookerId: ob.id,
                  companyId: co.id,
                  openingBalance,
                  summaryAmount,
                  stockReturn,
                  postedSummary,
                  cashReceived,
                  creditPosted,
                  oldRecovery,
                  closingBalance,
                },
              })
              entryCount++
            } catch {
              // Skip if unique constraint violation (already exists)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        admin: { id: admin.id, username: admin.username },
        orderBookers: orderBookers.map((ob) => ({ id: ob.id, name: ob.name })),
        companies: companies.map((c) => ({ id: c.id, name: c.name })),
        entriesCreated: entryCount,
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
