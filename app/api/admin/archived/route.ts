import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreGet, firestoreQuery } from '@/lib/firestore-rest'

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
  if (type !== 'athletes' && type !== 'tests' && type !== 'files') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const collection = type === 'files' ? 'athlete_files' : type
  const docs = await firestoreQuery(
    collection,
    [{ field: 'isArchived', op: 'EQUAL', value: true }],
    idToken
  )

  // For tests and files, enrich with athlete identity (name, email, personnummer)
  if (type === 'tests' || type === 'files') {
    const athleteIds = [...new Set(docs.map(d => d.athleteId as string).filter(Boolean))]
    const athleteMap: Record<string, Record<string, unknown>> = {}
    await Promise.all(
      athleteIds.map(async (id) => {
        const a = await firestoreGet('athletes', id, idToken)
        if (a) athleteMap[id] = a
      })
    )
    const enriched = docs.map(d => {
      const a = athleteMap[d.athleteId as string] ?? {}
      return {
        ...d,
        athleteName: [a.firstName, a.lastName].filter(Boolean).join(' ') || undefined,
        athleteEmail: a.email ?? undefined,
        athletePersonnummer: a.personnummer ?? undefined,
      }
    })
    return NextResponse.json({ items: enriched })
  }

  return NextResponse.json({ items: docs })
}
