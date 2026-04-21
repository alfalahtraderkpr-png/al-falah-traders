import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.ALFALAH_DB_URL
  const tursoAuthToken = process.env.ALFALAH_DB_TOKEN

  // Use Turso/libSQL adapter for cloud database (production/Vercel)
  if (
    tursoUrl &&
    tursoAuthToken &&
    tursoUrl !== 'undefined' &&
    tursoAuthToken !== 'undefined' &&
    tursoUrl.startsWith('libsql://')
  ) {
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })

    return new PrismaClient({
      adapter,
    })
  }

  // Fallback to local SQLite for development
  const localClient = createClient({
    url: process.env.DATABASE_URL || 'file:./db/custom.db',
  })
  const adapter = new PrismaLibSql(localClient)

  return new PrismaClient({
    adapter,
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
