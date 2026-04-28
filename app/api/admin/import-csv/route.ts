import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreGet, firestoreSet } from '@/lib/firestore-rest'
import { interpolateLactateThreshold, LT1_MMOL, LT2_MMOL, calculateVo2Max } from '@/lib/calculations'
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
    exhaustionWattStr?: string
    exhaustionMaxHR?: string
    exhaustionTimeMins?: string
    exhaustionTimeSecs?: string
    coachAssessment?: Record<string, unknown>
    bikeSettings?: Record<string, unknown>
    wingateResults?: { peakPower: string; meanPower: string; minPower: string }
    wingateParams?: { startCadenceRpm: string; bodyWeightPercent: string; bodyWeight: string }
  }

  const isWingate = backup?.form?.testType === 'wingate'

  if (!backup?.form?.athleteId) {
    return NextResponse.json({ error: 'Ogiltig backup-fil — saknar athleteId' }, { status: 400 })
  }
  if (!isWingate && !backup?.rows) {
    return NextResponse.json({ error: 'Ogiltig backup-fil — saknar rows' }, { status: 400 })
  }

  const { form, rows = [] } = backup

  const athlete = await firestoreGet('athletes', form.athleteId, idToken)
  if (!athlete) {
    return NextResponse.json({ error: `Atlet med ID ${form.athleteId} hittades inte` }, { status: 404 })
  }

  const results = calculateResults(rows)

  // VO2max: priority chain matches recording view (manual → abs÷weight → formula)
  const bodyWeightNum = parseFloat(form.bodyWeight) || 0
  if (backup.manualVo2MaxStr) {
    const v = parseFloat(backup.manualVo2MaxStr)
    if (!isNaN(v) && v > 0) results.vo2Max = v
  }
  if (!results.vo2Max && backup.manualAbsVo2Str) {
    const lmin = parseFloat(backup.manualAbsVo2Str)
    if (lmin > 0 && bodyWeightNum > 0) results.vo2Max = Math.round(lmin * 1000 / bodyWeightNum)
  }
  if (!results.vo2Max && backup.exhaustionWattStr) {
    const w = parseInt(backup.exhaustionWattStr)
    if (w > 0 && bodyWeightNum > 0) results.vo2Max = calculateVo2Max(w, bodyWeightNum)
  }

  const isSpeedSport = form.sport === 'lopning' || form.sport === 'skidor_band'

  // Build exhaustion-time note prefix for VO2max tests
  let notesValue = form.notes ?? ''
  if (backup.exhaustionTimeMins && backup.exhaustionTimeSecs) {
    const mm = backup.exhaustionTimeMins.padStart(2, '0')
    const ss = backup.exhaustionTimeSecs.padStart(2, '0')
    notesValue = `Utmattning tid: ${mm}:${ss}\n${notesValue}`
  }

  const testDoc: Record<string, unknown> = {
    athleteId:    form.athleteId,
    coachId:      String(athlete.coachId ?? ''),
    clinicId:     String(athlete.clinicId ?? ''),
    testDate:     new Date(form.testDate),
    sport:        form.sport,
    testType:     form.testType,
    protocol:     form.protocol ?? 'standard_3min',
    testLocation: form.testLocation ?? '',
    testLeader:   form.testLeader ?? '',
    notes:        notesValue,
    inputParams: {
      testDuration: parseInt(form.testDuration) || (isWingate ? 0 : 3),
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

  // VO2max-specific result fields
  if (backup.exhaustionWattStr) {
    const w = parseInt(backup.exhaustionWattStr)
    if (!isNaN(w) && w > 0) (testDoc.results as Record<string, unknown>).maxWatt = w
  }
  if (backup.exhaustionMaxHR) {
    const hr = parseInt(backup.exhaustionMaxHR)
    if (!isNaN(hr) && hr > 0) (testDoc.results as Record<string, unknown>).maxHR = hr
  }
  if (backup.manualAbsVo2Str) {
    const lmin = parseFloat(backup.manualAbsVo2Str)
    if (!isNaN(lmin) && lmin > 0) (testDoc.results as Record<string, unknown>).vo2AbsoluteMlMin = Math.round(lmin * 1000)
  }

  // Wingate-specific fields
  if (isWingate && backup.wingateResults) {
    const peak = parseFloat(backup.wingateResults.peakPower)
    const mean = parseFloat(backup.wingateResults.meanPower)
    const min  = parseFloat(backup.wingateResults.minPower)
    if (peak > 0 && mean > 0 && min > 0) {
      testDoc.wingateData = { peakPower: peak, meanPower: mean, minPower: min }
    }
  }
  if (isWingate && backup.wingateParams) {
    testDoc.wingateInputParams = {
      startCadenceRpm:   parseInt(backup.wingateParams.startCadenceRpm) || null,
      bodyWeightPercent: parseFloat(backup.wingateParams.bodyWeightPercent) || 10,
      bodyWeight:        parseFloat(backup.wingateParams.bodyWeight) || null,
    }
  }

  // Optional shared fields
  if (backup.coachAssessment) testDoc.coachAssessment = backup.coachAssessment
  if (backup.bikeSettings && Object.keys(backup.bikeSettings).length > 0) testDoc.settings = { bike: backup.bikeSettings }

  const id = crypto.randomUUID()
  await firestoreSet('tests', id, testDoc, idToken)

  return NextResponse.json({ imported: 1, errors: [] })
}
