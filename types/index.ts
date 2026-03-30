// Shared Timestamp interface — compatible with both firebase/firestore and firebase-admin/firestore
export interface Timestamp {
  seconds: number
  nanoseconds: number
  toDate(): Date
  toMillis(): number
}

export type Role = 'ADMIN' | 'TRAINER'

export type SportType = 'cykel' | 'skidor_band' | 'skierg' | 'lopning' | 'kajak'
export type TestType = 'troskeltest' | 'vo2max' | 'wingate'
export type ProtocolType = 'standard_3min' | 'ramp_test'
export type ClinicLocation = 'stockholm' | 'stockholm_c' | 'linkoping' | 'goteborg' | 'malmo'

// --- Clinic ---

export interface ClinicSettings {
  logoUrl?: string
  reportColor?: string
}

export interface Clinic {
  id: string
  name: string
  orgNumber: string
  settings: ClinicSettings
}

// --- Athlete ---

export interface Athlete {
  id: string
  firstName: string
  lastName: string
  personnummer: string
  birthDate: Timestamp | null
  gender: 'M' | 'K' | ''
  email: string
  phone: string
  currentWeight: number | null
  height: number | null
  mainCoach?: string
  clinicId: string
  createdBy: string
  createdAt: Timestamp
}

export type AthleteInput = Omit<Athlete, 'id' | 'createdAt'>

// --- Test ---

export interface TestInputParams {
  startWatt: number
  stepSize: number
  testDuration: number // minutes per step
  bodyWeight: number | null
  heightCm: number | null
}

export interface TestResults {
  vo2Max: number | null
  atWatt: number | null  // LT1 @ 2.0 mmol
  ltWatt: number | null  // LT2 @ 4.0 mmol
  maxHR: number | null
  maxLactate: number | null
}

export interface WingateData {
  peakPower: number
  meanPower: number
  minPower: number
}

export interface RawDataPoint {
  min: number
  watt: number
  hr: number
  lac: number
  borg: number
  cadence: number
}

export interface Test {
  id: string
  athleteId: string
  coachId: string
  clinicId: string
  testDate: Timestamp
  sport: SportType
  testType: TestType
  protocol: ProtocolType
  testLocation: ClinicLocation
  testLeader: string
  inputParams: TestInputParams
  results: TestResults
  wingateData?: WingateData
  rawData: RawDataPoint[]
  notes: string
  createdAt: Timestamp
}

export type TestInput = Omit<Test, 'id' | 'results' | 'createdAt'>

// --- Auth session (returned to client components) ---

export interface SessionUser {
  uid: string
  email: string
  role: Role
  clinicId: string
}
