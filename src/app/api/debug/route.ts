import { NextResponse } from 'next/server'

export async function GET() {
  // Show all env vars that might be related to database
  const relevantEnvs: Record<string, string> = {}

  for (const [key, value] of Object.entries(process.env)) {
    if (
      key.includes('TURSO') ||
      key.includes('DATABASE') ||
      key.includes('LIBSQL') ||
      key.includes('ALFALAH') ||
      key.includes('DB_')
    ) {
      relevantEnvs[key] = value
        ? (value.length > 50 ? `${value.substring(0, 50)}...` : value)
        : 'EMPTY'
    }
  }

  return NextResponse.json(relevantEnvs)
}
