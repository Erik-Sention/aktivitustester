import type { RawDataPoint, SportType, TestType, ProtocolType, ClinicLocation, BikeSettings, CoachAssessment } from '@/types'

export const DRAFT_KEY = 'aktivitus_recording_draft'

export interface RecordingDraft {
  savedAt: number
  step: 'setup' | 'recording'
  form: {
    athleteId: string
    sport: SportType
    testType: TestType
    protocol: ProtocolType
    testLocation: ClinicLocation | ''
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
  lacStrings: Record<number, string>
  coachAssessment: CoachAssessment
  exhaustionLacStr: string
  exhaustionMaxHR: string
  exhaustionTimeMins: string
  exhaustionTimeSecs: string
  exhaustionWattStr: string
  manualVo2MaxStr: string
  manualAbsVo2Str: string
  bikeSettings: Partial<BikeSettings>
  wingateResults: { peakPower: string; meanPower: string; minPower: string }
  wingateParams: { saddleVerticalMm: string; saddleHorizontalMm: string; startCadenceRpm: string; bodyWeightPercent: string }
}

export function saveDraft(d: RecordingDraft): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch {}
}

export function loadDraft(): RecordingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as RecordingDraft) : null
  } catch { return null }
}

export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

export function draftRelativeTime(savedAt: number): string {
  const mins = Math.round((Date.now() - savedAt) / 60_000)
  if (mins < 1) return 'just nu'
  if (mins < 60) return `${mins} min sedan`
  return `${Math.round(mins / 60)} tim sedan`
}
