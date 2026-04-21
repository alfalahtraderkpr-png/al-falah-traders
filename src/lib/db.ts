import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN

  // Use Turso/libSQL adapter for cloud database (production/Vercel)
  if (
    tursoUrl &&
    tursoAuthToken &&
    tursoUrl !== 'undefined' &&
    tursoAuthToken !== 'undefined' &&
    tursoUrl.startsWith('libsql://')
  ) {
    try {
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      })

      const adapter = new PrismaLibSql(libsql)

      return new PrismaClient({
        adapter,
        log: ['error', 'warn'],
      })
    } catch (error) {
      console.error('Failed to connect to Turso, falling back to SQLite:', error)
    }
  }

  // Fallback to local SQLite for development
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
