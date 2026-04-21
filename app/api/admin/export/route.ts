import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreQuery } from '@/lib/firestore-rest'
import { buildBulkCSV } from '@/lib/export'

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return null
  const refreshToken = await getSessionRefreshToken()
  if (!refreshToken) return null
  return exchangeRefreshToken(refreshToken)
}

export async function GET(request: NextRequest) {
  const idToken = await requireAdmin()
  if (!idToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  const fromDate = new Date(`${from}T00:00:00Z`)
  const toDate = new Date(`${to}T23:59:59Z`)
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  const filters: Parameters<typeof firestoreQuery>[1] = [
    { field: 'testDate', op: 'GREATER_THAN_OR_EQUAL', value: fromDate },
    { field: 'testDate', op: 'LESS_THAN_OR_EQUAL', value: toDate },
  ]

  const testType = searchParams.get('testType')
  if (testType) filters.push({ field: 'testType', op: 'EQUAL', value: testType })

  const sport = searchParams.get('sport')
  if (sport) filters.push({ field: 'sport', op: 'EQUAL', value: sport })

  const docs = await firestoreQuery('tests', filters, idToken, 'testDate', 'ASCENDING')
  const active = docs.filter(d => !d.isArchived)

  const csv = buildBulkCSV(active)
  const bom = '﻿'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="export-${from}-${to}.csv"`,
    },
  })
}
