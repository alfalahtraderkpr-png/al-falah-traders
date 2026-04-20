import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { readFileSync } from 'fs'
import { join } from 'path'

interface ParsedEntry {
  date: string
  company: string
  orderBooker: string
  supplier: string
  todaySupply: number
  stockReturn: number
  posting: number
  creditPosted: number
  summaryCash: number
  claimCleared: number
  sabqaPayment: number
  recoveryList: number
  returnStockClaimByOB: number
  totalRecovery: number
}

interface ParsedData {
  entries: ParsedEntry[]
  companies: string[]
  orderBookers: string[]
}

function normalizeOBName(name: string): string {
  const nameMap: Record<string, string> = {
    'DANISH': 'Danish',
    'MURTAZA': 'Murtaza',
    'SHAHID': 'Shahid',
    'QADEER': 'Qadeer',
    'ASHRAF': 'Ashraf',
    'KHAWAR': 'Khawar',
    'SHAHZAD AHMAD': 'Shahzad Ahmad',
  }
  return nameMap[name] || name
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clearExisting } = body as { clearExisting?: boolean }

    const jsonPath = join(process.cwd(), 'upload', 'parsed_cashflow.json')
    let parsedData: ParsedData

    try {
      const raw = readFileSync(jsonPath, 'utf-8')
      parsedData = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'Could not read parsed cashflow data.' },
        { status: 400 }
      )
    }

    if (!parsedData.entries?.length) {
      return NextResponse.json({ error: 'No entries found' }, { status: 400 })
    }

    const results = {
      companiesCreated: 0,
      orderBookersCreated: 0,
      entriesCreated: 0,
      entriesUpdated: 0,
      errors: [] as string[],
    }

    // Step 1: Bulk upsert companies
    const companyMap: Record<string, string> = {}
    for (const companyName of parsedData.companies) {
      const existing = await db.company.findUnique({ where: { name: companyName } })
      if (existing) {
        companyMap[companyName] = existing.id
      } else {
        const created = await db.company.create({ data: { name: companyName, isActive: true } })
        companyMap[companyName] = created.id
        results.companiesCreated++
      }
    }

    // Step 2: Bulk upsert order bookers
    const obMap: Record<string, string> = {}
    const uniqueOBs = [...new Set(parsedData.entries.map(e => normalizeOBName(e.orderBooker)))]
    for (const obName of uniqueOBs) {
      const existing = await db.orderBooker.findUnique({ where: { name: obName } })
      if (existing) {
        obMap[obName] = existing.id
      } else {
        const created = await db.orderBooker.create({ data: { name: obName, isActive: true } })
        obMap[obName] = created.id
        results.orderBookersCreated++
      }
    }

    // Step 3: Clear existing March 2026 data if requested
    if (clearExisting) {
      await db.dailyEntry.deleteMany({
        where: { date: { gte: new Date('2026-03-01'), lte: new Date('2026-03-31') } },
      })
      await db.balanceHistory.deleteMany({
        where: { date: { gte: new Date('2026-03-01'), lte: new Date('2026-03-31') } },
      })
    }

    // Step 4: Batch import entries - use createMany with skipDuplicates for efficiency
    const entriesToCreate = []
    
    for (const entry of parsedData.entries) {
      const companyId = companyMap[entry.company]
      const obName = normalizeOBName(entry.orderBooker)
      const orderBookerId = obMap[obName]

      if (!companyId || !orderBookerId) {
        results.errors.push(`Skipping: ${entry.company}/${entry.orderBooker}`)
        continue
      }

      const postedSummary = entry.posting - entry.stockReturn
      const closingBalance = 0 - entry.totalRecovery + entry.creditPosted

      entriesToCreate.push({
        date: new Date(entry.date),
        orderBookerId,
        companyId,
        supplier: entry.supplier,
        openingBalance: 0,
        todaySupply: entry.todaySupply,
        summaryAmount: entry.posting,
        stockReturn: entry.stockReturn,
        postedSummary,
        cashReceived: entry.summaryCash,
        creditPosted: entry.creditPosted,
        oldRecovery: entry.totalRecovery,
        claimCleared: entry.claimCleared,
        sabqaPayment: entry.sabqaPayment,
        recoveryList: entry.recoveryList,
        returnStockClaimByOB: entry.returnStockClaimByOB,
        totalRecovery: entry.totalRecovery,
        closingBalance,
      })
    }

    // Use createMany for bulk insert - much faster
    try {
      const result = await db.dailyEntry.createMany({
        data: entriesToCreate,
        skipDuplicates: true,
      })
      results.entriesCreated = result.count
    } catch (err) {
      // If createMany fails, try individual inserts
      results.errors.push(`Bulk insert error: ${err}. Trying individual inserts...`)
      for (const data of entriesToCreate) {
        try {
          await db.dailyEntry.create({ data })
          results.entriesCreated++
        } catch {
          // Skip duplicates
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.entriesCreated} entries created`,
      results,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import data', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jsonPath = join(process.cwd(), 'upload', 'parsed_cashflow.json')
    let parsedData: ParsedData

    try {
      const raw = readFileSync(jsonPath, 'utf-8')
      parsedData = JSON.parse(raw)
    } catch {
      return NextResponse.json({ available: false, message: 'No parsed cashflow data found' })
    }

    const existingCount = await db.dailyEntry.count({
      where: { date: { gte: new Date('2026-03-01'), lte: new Date('2026-03-31') } },
    })

    return NextResponse.json({
      available: true,
      totalEntries: parsedData.entries.length,
      companies: parsedData.companies,
      orderBookers: parsedData.orderBookers,
      dateRange: { from: '2026-03-01', to: '2026-03-31' },
      existingMarchEntries: existingCount,
    })
  } catch (error) {
    console.error('Import preview error:', error)
    return NextResponse.json({ error: 'Failed to preview import data' }, { status: 500 })
  }
}
