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
  // Watt-baserat (cykel, kajak, skierg)
  startWatt?: number
  stepSize?: number
  // Fartbaserat (löpning, skidor)
  startSpeed?: number      // km/h
  speedIncrement?: number  // km/h per steg
  incline?: number         // % lutning
  // Gemensamt
  testDuration: number     // minuter per steg
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

export interface WingateInputParams {
  saddleVerticalMm: number | null
  saddleHorizontalMm: number | null
  startCadenceRpm: number | null
  bodyWeightPercent: number
  bodyWeight: number | null
}

export interface BikeSettings {
  bikeType: string
  pedalType: string
  saddleVerticalMm: number | null
  saddleHorizontalMm: number | null
  handlebarVerticalMm: number | null
  handlebarHorizontalMm: number | null
}

export interface SportSettings {
  bike?: BikeSettings
  // kajak?: KajakSettings  -- framtida
}

export interface CoachAssessment {
  atEffektWatt: number | null
  ltEffektWatt: number | null
  granLagMedel: number | null     // "Gräns Låg/Medel"
  nedreGrans: number | null       // "Nedre gräns"
  estMaxPuls: number | null
  hogstaUpnaddPuls: number | null
  atPuls: number | null
  ltPuls: number | null
  granLagMedelPuls: number | null   // "Gräns Låg/Medel" bpm
  nedreGransPuls: number | null     // "Nedre gräns" bpm
}

export interface RawDataPoint {
  min: number
  watt: number
  speed?: number  // km/h — används för löpning/skidor
  hr: number
  lac: number
  borg: number
  cadence: number
}

export interface TestStage {
  id: string
  testId: string
  stageNumber: number
  loadWatts: number | null
  loadSpeedKmh: number | null
  heartRate: number | null
  lactateMmol: number | null
  vo2MlKgMin?: number | null
  rpe: number | null
  borgCentral?: number | null
  borgLocal?: number | null
  cadenceRpm: number | null
  durationSeconds: number | null
  vo2Absolute?: number | null
  fatGh?: number | null
  choGh?: number | null
  veO2?: number | null
  veCo2?: number | null
  respiratoryFreq?: number | null
  paO2?: number | null
  paCo2?: number | null
  baseExcess?: number | null
  energyExpenditure?: number | null
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
  wingateInputParams?: WingateInputParams
  settings?: SportSettings
  coachAssessment?: CoachAssessment
  rawData: RawDataPoint[]
  notes: string
  createdAt: Timestamp
}

export type TestInput = Omit<Test, 'id' | 'results' | 'createdAt'>

// --- AthleteFile ---

export interface AthleteFile {
  id: string
  athleteId: string
  clinicId: string
  coachId: string
  resultType: string       // e.g. "Glukosanalys"
  testDate: Timestamp
  testDateEnd?: Timestamp  // optional end date for ranges
  fileName: string
  storageUrl: string
  createdAt: Timestamp
}

export interface SerializedAthleteFile {
  id: string
  resultType: string
  testDateStr: string
  testDateEndStr?: string
  fileName: string
  storageUrl: string
}

// --- Auth session (returned to client components) ---

export interface SessionUser {
  uid: string
  email: string
  role: Role
  clinicId: string
}
