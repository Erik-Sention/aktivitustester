import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreGet, firestoreSet } from '@/lib/firestore-rest'
import { interpolateLactateThreshold, LT1_MMOL, LT2_MMOL } from '@/lib/calculations'
import type { RawDataPoint } from '@/types'

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return null
  const refreshToken = await getSessionRefreshToken()
  if (!refreshToken) return null
  return exchangeRefreshToken(refreshToken)
}

function calculateResults(rawData: RawDataPoint[]): { vo2Max: number | null; atWatt: number | null; ltWatt: number | null; maxHR: number | null; maxLactate: number | null } {
  const hasSpeed = rawData.some(p => (p.speed ?? 0) > 0)
  const hasIntensity = (p: RawDataPoint) => hasSpeed ? (p.speed ?? 0) > 0 : p.watt > 0
  const valid = rawData.filter(p => p.lac > 0 && hasIntensity(p))
  const atWatt = interpolateLactateThreshold(valid, LT1_MMOL)
  const ltWatt = interpolateLactateThreshold(valid, LT2_MMOL)
  const allActive = rawData.filter(p => hasIntensity(p) && p.hr > 0)
  const maxHR = allActive.length > 0 ? Math.max(...allActive.map(p => p.hr)) : null
  const maxLactate = valid.length > 0 ? Math.max(...valid.map(p => p.lac)) : null
  return { vo2Max: null, atWatt, ltWatt, maxHR: maxHR || null, maxLactate: maxLactate || null }
}

export async function POST(req: NextRequest) {
  const idToken = await requireAdmin()
  if (!idToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ogiltig JSON-fil' }, { status: 400 })
  }

  const backup = body as {
    form: {
      athleteId: string
      sport: string
      testType: string
      protocol: string
      testLocation: string
      testLeader: string
      testDate: string
      notes: string
      startWatt: string
      stepSize: string
      testDuration: string
      bodyWeight: string
      heightCm: string
      startSpeed: string
      speedIncrement: string
      incline: string
    }
    rows: RawDataPoint[]
    manualVo2MaxStr?: string
    manualAbsVo2Str?: string
  }

  if (!backup?.form?.athleteId || !backup?.rows) {
    return NextResponse.json({ error: 'Ogiltig backup-fil — saknar form eller rows' }, { status: 400 })
  }

  const { form, rows } = backup

  // Look up athlete to get clinicId
  const athlete = await firestoreGet('athletes', form.athleteId, idToken)
  if (!athlete) {
    return NextResponse.json({ error: `Atlet med ID ${form.athleteId} hittades inte` }, { status: 404 })
  }

  const results = calculateResults(rows)

  // Apply manual VO2max if entered before the emergency download
  if (backup.manualVo2MaxStr) {
    const v = parseFloat(backup.manualVo2MaxStr)
    if (!isNaN(v)) results.vo2Max = v
  }

  const isSpeedSport = form.sport === 'lopning' || form.sport === 'skidor_band'

  const testDoc: Record<string, unknown> = {
    athleteId:    form.athleteId,
    coachId:      String(athlete.coachId ?? ''),
    clinicId:     String(athlete.clinicId ?? ''),
    testDate:     new Date(form.testDate),
    sport:        form.sport,
    testType:     form.testType,
    protocol:     form.protocol,
    testLocation: form.testLocation ?? '',
    testLeader:   form.testLeader ?? '',
    notes:        form.notes ?? '',
    inputParams: {
      testDuration: parseInt(form.testDuration) || 3,
      bodyWeight:   parseFloat(form.bodyWeight) || null,
      heightCm:     parseFloat(form.heightCm) || null,
      ...(isSpeedSport
        ? { startSpeed: parseFloat(form.startSpeed) || 0, speedIncrement: parseFloat(form.speedIncrement) || 0, incline: parseFloat(form.incline) || 0 }
        : { startWatt: parseInt(form.startWatt) || 0, stepSize: parseInt(form.stepSize) || 0 }),
    },
    results,
    rawData: rows,
    createdAt: new Date(),
    isArchived: false,
  }

  const id = crypto.randomUUID()
  await firestoreSet('tests', id, testDoc, idToken)

  return NextResponse.json({ imported: 1, errors: [] })
}
