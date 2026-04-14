import { cookies } from 'next/headers'
import { db } from './db'

const SESSION_COOKIE = 'al-falah-session'

export async function getSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value

  if (!sessionToken) {
    return null
  }

  try {
    // Session token is the admin's ID
    const admin = await db.admin.findUnique({
      where: { id: sessionToken },
    })

    if (!admin) {
      return null
    }

    return { id: admin.id, username: admin.username }
  } catch {
    return null
  }
}

export function createSessionCookie(adminId: string) {
  return {
    name: SESSION_COOKIE,
    value: adminId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
