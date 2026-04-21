import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreList, firestoreSet } from '@/lib/firestore-rest'

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return null
  const refreshToken = await getSessionRefreshToken()
  if (!refreshToken) return null
  const idToken = await exchangeRefreshToken(refreshToken)
  return { user, idToken }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const docs = await firestoreList('users', auth.idToken)
  return NextResponse.json({ users: docs })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { uid, role } = await request.json()
  if (!uid || !['ADMIN', 'TRAINER'].includes(role)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  await firestoreSet('users', uid, { role }, auth.idToken)
  return NextResponse.json({ ok: true })
}
