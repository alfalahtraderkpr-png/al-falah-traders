import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/backup - Export all data as JSON
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [orderBookers, companies, dailyEntries, balanceHistory] = await Promise.all([
      db.orderBooker.findMany(),
      db.company.findMany(),
      db.dailyEntry.findMany(),
      db.balanceHistory.findMany(),
    ]);

    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        orderBookers,
        companies,
        dailyEntries,
        balanceHistory,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

// POST /api/backup - Import data from JSON
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid backup format: expected an object' }, { status: 400 });
    }

    if (!body.version || !body.data) {
      return NextResponse.json({ error: 'Invalid backup format: missing version or data field' }, { status: 400 });
    }

    const { data } = body;

    if (!data.orderBookers || !Array.isArray(data.orderBookers)) {
      return NextResponse.json({ error: 'Invalid backup format: orderBookers must be an array' }, { status: 400 });
    }

    if (!data.companies || !Array.isArray(data.companies)) {
      return NextResponse.json({ error: 'Invalid backup format: companies must be an array' }, { status: 400 });
    }

    if (!data.dailyEntries || !Array.isArray(data.dailyEntries)) {
      return NextResponse.json({ error: 'Invalid backup format: dailyEntries must be an array' }, { status: 400 });
    }

    if (!data.balanceHistory || !Array.isArray(data.balanceHistory)) {
      return NextResponse.json({ error: 'Invalid backup format: balanceHistory must be an array' }, { status: 400 });
    }

    // Use transaction for atomic import
    await db.$transaction(async (tx) => {
      // 1. Delete existing DailyEntry and BalanceHistory records
      await tx.dailyEntry.deleteMany();
      await tx.balanceHistory.deleteMany();

      // 2. Delete existing OrderBooker and Company records
      await tx.orderBooker.deleteMany();
      await tx.company.deleteMany();

      // 3. Create Companies from backup
      for (const company of data.companies) {
        await tx.company.create({
          data: {
            id: company.id,
            name: company.name,
            category: company.category || null,
            isActive: company.isActive !== undefined ? company.isActive : true,
            createdAt: company.createdAt ? new Date(company.createdAt) : new Date(),
            updatedAt: company.updatedAt ? new Date(company.updatedAt) : new Date(),
          },
        });
      }

      // 4. Create OrderBookers from backup
      for (const ob of data.orderBookers) {
        await tx.orderBooker.create({
          data: {
            id: ob.id,
            name: ob.name,
            phone: ob.phone || null,
            isActive: ob.isActive !== undefined ? ob.isActive : true,
            createdAt: ob.createdAt ? new Date(ob.createdAt) : new Date(),
            updatedAt: ob.updatedAt ? new Date(ob.updatedAt) : new Date(),
          },
        });
      }

      // 5. Create DailyEntries from backup
      for (const entry of data.dailyEntries) {
        await tx.dailyEntry.create({
          data: {
            id: entry.id,
            date: entry.date ? new Date(entry.date) : new Date(),
            orderBookerId: entry.orderBookerId,
            companyId: entry.companyId,
            openingBalance: entry.openingBalance ?? 0,
            summaryAmount: entry.summaryAmount ?? 0,
            stockReturn: entry.stockReturn ?? 0,
            postedSummary: entry.postedSummary ?? 0,
            cashReceived: entry.cashReceived ?? 0,
            creditPosted: entry.creditPosted ?? 0,
            oldRecovery: entry.oldRecovery ?? 0,
            closingBalance: entry.closingBalance ?? 0,
            notes: entry.notes || null,
            createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
            updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
          },
        });
      }

      // 6. Create BalanceHistory from backup
      for (const bh of data.balanceHistory) {
        await tx.balanceHistory.create({
          data: {
            id: bh.id,
            date: bh.date ? new Date(bh.date) : new Date(),
            orderBookerId: bh.orderBookerId,
            companyId: bh.companyId,
            closingBalance: bh.closingBalance ?? 0,
            createdAt: bh.createdAt ? new Date(bh.createdAt) : new Date(),
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Data imported successfully',
      stats: {
        orderBookers: data.orderBookers.length,
        companies: data.companies.length,
        dailyEntries: data.dailyEntries.length,
        balanceHistory: data.balanceHistory.length,
      },
    });
  } catch (error) {
    console.error('Backup import error:', error);
    return NextResponse.json({ error: 'Failed to import data. Please check the backup file format.' }, { status: 500 });
  }
}
