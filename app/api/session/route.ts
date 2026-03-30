import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const SESSION_COOKIE = 'session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 14 // 14 days

function secret() {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
}

function sign(payload: object): string {
  const data = JSON.stringify(payload)
  const sig = createHmac('sha256', secret()).update(data).digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url')
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const { data, sig } = JSON.parse(Buffer.from(token, 'base64url').toString())
    const expected = createHmac('sha256', secret()).update(data).digest('hex')
    if (expected !== sig) return null
    return JSON.parse(data)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const { idToken } = await request.json()
  if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })

  // Verify the Firebase ID token via REST API (no Admin SDK needed)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  )

  if (!res.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { users } = await res.json()
  const user = users?.[0]
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Build session payload from Firebase user
  const payload = {
    uid: user.localId,
    email: user.email ?? '',
    role: 'TRAINER' as const,   // Default — override via custom claims later
    clinicId: '',
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }

  const token = sign(payload)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
