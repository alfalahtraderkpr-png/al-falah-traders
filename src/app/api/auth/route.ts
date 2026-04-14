import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionCookie, clearSessionCookie, getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      admin: session,
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { error: 'Session check failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const admin = await db.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Support both plaintext (legacy) and bcrypt passwords
    let passwordValid = false
    if (admin.password === password) {
      passwordValid = true
    } else {
      try {
        const bcrypt = await import('bcryptjs')
        passwordValid = await bcrypt.compare(password, admin.password)
      } catch {
        passwordValid = false
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const cookieOptions = createSessionCookie(admin.id)
    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, username: admin.username },
    })
    response.cookies.set(cookieOptions)

    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters' },
        { status: 400 }
      )
    }

    // Find the admin and verify current password
    const admin = await db.admin.findUnique({
      where: { id: session.id },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Support both plaintext (legacy) and bcrypt passwords
    let passwordValid = false
    if (admin.password === currentPassword) {
      passwordValid = true
    } else {
      try {
        const bcrypt = await import('bcryptjs')
        passwordValid = await bcrypt.compare(currentPassword, admin.password)
      } catch {
        passwordValid = false
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash the new password with bcrypt
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await db.admin.update({
      where: { id: session.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const cookieOptions = clearSessionCookie()
    const response = NextResponse.json({ success: true })
    response.cookies.set(cookieOptions)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
