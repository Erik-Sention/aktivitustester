import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Test } from '@/types'
import { isSpeedSport } from '@/lib/utils'

export async function fetchTestsForExport(athleteId: string): Promise<Test[]> {
  const q = query(
    collection(db, 'tests'),
    where('athleteId', '==', athleteId),
    orderBy('testDate', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Test))
    .filter(t => !t.isArchived)
}

function esc(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildAthleteCSV(tests: Test[], athleteName: string, anonymize: boolean): string {
  const displayName = anonymize ? 'Anonym' : athleteName

  const header = [
    'Atlet', 'Testdatum', 'Sport', 'Testtyp', 'Protokoll',
    'Kroppsvikt (kg)', 'AT (W)', 'LT2 (W)', 'Max HR', 'Max Laktat (mmol/L)',
    'Steg', 'Tid (min)', 'Watt', 'HR', 'Laktat (mmol/L)', 'Borg', 'Kadens',
  ].join(',')

  const rows = tests.flatMap(test => {
    const dateStr = test.testDate
      ? new Date((test.testDate as { seconds: number }).seconds * 1000).toLocaleDateString('sv-SE')
      : ''
    const r = test.results ?? {}
    const meta = [
      displayName,
      dateStr,
      test.sport ?? '',
      test.testType ?? '',
      test.protocol ?? '',
      test.inputParams?.bodyWeight ?? '',
      r.atWatt ?? '',
      r.ltWatt ?? '',
      r.maxHR ?? '',
      r.maxLactate ?? '',
    ]
    const speedSport = isSpeedSport(test.sport ?? '')
    if (!test.rawData?.length) {
      return [meta.concat(['', '', '', '', '', '', '']).map(esc).join(',')]
    }
    return test.rawData.map((pt, idx) =>
      meta.concat([
        String(idx + 1),
        esc(pt.min),
        esc(speedSport ? (pt.speed ?? 0) : pt.watt),
        esc(pt.hr),
        esc(pt.lac),
        esc(pt.borg),
        esc(pt.cadence),
      ]).map(esc).join(',')
    )
  })

  return [header, ...rows].join('\r\n')
}

// Stable 4-char hex label per athlete — consistent across exports
export function anonId(athleteId: string): string {
  let h = 0
  for (let i = 0; i < athleteId.length; i++) h = (h * 31 + athleteId.charCodeAt(i)) & 0xffff
  return `ATL-${h.toString(16).toUpperCase().padStart(4, '0')}`
}

// Builds bulk CSV from raw Firestore REST API docs (server-side use)
export function buildBulkCSV(docs: Array<Record<string, unknown>>): string {
  const header = [
    'Atlet-ID', 'Testdatum', 'Sport', 'Testtyp', 'Protokoll',
    'Kroppsvikt (kg)', 'AT (W)', 'LT2 (W)', 'Max HR', 'Max Laktat (mmol/L)',
    'Steg', 'Tid (min)', 'Watt', 'HR', 'Laktat (mmol/L)', 'Borg', 'Kadens',
  ].join(',')

  const rows = docs.flatMap(doc => {
    const athleteId = (doc.athleteId as string) ?? ''
    const label = anonId(athleteId)

    const ts = doc.testDate as { _seconds?: number; seconds?: number } | string | null
    let dateStr = ''
    if (ts && typeof ts === 'object') {
      const secs = ts._seconds ?? ts.seconds
      if (secs) dateStr = new Date(secs * 1000).toLocaleDateString('sv-SE')
    } else if (typeof ts === 'string') {
      dateStr = new Date(ts).toLocaleDateString('sv-SE')
    }

    const results = (doc.results as Record<string, unknown>) ?? {}
    const inputParams = (doc.inputParams as Record<string, unknown>) ?? {}
    const rawData = (doc.rawData as Array<Record<string, unknown>>) ?? []

    const meta = [
      label,
      dateStr,
      (doc.sport as string) ?? '',
      (doc.testType as string) ?? '',
      (doc.protocol as string) ?? '',
      inputParams.bodyWeight ?? '',
      results.atWatt ?? '',
      results.ltWatt ?? '',
      results.maxHR ?? '',
      results.maxLactate ?? '',
    ]

    const speedSport = isSpeedSport((doc.sport as string) ?? '')
    if (!rawData.length) {
      return [meta.concat(['', '', '', '', '', '', '']).map(esc).join(',')]
    }
    return rawData.map((pt, idx) =>
      meta.concat([
        String(idx + 1),
        esc(pt.min),
        esc(speedSport ? (pt.speed ?? 0) : pt.watt),
        esc(pt.hr),
        esc(pt.lac),
        esc(pt.borg),
        esc(pt.cadence),
      ]).map(esc).join(',')
    )
  })

  return [header, ...rows].join('\r\n')
}

export function downloadCSV(csv: string, filename: string) {
  const bom = '﻿' // UTF-8 BOM — Excel reads Swedish chars correctly
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
