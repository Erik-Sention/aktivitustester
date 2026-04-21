import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { firestoreGet, firestoreSet } from '@/lib/firestore-rest'

const SESSION_COOKIE = 'session'
const SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours

function secret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET environment variable is not set')
  return s
}

function sign(payload: object): string {
  const data = JSON.stringify(payload)
  const sig = createHmac('sha256', secret()).update(data).digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url')
}

function verifyToken(token: string): Record<string, unknown> | null {
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
  const { idToken, refreshToken } = await request.json()
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

  const uid = user.localId as string
  const email = (user.email ?? '') as string

  // Look up or create the user doc in Firestore
  let role: 'ADMIN' | 'TRAINER' = 'TRAINER'
  let clinicId = ''

  try {
    const userDoc = await firestoreGet('users', uid, idToken)
    if (userDoc) {
      role = (userDoc.role ?? 'TRAINER') as 'ADMIN' | 'TRAINER'
      clinicId = (userDoc.clinicId as string) ?? ''
    } else {
      // Bootstrap: first-time login — check env var for admin override
      if (process.env.ADMIN_BOOTSTRAP_UID === uid) {
        role = 'ADMIN'
      }
      await firestoreSet('users', uid, {
        role,
        email,
        clinicId,
        createdAt: new Date().toISOString(),
      }, idToken)
    }
  } catch (err) {
    // Firestore read failed (e.g. security rules not yet updated) — fall back gracefully
    console.error('Firestore user doc lookup failed:', err)
    if (process.env.ADMIN_BOOTSTRAP_UID === uid) role = 'ADMIN'
  }

  const payload = {
    uid,
    email,
    role,
    clinicId,
    refreshToken: refreshToken ?? '',
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
