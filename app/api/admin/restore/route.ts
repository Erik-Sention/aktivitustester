import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreSet } from '@/lib/firestore-rest'

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return null
  const refreshToken = await getSessionRefreshToken()
  if (!refreshToken) return null
  return exchangeRefreshToken(refreshToken)
}

export async function PATCH(request: NextRequest) {
  const idToken = await requireAdmin()
  if (!idToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, id } = await request.json()
  if (!id || (type !== 'athletes' && type !== 'tests' && type !== 'files')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const collection = type === 'files' ? 'athlete_files' : type
  await firestoreSet(collection, id, {
    isArchived: false,
    archivedAt: null,
    archivedBy: null,
    archivedReason: null,
  }, idToken)

  return NextResponse.json({ ok: true })
}
