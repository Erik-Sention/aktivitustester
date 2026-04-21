import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreQuery } from '@/lib/firestore-rest'

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return null
  const refreshToken = await getSessionRefreshToken()
  if (!refreshToken) return null
  const idToken = await exchangeRefreshToken(refreshToken)
  return idToken
}

export async function GET(request: NextRequest) {
  const idToken = await requireAdmin()
  if (!idToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const type = request.nextUrl.searchParams.get('type') ?? 'athletes'
  if (type !== 'athletes' && type !== 'tests') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const docs = await firestoreQuery(
    type,
    [{ field: 'isArchived', op: 'EQUAL', value: true }],
    idToken
  )

  return NextResponse.json({ items: docs })
}
