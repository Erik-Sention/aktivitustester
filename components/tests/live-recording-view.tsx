"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createTestAction, createWingateTestAction } from "@/app/actions/tests"
import { WingateTimer } from "@/components/tests/wingate-recording-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { fullName } from "@/lib/utils"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Play, Pause, RotateCcw } from "lucide-react"
import { RawDataPoint, SportType, TestType, ProtocolType, ClinicLocation, BikeSettings, CoachAssessment } from "@/types"
import { LiveTestChart } from "@/components/tests/live-test-chart"
import { calculateVo2Max, interpolateLactateThreshold } from "@/lib/calculations"
import { generatePDF, SerializedTest as ReportSerializedTest } from "@/components/tests/report-download-button"
import { getCoachProfileClient } from "@/lib/coach-profile"

// ── Types ─────────────────────────────────────────────────────────────

interface AthleteOption {
  id: string
  firstName: string
  lastName: string
  gender?: string
  currentWeight?: number | null
}

interface LiveRecordingViewProps {
  athletes: AthleteOption[]
  defaultAthleteId?: string
  defaultTestType?: string
  defaultTestLeader?: string
  coachUid?: string
  guestMode?: boolean
  onGuestSessionEnd?: () => Promise<void>
}

// ── Sport / testtype / protocol config ────────────────────────────────

const SPORT_LABELS: Record<SportType, string> = {
  cykel: "Cykel",
  skidor_band: "Skidor",
  skierg: "Skierg",
  lopning: "Löpning",
  kajak: "Kajak",
}

const WATT_PRESETS = [
  { label: "40W / +20W", startWatt: 40, stepSize: 20 },
  { label: "60W / +30W", startWatt: 60, stepSize: 30 },
  { label: "80W / +40W", startWatt: 80, stepSize: 40 },
]

// Sporttyper som använder fart/lutning istället för watt
function isSpeedBased(sport: SportType): boolean {
  return sport === "lopning" || sport === "skidor_band"
}

// Steglängd (min) per sport/testtyp
const SPORT_STEP_DURATION: Partial<Record<SportType, number>> = {
  lopning: 4,
  skidor_band: 4,
}

// Steg-presets för VO2 max på löpband
const SPEED_VO2_STEP_SIZES = [0.5, 1, 1.5, 2]

// Steg-presets för VO2 max på wattbaserade sporter
const WATT_VO2_STEP_SIZES = [10, 15, 20]

const TESTTYPE_LABELS: Record<TestType, string> = {
  troskeltest: "Tröskeltest",
  vo2max: "VO2-max",
  wingate: "Wingate",
}

const SPORT_OPTIONS = Object.keys(SPORT_LABELS) as SportType[]
const TESTTYPE_OPTIONS = Object.keys(TESTTYPE_LABELS) as TestType[]

const PROTOCOL_OPTIONS: Record<SportType, { value: ProtocolType; label: string }[]> = {
  cykel: [
    { value: "standard_3min", label: "Standard 3 min-steg" },
    { value: "ramp_test", label: "Ramp-test" },
  ],
  skidor_band: [{ value: "standard_3min", label: "Standard 4 min-steg" }, { value: "ramp_test", label: "Ramp-test" }],
  skierg: [{ value: "standard_3min", label: "Standard 3 min-steg" }, { value: "ramp_test", label: "Ramp-test" }],
  lopning: [{ value: "standard_3min", label: "Standard 4 min-steg" }, { value: "ramp_test", label: "Ramp-test" }],
  kajak: [{ value: "standard_3min", label: "Standard 3 min-steg" }, { value: "ramp_test", label: "Ramp-test" }],
}

const PROTOCOL_DEFAULTS: Record<ProtocolType, { startWatt: number; stepSize: number; testDuration: number }> = {
  standard_3min: { startWatt: 40, stepSize: 20, testDuration: 3 },
  ramp_test: { startWatt: 50, stepSize: 10, testDuration: 1 },
}

const CLINIC_LOCATIONS: { value: ClinicLocation; label: string }[] = [
  { value: "stockholm", label: "Stockholm" },
  { value: "stockholm_c", label: "Stockholm C" },
  { value: "linkoping", label: "Linköping" },
  { value: "goteborg", label: "Göteborg" },
  { value: "malmo", label: "Malmö" },
]

// ── Row generation ─────────────────────────────────────────────────────

function generateMinuteRows(startWatt: number, stepSize: number, testDuration: number, totalStages = 10): RawDataPoint[] {
  const rows: RawDataPoint[] = []
  rows.push({ min: 0, watt: startWatt, hr: 0, lac: 0, borg: 0, cadence: 0 })
  for (let stage = 0; stage < totalStages; stage++) {
    const watt = startWatt + stage * stepSize
    for (let m = 1; m <= testDuration; m++) {
      rows.push({ min: stage * testDuration + m, watt, hr: 0, lac: 0, borg: 0, cadence: 0 })
    }
  }
  return rows
}

function generateSpeedRows(startSpeed: number, speedIncrement: number, testDuration: number, totalStages = 10): RawDataPoint[] {
  const rows: RawDataPoint[] = []
  rows.push({ min: 0, watt: 0, speed: startSpeed, hr: 0, lac: 0, borg: 0, cadence: 0 })
  for (let stage = 0; stage < totalStages; stage++) {
    const speed = Math.round((startSpeed + stage * speedIncrement) * 10) / 10
    for (let m = 1; m <= testDuration; m++) {
      rows.push({ min: stage * testDuration + m, watt: 0, speed, hr: 0, lac: 0, borg: 0, cadence: 0 })
    }
  }
  return rows
}

// Min 0 and stage-end rows (every testDuration minutes) get Laktat
function lacEnabled(row: RawDataPoint, testDuration: number): boolean {
  return row.min === 0 || (row.min > 0 && row.min % testDuration === 0)
}

// Only stage-end rows (not min 0) get Borg + Kadans
function borgEnabled(row: RawDataPoint, testDuration: number): boolean {
  return row.min > 0 && row.min % testDuration === 0
}

// ── Seed data ─────────────────────────────────────────────────────────

// VO2max ramp test — HR only (50W start, +20W/min)
const VO2MAX_SEED_ROWS: RawDataPoint[] = [
  { min: 0,  watt: 50,  hr: 75,  lac: 0, borg: 0, cadence: 0 },
  { min: 1,  watt: 50,  hr: 87,  lac: 0, borg: 0, cadence: 0 },
  { min: 2,  watt: 70,  hr: 98,  lac: 0, borg: 0, cadence: 0 },
  { min: 3,  watt: 90,  hr: 108, lac: 0, borg: 0, cadence: 0 },
  { min: 4,  watt: 110, hr: 118, lac: 0, borg: 0, cadence: 0 },
  { min: 5,  watt: 130, hr: 128, lac: 0, borg: 0, cadence: 0 },
  { min: 6,  watt: 150, hr: 139, lac: 0, borg: 0, cadence: 0 },
  { min: 7,  watt: 170, hr: 150, lac: 0, borg: 0, cadence: 0 },
  { min: 8,  watt: 190, hr: 160, lac: 0, borg: 0, cadence: 0 },
  { min: 9,  watt: 210, hr: 168, lac: 0, borg: 0, cadence: 0 },
  { min: 10, watt: 230, hr: 177, lac: 0, borg: 0, cadence: 0 },
  { min: 11, watt: 250, hr: 184, lac: 0, borg: 0, cadence: 0 },
]

const SEED_ROWS: RawDataPoint[] = [
  { min: 0,  watt: 0,   hr: 72,  lac: 0.7, borg: 0,  cadence: 0  },
  { min: 1,  watt: 80,  hr: 81,  lac: 0,   borg: 0,  cadence: 0  },
  { min: 2,  watt: 80,  hr: 83,  lac: 0,   borg: 0,  cadence: 0  },
  { min: 3,  watt: 80,  hr: 89,  lac: 0.9, borg: 9,  cadence: 89 },
  { min: 4,  watt: 110, hr: 92,  lac: 0,   borg: 0,  cadence: 0  },
  { min: 5,  watt: 110, hr: 94,  lac: 0,   borg: 0,  cadence: 0  },
  { min: 6,  watt: 110, hr: 100, lac: 1.8, borg: 11, cadence: 90 },
  { min: 7,  watt: 140, hr: 103, lac: 0,   borg: 0,  cadence: 0  },
  { min: 8,  watt: 140, hr: 105, lac: 0,   borg: 0,  cadence: 0  },
  { min: 9,  watt: 140, hr: 111, lac: 3.2, borg: 12, cadence: 89 },
  { min: 10, watt: 170, hr: 114, lac: 0,   borg: 0,  cadence: 0  },
  { min: 11, watt: 170, hr: 116, lac: 0,   borg: 0,  cadence: 0  },
  { min: 12, watt: 170, hr: 122, lac: 5.1, borg: 14, cadence: 89 },
  { min: 13, watt: 200, hr: 125, lac: 0,   borg: 0,  cadence: 0  },
  { min: 14, watt: 200, hr: 127, lac: 0,   borg: 0,  cadence: 0  },
  { min: 15, watt: 200, hr: 133, lac: 7.4, borg: 15, cadence: 90 },
]

// ── Stage Timer ───────────────────────────────────────────────────────

function StageTimer({
  intervalSeconds,
  totalStages,
  onStageChange,
}: {
  intervalSeconds: number
  totalStages: number
  onStageChange: (stage: number) => void
}) {
  const [stage, setStage] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  const onStageChangeRef = useRef(onStageChange)
  useEffect(() => { onStageChangeRef.current = onStageChange })

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  useEffect(() => {
    if (running && elapsed > 0 && elapsed >= intervalSeconds * 60) {
      const next = Math.min(stage + 1, totalStages)
      setElapsed(0)
      setStage(next)
      onStageChangeRef.current(next)
    }
  }, [elapsed, running, intervalSeconds, totalStages, stage])

  function reset() {
    setRunning(false)
    setElapsed(0)
    setStage(1)
    onStageChange(1)
  }

  const remaining = Math.max(0, intervalSeconds * 60 - elapsed)
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-3 flex items-center gap-3 shadow-sm">
      <div className="flex-1 text-center">
        <span className="text-sm font-bold text-secondary uppercase tracking-widest block leading-none mb-1.5">
          Stage {stage} / {totalStages}
        </span>
        <span className={`text-3xl font-black tabular-nums tracking-tighter leading-none ${running ? "text-primary" : "text-[#D1D1D6]"}`}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>
      <button type="button" onClick={() => setRunning((r) => !r)}
        className="p-2.5 rounded-xl hover:bg-[#F5F5F7] text-secondary transition-colors">
        {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <button type="button" onClick={reset}
        className="p-2 rounded-xl hover:bg-[#F5F5F7] text-secondary transition-colors">
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Confirm leave dialog ──────────────────────────────────────────────

function ConfirmLeaveDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4">
        <h2 className="text-base font-bold text-[#1D1D1F]">Osparade ändringar</h2>
        <p className="text-sm text-[#515154]">
          Du har inmatad data som inte sparats. Om du lämnar försvinner all data.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-sm font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
          >
            Stanna kvar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-[#FF3B30] text-white text-sm font-semibold hover:bg-[#d93025] transition-colors"
          >
            Lämna ändå
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

const EMPTY_COACH_ASSESSMENT: CoachAssessment = {
  atEffektWatt: null,
  ltEffektWatt: null,
  granLagMedel: null,
  nedreGrans: null,
  estMaxPuls: null,
  hogstaUpnaddPuls: null,
  atPuls: null,
  ltPuls: null,
  granLagMedelPuls: null,
  nedreGransPuls: null,
}

export function LiveRecordingView({ athletes, defaultAthleteId, defaultTestLeader, coachUid, guestMode = false, onGuestSessionEnd }: LiveRecordingViewProps) {
  const router = useRouter()
  const [step, setStep] = useState<"setup" | "recording">("setup")
  const [saving, setSaving] = useState(false)
  const [guestDownloadLoading, setGuestDownloadLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const pendingBack = useRef<(() => void) | null>(null)

  // ── Load coach display name for testLeader pre-fill ──────────────
  useEffect(() => {
    if (!coachUid) return
    getCoachProfileClient(coachUid).then((p) => {
      if (p?.displayName) {
        setForm((prev) => ({
          ...prev,
          testLeader: prev.testLeader === (defaultTestLeader ?? "") ? p.displayName : prev.testLeader,
        }))
      }
    }).catch(() => {})
  }, [coachUid]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Setup form ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    athleteId: defaultAthleteId ?? "",
    sport: "cykel" as SportType,
    testType: "troskeltest" as TestType,
    protocol: "standard_3min" as ProtocolType,
    testLocation: "" as ClinicLocation | "",
    testLeader: defaultTestLeader ?? "",
    testDate: new Date().toISOString().split("T")[0],
    notes: "",
    startWatt: "40",
    stepSize: "20",
    testDuration: "3",
    bodyWeight: "",
    heightCm: "",
    // Fartbaserade parametrar (löpning, skidor)
    startSpeed: "8",
    speedIncrement: "1",
    incline: "2",
  })

  // ── Bike settings ─────────────────────────────────────────────────
  const [showBikeSettings, setShowBikeSettings] = useState(false)
  const [bikeSettings, setBikeSettings] = useState<Partial<BikeSettings>>({})

  function updateBike(field: keyof BikeSettings, value: string) {
    setBikeSettings((prev) => ({
      ...prev,
      [field]: value === "" ? null : (["saddleVerticalMm", "saddleHorizontalMm", "handlebarVerticalMm", "handlebarHorizontalMm"].includes(field)
        ? (parseFloat(value) || null)
        : value),
    }))
  }

  // ── VO2max exhaustion inputs ──────────────────────────────────────
  const [exhaustionLacStr, setExhaustionLacStr] = useState("")
  const [exhaustionBorg, setExhaustionBorg] = useState("")
  const [exhaustionTimeMins, setExhaustionTimeMins] = useState("")
  const [exhaustionTimeSecs, setExhaustionTimeSecs] = useState("")
  const [exhaustionWattStr, setExhaustionWattStr] = useState("")
  const [manualVo2MaxStr, setManualVo2MaxStr] = useState("")      // ml/kg/min
  const [manualAbsVo2Str, setManualAbsVo2Str] = useState("")      // ml O₂/min (Syreupptag)

  // ── Wingate-specific state ────────────────────────────────────────
  const [wingateResults, setWingateResults] = useState({ peakPower: "", meanPower: "", minPower: "" })
  const [wingateParams, setWingateParams] = useState({
    saddleVerticalMm: "", saddleHorizontalMm: "", startCadenceRpm: "", bodyWeightPercent: "10",
  })

  async function handleWingateSave() {
    if (guestMode) return
    const peak = parseFloat(wingateResults.peakPower)
    const mean = parseFloat(wingateResults.meanPower)
    const min = parseFloat(wingateResults.minPower)
    if (!peak || !mean || !min) { setError("Fyll i Peak, Medel och Min-effekt"); return }
    setSaving(true)
    setError(null)
    try {
      await createWingateTestAction({
        athleteId: form.athleteId,
        testLocation: (form.testLocation || "stockholm") as ClinicLocation,
        testLeader: form.testLeader,
        testDate: form.testDate,
        notes: form.notes,
        wingateData: { peakPower: peak, meanPower: mean, minPower: min },
        wingateInputParams: {
          saddleVerticalMm: parseInt(wingateParams.saddleVerticalMm) || null,
          saddleHorizontalMm: parseInt(wingateParams.saddleHorizontalMm) || null,
          startCadenceRpm: parseInt(wingateParams.startCadenceRpm) || null,
          bodyWeightPercent: parseFloat(wingateParams.bodyWeightPercent) || 10,
          bodyWeight: parseFloat(form.bodyWeight) || null,
        },
      })
    } catch (e: unknown) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e
      setError("Något gick fel. Försök igen.")
      setSaving(false)
    }
  }

  // ── Coach assessment ──────────────────────────────────────────────
  const [coachAssessment, setCoachAssessment] = useState<CoachAssessment>(EMPTY_COACH_ASSESSMENT)

  function updateCoach(field: keyof CoachAssessment, value: string) {
    setCoachAssessment((prev) => ({
      ...prev,
      [field]: value === "" ? null : (parseFloat(value) || null),
    }))
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function changeSport(sport: SportType) {
    const nextTestType = sport !== "cykel" && form.testType === "wingate" ? "troskeltest" : form.testType
    const firstProtocol = PROTOCOL_OPTIONS[sport][0].value
    const defaults = nextTestType === "vo2max"
      ? PROTOCOL_DEFAULTS["ramp_test"]
      : PROTOCOL_DEFAULTS[firstProtocol]
    const protocol = nextTestType === "vo2max" ? "ramp_test" : firstProtocol
    const duration = nextTestType === "vo2max"
      ? defaults.testDuration
      : (SPORT_STEP_DURATION[sport] ?? defaults.testDuration)
    setForm((f) => ({
      ...f,
      sport,
      testType: nextTestType,
      protocol,
      startWatt: String(defaults.startWatt),
      stepSize: String(defaults.stepSize),
      testDuration: String(duration),
    }))
    if (sport !== "cykel") setShowBikeSettings(false)
  }

  function changeProtocol(protocol: ProtocolType) {
    const defaults = PROTOCOL_DEFAULTS[protocol]
    setForm((f) => ({
      ...f,
      protocol,
      startWatt: String(defaults.startWatt),
      stepSize: String(defaults.stepSize),
      testDuration: String(defaults.testDuration),
    }))
  }

  function changeTestType(testType: TestType) {
    if (testType === "wingate") {
      setForm((f) => ({ ...f, testType: "wingate" }))
      return
    }
    if (testType === "vo2max") {
      const defaults = PROTOCOL_DEFAULTS["ramp_test"]
      setForm((f) => ({
        ...f,
        testType,
        protocol: "ramp_test",
        startWatt: String(defaults.startWatt),
        stepSize: String(defaults.stepSize),
        testDuration: String(defaults.testDuration),
      }))
    } else if (testType === "troskeltest") {
      const defaults = PROTOCOL_DEFAULTS["standard_3min"]
      const duration = SPORT_STEP_DURATION[form.sport] ?? defaults.testDuration
      setForm((f) => ({
        ...f,
        testType,
        protocol: "standard_3min",
        startWatt: String(defaults.startWatt),
        stepSize: String(defaults.stepSize),
        testDuration: String(duration),
      }))
    } else {
      setForm((f) => ({ ...f, testType }))
    }
  }

  // ── Raw data rows ─────────────────────────────────────────────────
  const [rows, setRows] = useState<RawDataPoint[]>([])
  const [activeRow, setActiveRow] = useState<number | null>(null)
  const [lacStrings, setLacStrings] = useState<Record<number, string>>({})
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // ── Unsaved-changes guard ─────────────────────────────────────────
  const isDirty =
    step === "recording" && (
      rows.some((r) => r.hr > 0 || r.lac > 0) ||
      Object.values(wingateResults).some((v) => v !== "") ||
      exhaustionLacStr !== "" || exhaustionBorg !== "" || exhaustionWattStr !== ""
    )

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  // Push a dummy history entry when entering recording so we can intercept back
  useEffect(() => {
    if (step === "recording") {
      window.history.pushState({ guardedStep: true }, "")
    }
  }, [step])

  // Intercept browser back button while in recording step
  useEffect(() => {
    const handler = () => {
      if (step !== "recording") return
      if (isDirty) {
        // Re-push so back button can be intercepted again if user cancels
        window.history.pushState({ guardedStep: true }, "")
        pendingBack.current = () => setStep("setup")
        setShowConfirm(true)
      } else {
        setStep("setup")
      }
    }
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [step, isDirty])

  function requestBack(onConfirmed: () => void) {
    if (isDirty) {
      pendingBack.current = onConfirmed
      setShowConfirm(true)
    } else {
      onConfirmed()
    }
  }

  function getEditableFields(row: RawDataPoint, dur: number): string[] {
    if (lacEnabled(row, dur) && borgEnabled(row, dur)) return ["hr", "lac", "borg", "cadence"]
    if (lacEnabled(row, dur)) return ["hr", "lac"]
    return ["hr"]
  }

  function focusNextInput(rowIdx: number, field: string) {
    const dur = parseInt(form.testDuration) || 3
    const editableFields = getEditableFields(rows[rowIdx], dur)
    const nextField = editableFields[editableFields.indexOf(field) + 1]
    if (nextField) {
      inputRefs.current.get(`${rowIdx}-${nextField}`)?.focus()
    } else {
      // Move to HR of next row
      inputRefs.current.get(`${rowIdx + 1}-hr`)?.focus()
    }
  }

  function makeRef(rowIdx: number, field: string) {
    return (el: HTMLInputElement | null) => {
      if (el) inputRefs.current.set(`${rowIdx}-${field}`, el)
      else inputRefs.current.delete(`${rowIdx}-${field}`)
    }
  }

  function startRecording() {
    const dur = parseInt(form.testDuration) || 3
    if (isSpeedBased(form.sport)) {
      const start = parseFloat(form.startSpeed) || 8
      const inc = parseFloat(form.speedIncrement) || 1
      setRows(generateSpeedRows(start, inc, dur, 10))
    } else {
      const start = parseInt(form.startWatt) || 40
      const step = parseInt(form.stepSize) || 20
      setRows(generateMinuteRows(start, step, dur, 10))
    }
    setStep("recording")
  }

  function updateRow(index: number, field: keyof RawDataPoint, value: string) {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: parseFloat(value) || 0 }
      return next
    })
  }

  function removeStage(stageEndMin: number) {
    const stageStart = stageEndMin - dur + 1
    setRows((prev) => {
      const without = prev.filter((r) => r.min < stageStart || r.min > stageEndMin)
      return without.map((r) => r.min > stageEndMin ? { ...r, min: r.min - dur } : r)
    })
    setLacStrings({})
    setActiveRow(null)
  }

  function addStage() {
    const dur = parseInt(form.testDuration) || 3
    const last = rows[rows.length - 1]
    const lastMin = last?.min ?? 0
    if (isSpeedBased(form.sport)) {
      const inc = parseFloat(form.speedIncrement) || 1
      const nextSpeed = Math.round(((last?.speed ?? parseFloat(form.startSpeed) ?? 8) + inc) * 10) / 10
      const newRows = Array.from({ length: dur }, (_, i) => ({
        min: lastMin + i + 1, watt: 0, speed: nextSpeed, hr: 0, lac: 0, borg: 0, cadence: 0,
      }))
      setRows((prev) => [...prev, ...newRows])
    } else {
      const step = parseInt(form.stepSize) || 20
      const nextWatt = (last?.watt ?? parseInt(form.startWatt) ?? 40) + step
      const newRows = Array.from({ length: dur }, (_, i) => ({
        min: lastMin + i + 1, watt: nextWatt, hr: 0, lac: 0, borg: 0, cadence: 0,
      }))
      setRows((prev) => [...prev, ...newRows])
    }
  }

  // ── Chart data (all minute rows for staircase chart) ─────────────
  const dur = parseInt(form.testDuration) || 3

  async function handleGuestDownloadPDF() {
    const athlete = athletes.find((a) => a.id === form.athleteId)
    const athleteName = athlete ? fullName(athlete.firstName, athlete.lastName) : "Gäst"
    const gender = (athlete?.gender ?? "") as "M" | "K" | ""
    const finalRows = rows.filter((p) => p.hr > 0 || p.lac > 0 || p.watt > 0)
    const testDateTs = { seconds: Math.floor(new Date(form.testDate).getTime() / 1000), nanoseconds: 0 }
    const now = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    const lacRows = finalRows.filter((r) => r.lac > 0)
    const atWatt = lacRows.length >= 2 ? interpolateLactateThreshold(lacRows, 2) : null
    const ltWatt = lacRows.length >= 2 ? interpolateLactateThreshold(lacRows, 4) : null
    const maxHR = finalRows.reduce((m, r) => r.hr > m ? r.hr : m, 0) || null
    const maxLactate = finalRows.reduce((m, r) => r.lac > m ? r.lac : m, 0) || null

    const guestTest: ReportSerializedTest = {
      id: "guest",
      athleteId: form.athleteId,
      coachId: coachUid ?? "",
      clinicId: "",
      testDate: testDateTs,
      createdAt: now,
      sport: form.sport,
      testType: form.testType,
      protocol: form.protocol,
      testLocation: (form.testLocation || "stockholm") as import("@/types").ClinicLocation,
      testLeader: form.testLeader,
      inputParams: {
        startWatt: parseInt(form.startWatt) || 0,
        stepSize: parseInt(form.stepSize) || 0,
        startSpeed: parseFloat(form.startSpeed) || undefined,
        speedIncrement: parseFloat(form.speedIncrement) || undefined,
        incline: parseFloat(form.incline) || undefined,
        testDuration: parseInt(form.testDuration) || 3,
        bodyWeight: parseFloat(form.bodyWeight) || null,
        heightCm: parseFloat(form.heightCm) || null,
      },
      results: { vo2Max: null, atWatt: atWatt ?? null, ltWatt: ltWatt ?? null, maxHR, maxLactate },
      rawData: finalRows,
      notes: form.notes,
    }

    setGuestDownloadLoading(true)
    try {
      const blob = await generatePDF(guestTest, athleteName, gender, coachUid)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${athleteName.replace(/\s+/g, "-").toLowerCase()}-${form.testDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Guest PDF generation failed:", err)
    } finally {
      setGuestDownloadLoading(false)
    }
  }

  async function handleGuestEnd() {
    if (onGuestSessionEnd) await onGuestSessionEnd()
    router.back()
  }

  async function handleSave() {
    if (guestMode) return
    if (!form.athleteId) { setError("Välj en atlet"); return }
    setSaving(true)
    setError(null)

    try {
      const isVo2 = form.testType === "vo2max"

      // For VO2max: append exhaustion row with lactate + borg if entered
      let finalRows = rows.filter(p => p.hr > 0 || p.lac > 0 || p.watt > 0)
      if (isVo2) {
        const exhaustionLac = parseFloat(exhaustionLacStr.replace(",", "."))
        const exhaustionBorgNum = parseInt(exhaustionBorg) || 0
        if (!isNaN(exhaustionLac) && exhaustionLac > 0) {
          const lastRow = finalRows[finalRows.length - 1]
          finalRows = [
            ...finalRows,
            {
              min: (lastRow?.min ?? 0) + 1,
              watt: lastRow?.watt ?? 0,
              hr: lastRow?.hr ?? 0,
              lac: exhaustionLac,
              borg: exhaustionBorgNum,
              cadence: 0,
            },
          ]
        }
      }

      // Calculate VO2max — manual override takes priority over formula
      let vo2Max: number | undefined
      if (isVo2) {
        const bodyWeightNum = parseFloat(form.bodyWeight)
        const manualRel = parseFloat(manualVo2MaxStr)
        if (manualRel > 0) {
          vo2Max = manualRel
        } else {
          const manualAbs = parseFloat(manualAbsVo2Str)
          if (manualAbs > 0 && bodyWeightNum > 0) {
            vo2Max = Math.round(manualAbs / bodyWeightNum)
          } else if (bodyWeightNum > 0) {
            const overrideWatt = parseFloat(exhaustionWattStr)
            const derivedWatt = Math.max(...finalRows.filter(r => r.hr > 0).map(r => r.watt), 0)
            const maxWatt = overrideWatt > 0 ? overrideWatt : derivedWatt
            if (maxWatt > 0) vo2Max = calculateVo2Max(maxWatt, bodyWeightNum)
          }
        }
      }

      // Prepend exhaustion time to notes for VO2max tests
      let notesValue = form.notes
      if (isVo2 && (exhaustionTimeMins || exhaustionTimeSecs)) {
        const mm = exhaustionTimeMins.padStart(2, "0")
        const ss = (exhaustionTimeSecs || "0").padStart(2, "0")
        const tidLine = `Utmattning tid: ${mm}:${ss}`
        notesValue = notesValue ? `${tidLine}\n${notesValue}` : tidLine
      }

      const hasCoachData = Object.values(coachAssessment).some(v => v !== null)
      await createTestAction({
        athleteId: form.athleteId,
        sport: form.sport,
        testType: form.testType,
        protocol: form.protocol,
        testLocation: (form.testLocation || "stockholm") as ClinicLocation,
        testLeader: form.testLeader,
        testDate: form.testDate,
        ...(isSpeedBased(form.sport) ? {
          startSpeed: parseFloat(form.startSpeed) || 0,
          speedIncrement: parseFloat(form.speedIncrement) || 0,
          incline: parseFloat(form.incline) || 0,
        } : {
          startWatt: parseInt(form.startWatt) || 0,
          stepSize: parseInt(form.stepSize) || 0,
        }),
        testDuration: parseInt(form.testDuration) || 0,
        bodyWeight: parseFloat(form.bodyWeight) || undefined,
        heightCm: parseFloat(form.heightCm) || undefined,
        notes: notesValue,
        rawData: finalRows,
        vo2Max,
        settings: showBikeSettings && Object.keys(bikeSettings).length > 0
          ? { bike: bikeSettings as BikeSettings }
          : undefined,
        coachAssessment: !isVo2 && hasCoachData ? coachAssessment : undefined,
      })
    } catch (e: unknown) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e
      setError("Något gick fel. Försök igen.")
      setSaving(false)
    }
  }

  // ── Setup screen ──────────────────────────────────────────────────
  const lockedAthlete = defaultAthleteId
    ? athletes.find((a) => a.id === defaultAthleteId)
    : null

  if (step === "setup") {
    return (
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Nytt test</h1>
          <p className="text-secondary text-base">Fyll i uppgifterna nedan innan du startar.</p>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">

            {/* Atlet */}
            <div className="space-y-1">
              <Label>Atlet</Label>
              {lockedAthlete ? (
                <div className="px-3 py-2 rounded-xl bg-[#F5F5F7] text-sm font-medium text-[#1D1D1F]">
                  {fullName(lockedAthlete.firstName, lockedAthlete.lastName)}
                </div>
              ) : (
                <Select id="athleteId" value={form.athleteId} onChange={(e) => update("athleteId", e.target.value)} required>
                  <option value="">Välj atlet…</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>{fullName(a.firstName, a.lastName)}</option>
                  ))}
                </Select>
              )}
            </div>

            {/* Val 1 — Gren */}
            <div className="space-y-1.5">
              <Label>Val 1 — Gren</Label>
              <div className="flex flex-wrap gap-1.5">
                {SPORT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSport(s)}
                    className={`px-4 py-2 rounded-full text-base font-medium border transition-colors ${
                      form.sport === s
                        ? "bg-[#007AFF] text-white border-[#007AFF]"
                        : "bg-white text-[#86868B] border-[hsl(var(--border))] hover:border-[#86868B]"
                    }`}
                  >
                    {SPORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Cykelinställningar (only when sport = cykel) */}
            {form.sport === "cykel" && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowBikeSettings((v) => !v)}
                  className="text-sm text-[#007AFF] font-medium hover:text-[#0066d6]"
                >
                  {showBikeSettings ? "Dölj cykelinställningar" : "+ Lägg till cykelinställningar"}
                </button>
                {showBikeSettings && (
                  <div className="mt-3 grid grid-cols-2 gap-3 border border-[hsl(var(--border))] rounded-xl p-4">
                    <div className="col-span-2 text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-1">
                      Cykelinställningar
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bikeType">Cykeltyp</Label>
                      <Input
                        id="bikeType"
                        value={bikeSettings.bikeType ?? ""}
                        onChange={(e) => updateBike("bikeType", e.target.value)}
                        placeholder="t.ex. Landsvägscykel"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pedalType">Pedaltyp</Label>
                      <Input
                        id="pedalType"
                        value={bikeSettings.pedalType ?? ""}
                        onChange={(e) => updateBike("pedalType", e.target.value)}
                        placeholder="t.ex. SPD, Look"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="saddleV">Sadel vertikal (mm)</Label>
                      <Input
                        id="saddleV"
                        type="number"
                        value={bikeSettings.saddleVerticalMm ?? ""}
                        onChange={(e) => updateBike("saddleVerticalMm", e.target.value)}
                        placeholder="t.ex. 720"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="saddleH">Sadel horisontell (mm)</Label>
                      <Input
                        id="saddleH"
                        type="number"
                        value={bikeSettings.saddleHorizontalMm ?? ""}
                        onChange={(e) => updateBike("saddleHorizontalMm", e.target.value)}
                        placeholder="t.ex. 0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="handlebarV">Styre vertikal (mm)</Label>
                      <Input
                        id="handlebarV"
                        type="number"
                        value={bikeSettings.handlebarVerticalMm ?? ""}
                        onChange={(e) => updateBike("handlebarVerticalMm", e.target.value)}
                        placeholder="t.ex. 650"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="handlebarH">Styre horisontell (mm)</Label>
                      <Input
                        id="handlebarH"
                        type="number"
                        value={bikeSettings.handlebarHorizontalMm ?? ""}
                        onChange={(e) => updateBike("handlebarHorizontalMm", e.target.value)}
                        placeholder="t.ex. 450"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Val 2 + Val 3 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="testType">Val 2 — Testtyp</Label>
                <Select id="testType" value={form.testType} onChange={(e) => changeTestType(e.target.value as TestType)}>
                  {TESTTYPE_OPTIONS.filter((t) => t !== "wingate" || form.sport === "cykel").map((t) => (
                    <option key={t} value={t}>{TESTTYPE_LABELS[t]}</option>
                  ))}
                </Select>
              </div>
              {form.testType !== "wingate" && (
                <div className="space-y-1">
                  <Label htmlFor="protocol">Val 3 — Protokoll<InfoTooltip text="Standard 3-minprotokoll är rekommenderat för laktattröskeltest. Ramp-test används för VO2max." /></Label>
                  <Select id="protocol" value={form.protocol} onChange={(e) => changeProtocol(e.target.value as ProtocolType)}>
                    {PROTOCOL_OPTIONS[form.sport].map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {/* Wingate-inställningar */}
            {form.testType === "wingate" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="wingatesSaddleV">Sadel vertikal (mm)</Label>
                  <Input id="wingatesSaddleV" type="text" inputMode="numeric" placeholder="t.ex. 720"
                    value={wingateParams.saddleVerticalMm}
                    onChange={(e) => setWingateParams((p) => ({ ...p, saddleVerticalMm: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wingatesSaddleH">Sadel horisontell (mm)</Label>
                  <Input id="wingatesSaddleH" type="text" inputMode="numeric" placeholder="t.ex. 3"
                    value={wingateParams.saddleHorizontalMm}
                    onChange={(e) => setWingateParams((p) => ({ ...p, saddleHorizontalMm: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wingatesCadence">Startkadens (rpm)</Label>
                  <Input id="wingatesCadence" type="text" inputMode="numeric" placeholder="t.ex. 110"
                    value={wingateParams.startCadenceRpm}
                    onChange={(e) => setWingateParams((p) => ({ ...p, startCadenceRpm: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wingatesBwPct">% kroppsvikt</Label>
                  <Input id="wingatesBwPct" type="text" inputMode="decimal"
                    value={wingateParams.bodyWeightPercent}
                    onChange={(e) => setWingateParams((p) => ({ ...p, bodyWeightPercent: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Protokollparametrar */}
            {form.testType === "wingate" ? null : isSpeedBased(form.sport) ? (
              <div className="space-y-3">
                {form.testType === "vo2max" ? (
                  /* VO2 max löpband: fri startfart + steg-presets */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="startSpeed">Startfart (km/h)</Label>
                        <Input id="startSpeed" type="text" inputMode="decimal" value={form.startSpeed} onChange={(e) => update("startSpeed", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="incline">Lutning (%)</Label>
                        <Input id="incline" type="text" inputMode="decimal" value={form.incline} onChange={(e) => update("incline", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ökning per steg (km/h)</Label>
                      <div className="flex gap-2">
                        {SPEED_VO2_STEP_SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => update("speedIncrement", String(s))}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                              form.speedIncrement === String(s)
                                ? "bg-[#007AFF] text-white border-[#007AFF]"
                                : "bg-white text-secondary border-[hsl(var(--border))] hover:border-secondary"
                            }`}
                          >
                            +{s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Tröskeltest löpband: preset-knappar för startfart, ökning och lutning */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Startfart (km/h)</Label>
                        <div className="flex gap-2">
                          {[6, 8, 10, 12].map((s) => (
                            <button key={s} type="button" onClick={() => update("startSpeed", String(s))}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.startSpeed === String(s) ? "bg-[#007AFF] text-white border-[#007AFF]" : "bg-white text-secondary border-[hsl(var(--border))] hover:border-secondary"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ökning/steg (km/h)</Label>
                        <div className="flex gap-2">
                          {[0.5, 1, 1.5, 2].map((s) => (
                            <button key={s} type="button" onClick={() => update("speedIncrement", String(s))}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.speedIncrement === String(s) ? "bg-[#007AFF] text-white border-[#007AFF]" : "bg-white text-secondary border-[hsl(var(--border))] hover:border-secondary"}`}>
                              +{s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lutning (%)</Label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 5].map((s) => (
                          <button key={s} type="button" onClick={() => update("incline", String(s))}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.incline === String(s) ? "bg-[#007AFF] text-white border-[#007AFF]" : "bg-white text-secondary border-[hsl(var(--border))] hover:border-secondary"}`}>
                            {s}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : form.testType === "vo2max" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="startWatt">Start (W)</Label>
                    <Input id="startWatt" type="number" value={form.startWatt} onChange={(e) => update("startWatt", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="testDuration">Min/steg</Label>
                    <Input id="testDuration" type="number" value={form.testDuration} onChange={(e) => update("testDuration", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Steg (W)</Label>
                  <div className="flex gap-2">
                    {WATT_VO2_STEP_SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update("stepSize", String(s))}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          form.stepSize === String(s)
                            ? "bg-[#007AFF] text-white border-[#007AFF]"
                            : "bg-white text-secondary border-[hsl(var(--border))] hover:border-secondary"
                        }`}
                      >
                        +{s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : form.protocol === "standard_3min" ? (
              <div className="space-y-1.5">
                <Label>Start & steg</Label>
                <div className="flex gap-2">
                  {WATT_PRESETS.map((p) => {
                    const active = form.startWatt === String(p.startWatt) && form.stepSize === String(p.stepSize)
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, startWatt: String(p.startWatt), stepSize: String(p.stepSize) }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          active
                            ? "bg-[#007AFF] text-white border-[#007AFF]"
                            : "bg-white text-secondary border-[hsl(var(--border))] hover:border-secondary"
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="startWatt">Start (W)<InfoTooltip text="Första stegets belastning. Vanligtvis 50–100 W beroende på atletens nivå." /></Label>
                  <Input id="startWatt" type="number" value={form.startWatt} onChange={(e) => update("startWatt", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stepSize">Steg (W)<InfoTooltip text="Effektökning per steg. Vanligtvis 20–30 W för tröskeltest." /></Label>
                  <Input id="stepSize" type="number" value={form.stepSize} onChange={(e) => update("stepSize", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="testDuration">Min/steg<InfoTooltip text="Antal minuter per belastningssteg. 3 min är standard för cykel." /></Label>
                  <Input id="testDuration" type="number" value={form.testDuration} onChange={(e) => update("testDuration", e.target.value)} />
                </div>
              </div>
            )}

            {/* Vikt + Längd */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bodyWeight">Vikt (kg) <span className="text-secondary font-normal">– idag</span><InfoTooltip text="Atletens kroppsvikt vid testtillfället. Används för relativa effektvärden (W/kg)." /></Label>
                <Input id="bodyWeight" type="number" step="0.1" value={form.bodyWeight} onChange={(e) => update("bodyWeight", e.target.value)} placeholder="t.ex. 72,5" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="heightCm">Längd (cm)</Label>
                <Input id="heightCm" type="number" value={form.heightCm} onChange={(e) => update("heightCm", e.target.value)} placeholder="t.ex. 178" />
              </div>
            </div>

            {/* Plats + Testledare */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="testLocation">Plats</Label>
                <Select id="testLocation" value={form.testLocation} onChange={(e) => update("testLocation", e.target.value)}>
                  <option value="">Välj plats…</option>
                  {CLINIC_LOCATIONS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="testLeader">Testledare</Label>
                <Input id="testLeader" value={form.testLeader} onChange={(e) => update("testLeader", e.target.value)} placeholder="Namn eller e-post" />
              </div>
            </div>

            {/* Datum + Anteckningar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="testDate">Datum</Label>
                <Input id="testDate" type="date" value={form.testDate} onChange={(e) => update("testDate", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Anteckningar</Label>
                <Input id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Valfritt…" />
              </div>
            </div>

            <Button className="w-full" onClick={startRecording} disabled={!form.athleteId}>
              Starta Test
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Wingate recording screen ──────────────────────────────────────
  if (step === "recording" && form.testType === "wingate") {
    const wingateAthlete = athletes.find((a) => a.id === form.athleteId)
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {guestMode && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Gästläge:</span> Inga data sparas. Ladda ned resultaten som PDF när testet är klart.
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Wingate — Cykel</h1>
            <p className="text-base text-[#515154] mt-0.5">
              {wingateAthlete ? `${wingateAthlete.firstName} ${wingateAthlete.lastName}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => requestBack(() => setStep("setup"))}>Tillbaka</Button>
            {guestMode ? (
              <>
                <Button variant="outline" onClick={handleGuestDownloadPDF} disabled={guestDownloadLoading}>
                  {guestDownloadLoading ? "Genererar PDF…" : "Ladda ned PDF"}
                </Button>
                <Button variant="outline" onClick={handleGuestEnd}>Avsluta session</Button>
              </>
            ) : (
              <Button onClick={handleWingateSave} disabled={saving}>
                {saving ? "Sparar…" : "Spara test"}
              </Button>
            )}
          </div>
        </div>

        <WingateTimer />

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-5">
          <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Effektresultat (W)</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="wgPeak">Peak</Label>
              <Input id="wgPeak" type="text" inputMode="numeric" placeholder="W"
                value={wingateResults.peakPower}
                onChange={(e) => setWingateResults((r) => ({ ...r, peakPower: e.target.value }))}
                className="text-center text-lg font-bold" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wgMean">Medel</Label>
              <Input id="wgMean" type="text" inputMode="numeric" placeholder="W"
                value={wingateResults.meanPower}
                onChange={(e) => setWingateResults((r) => ({ ...r, meanPower: e.target.value }))}
                className="text-center text-lg font-bold" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wgMin">Min</Label>
              <Input id="wgMin" type="text" inputMode="numeric" placeholder="W"
                value={wingateResults.minPower}
                onChange={(e) => setWingateResults((r) => ({ ...r, minPower: e.target.value }))}
                className="text-center text-lg font-bold" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
          <Label htmlFor="wgNotes">Anteckningar</Label>
          <textarea id="wgNotes" value={form.notes} onChange={(e) => update("notes", e.target.value)}
            rows={3} placeholder="Fritext…"
            className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[#F5F5F7] px-3 py-2 text-base text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none" />
        </div>

        {error && <p className="text-sm text-[hsl(var(--destructive))] text-center">{error}</p>}
        {showConfirm && <ConfirmLeaveDialog onConfirm={() => { setShowConfirm(false); pendingBack.current?.() }} onCancel={() => setShowConfirm(false)} />}
      </div>
    )
  }

  // ── Recording screen ──────────────────────────────────────────────
  const selectedAthlete = athletes.find((a) => a.id === form.athleteId)
  const stageCount = rows.filter((r) => borgEnabled(r, dur)).length

  return (
    <div className="space-y-5">
      {guestMode && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Gästläge:</span> Inga data sparas. Ladda ned resultaten som PDF när testet är klart.
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {SPORT_LABELS[form.sport]} — {TESTTYPE_LABELS[form.testType]}
          </h1>
          <p className="text-base text-secondary mt-0.5">
            {selectedAthlete && <span>{fullName(selectedAthlete.firstName, selectedAthlete.lastName)} · </span>}
            {PROTOCOL_OPTIONS[form.sport].find((p) => p.value === form.protocol)?.label}
            {" · "}{isSpeedBased(form.sport)
              ? `${form.startSpeed} km/h +${form.speedIncrement}/${form.testDuration}min · ${form.incline}% lutning`
              : `${form.startWatt}W +${form.stepSize}W/${form.testDuration}min`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StageTimer
            intervalSeconds={parseInt(form.testDuration) || 3}
            totalStages={stageCount || 1}
            onStageChange={() => {}}
          />
          {guestMode ? (
            <>
              <Button variant="outline" onClick={handleGuestDownloadPDF} disabled={guestDownloadLoading}>
                {guestDownloadLoading ? "Genererar PDF…" : "Ladda ned PDF"}
              </Button>
              <Button variant="outline" onClick={handleGuestEnd}>Avsluta session</Button>
            </>
          ) : (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Sparar…" : "Spara test"}
              </Button>
              <Button variant="outline" onClick={() => requestBack(() => setStep("setup"))}>
                Tillbaka
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr] items-stretch h-[calc(100vh-180px)]">
        {/* Left column: Data table */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-white shadow-sm">
          <div className="border-b border-[hsl(var(--border))]/60 bg-[#F5F5F7]/50 px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Minutdata</p>
            <button
              type="button"
              onClick={() => {
                if (form.testType === "vo2max") {
                  setForm((f) => ({ ...f, startWatt: "50", stepSize: "20", testDuration: "1" }))
                  setRows(VO2MAX_SEED_ROWS)
                  setExhaustionLacStr("13.2")
                  setExhaustionBorg("20")
                  setExhaustionTimeMins("11")
                  setExhaustionTimeSecs("32")
                  setExhaustionWattStr("250")
                } else {
                  setForm((f) => ({ ...f, startWatt: "80", stepSize: "30", testDuration: "3" }))
                  setRows(SEED_ROWS)
                  setLacStrings({})
                }
              }}
              className="text-sm text-[#007AFF] hover:text-[#0066d6] font-medium"
            >
              Fyll i exempeldata
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-base table-fixed min-w-[420px]">
              <thead>
                <tr className="text-sm font-black uppercase tracking-wider text-[#1D1D1F] border-b border-[hsl(var(--border))]/60">
                  <th className="px-3 py-3 text-left w-14">Min</th>
                  <th className="px-3 py-3 text-right w-16">{isSpeedBased(form.sport) ? "km/h" : "W"}</th>
                  <th className="px-3 py-3 text-right w-20">Puls</th>
                  {form.testType !== "vo2max" && <>
                    <th className="px-3 py-3 text-right w-20">Laktat</th>
                    <th className="px-3 py-3 text-right w-16">Borg</th>
                    <th className="px-3 py-3 text-right w-20">Kad.</th>
                  </>}
                  <th className="px-1 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]/30">
                {rows.map((row, i) => {
                  const lacOk = lacEnabled(row, dur)
                  const borgOk = borgEnabled(row, dur)
                  const isVo2 = form.testType === "vo2max"
                  return (
                    <tr
                      key={i}
                      className={`transition-colors ${!isVo2 && lacOk ? "bg-[#007AFF]/[0.03]" : ""} ${activeRow === i ? "ring-1 ring-inset ring-[#007AFF]/20" : ""}`}
                    >
                      {/* Min */}
                      <td className="px-3 py-2">
                        <span className="tabular-nums text-[#515154] font-semibold">{row.min}</span>
                      </td>
                      {/* Watt / Fart — locked */}
                      <td className="px-3 py-2 text-right text-[#515154] tabular-nums font-semibold">
                        {isSpeedBased(form.sport) ? (row.speed ?? "—") : (row.watt || "—")}
                      </td>
                      {/* HR */}
                      <td className="px-3 py-2 text-right">
                        <input
                          ref={makeRef(i, "hr")}
                          type="number"
                          value={row.hr || ""}
                          onChange={(e) => updateRow(i, "hr", e.target.value)}
                          onFocus={() => setActiveRow(i)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "hr") } }}
                          className="table-input-lg w-16"
                        />
                      </td>
                      {/* Laktat / Borg / Kadans — hidden for VO2max */}
                      {!isVo2 && <>
                        <td className="px-3 py-2 text-right">
                          {lacOk ? (
                            <input
                              ref={makeRef(i, "lac")}
                              type="text"
                              inputMode="decimal"
                              value={lacStrings[i] ?? (row.lac > 0 ? String(row.lac) : "")}
                              onChange={(e) => {
                                const raw = e.target.value
                                setLacStrings((prev) => ({ ...prev, [i]: raw }))
                                const num = parseFloat(raw.replace(",", "."))
                                if (!isNaN(num)) updateRow(i, "lac", String(num))
                              }}
                              onBlur={() => setLacStrings((prev) => { const n = { ...prev }; delete n[i]; return n })}
                              onFocus={() => setActiveRow(i)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "lac") } }}
                              className="table-input-lg w-16 font-bold"
                            />
                          ) : (
                            <span className="text-[#D1D1D6] font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {borgOk ? (
                            <input
                              ref={makeRef(i, "borg")}
                              type="number"
                              value={row.borg || ""}
                              onChange={(e) => updateRow(i, "borg", e.target.value)}
                              onFocus={() => setActiveRow(i)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "borg") } }}
                              className="table-input-lg w-14"
                            />
                          ) : (
                            <span className="text-[#D1D1D6] font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {borgOk ? (
                            <input
                              ref={makeRef(i, "cadence")}
                              type="number"
                              value={row.cadence || ""}
                              onChange={(e) => updateRow(i, "cadence", e.target.value)}
                              onFocus={() => setActiveRow(i)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "cadence") } }}
                              className="table-input-lg w-16"
                            />
                          ) : (
                            <span className="text-[#D1D1D6] font-semibold">—</span>
                          )}
                        </td>
                      </>}
                      {/* Delete row (stage-end for regular; any row for VO2max) */}
                      <td className="px-1 py-2 text-center">
                        {(isVo2 ? i > 0 : borgOk) ? (
                          <button
                            type="button"
                            onClick={() => isVo2 ? setRows((prev) => prev.filter((_, idx) => idx !== i)) : removeStage(row.min)}
                            title="Ta bort rad"
                            className="text-[#D1D1D6] hover:text-red-400 transition-colors leading-none"
                          >
                            ✕
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-[hsl(var(--border))]/40">
            <button
              type="button"
              onClick={addStage}
              className="text-sm text-[#007AFF] hover:text-[#0066d6] font-medium"
            >
              + Lägg till {form.testType === "vo2max" ? "rad" : "steg"}
            </button>
          </div>
        </div>

        {/* Right column: Chart + Coach Assessment */}
        <div className="flex flex-col gap-6 h-full">
          {/* Chart */}
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-4">Kurva (live)</p>
            <LiveTestChart
              rows={rows}
              dur={dur}
            />
          </div>

          {/* VO2max exhaustion panel — replaces coach assessment */}
          {form.testType === "vo2max" ? (
            <div className="flex-1 rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-sm overflow-y-auto space-y-5">
              {/* Utmattning */}
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-3">Utmattning</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="w-36 text-sm text-[#515154] shrink-0">Tid (mm:ss)</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={exhaustionTimeMins}
                        onChange={(e) => setExhaustionTimeMins(e.target.value)}
                        placeholder="mm"
                        className="h-10 text-base w-16 text-center"
                      />
                      <span className="text-[#515154] font-bold">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={exhaustionTimeSecs}
                        onChange={(e) => setExhaustionTimeSecs(e.target.value)}
                        placeholder="ss"
                        className="h-10 text-base w-16 text-center"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-36 text-sm text-[#515154] shrink-0">Effekt (W)</Label>
                    <Input
                      type="number"
                      value={exhaustionWattStr}
                      onChange={(e) => setExhaustionWattStr(e.target.value)}
                      placeholder={String(Math.max(...rows.filter(r => r.hr > 0).map(r => r.watt), 0) || "—")}
                      className="h-10 text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Totalvärde */}
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-3">Totalvärde</p>
                {(() => {
                    const bw = parseFloat(form.bodyWeight)
                    const overrideW = parseFloat(exhaustionWattStr)
                    const derivedW = Math.max(...rows.filter(r => r.hr > 0).map(r => r.watt), 0)
                    const maxW = overrideW > 0 ? overrideW : derivedW
                    const vo2 = bw > 0 && maxW > 0 ? calculateVo2Max(maxW, bw) : null
                    const absVo2 = vo2 != null && bw > 0 ? Math.round(vo2 * bw) : null
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Label className="w-36 text-sm text-[#515154] shrink-0">VO₂ max (ml/kg/min)</Label>
                          <Input
                            type="number"
                            value={manualVo2MaxStr}
                            onChange={(e) => setManualVo2MaxStr(e.target.value)}
                            placeholder={vo2 != null ? String(vo2) : "—"}
                            className="h-10 text-base"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="w-36 text-sm text-[#515154] shrink-0">Syreupptag</Label>
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="number"
                              value={manualAbsVo2Str}
                              onChange={(e) => setManualAbsVo2Str(e.target.value)}
                              placeholder={absVo2 != null ? String(absVo2) : "—"}
                              className="h-10 text-base"
                            />
                            <span className="text-sm text-[#515154] shrink-0">ml O₂/min</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="w-36 text-sm text-[#515154] shrink-0">Maxlaktat (mmol/L)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={exhaustionLacStr}
                            onChange={(e) => setExhaustionLacStr(e.target.value)}
                            placeholder="t.ex. 10,2"
                            className="h-10 text-base"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="w-36 text-sm text-[#515154] shrink-0">Borg vid utmattning</Label>
                          <Input
                            type="number"
                            value={exhaustionBorg}
                            onChange={(e) => setExhaustionBorg(e.target.value)}
                            placeholder="6–20"
                            className="h-10 text-base"
                          />
                        </div>
                      </div>
                    )
                  })()}
              </div>
            </div>
          ) : (
          <div className="flex-1 rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-sm overflow-y-auto">
        <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-4">
          Bedömning (Coach)
        </p>
        <div className="grid grid-cols-2 gap-6">
          {/* Effekt */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#515154] uppercase tracking-wider">Effekt</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">AT Effekt (W)</Label>
                <Input
                  type="number"
                  value={coachAssessment.atEffektWatt ?? ""}
                  onChange={(e) => updateCoach("atEffektWatt", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">LT Effekt (W)</Label>
                <Input
                  type="number"
                  value={coachAssessment.ltEffektWatt ?? ""}
                  onChange={(e) => updateCoach("ltEffektWatt", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">Gräns Låg/Medel (W)</Label>
                <Input
                  type="number"
                  value={coachAssessment.granLagMedel ?? ""}
                  onChange={(e) => updateCoach("granLagMedel", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">Nedre gräns (W)</Label>
                <Input
                  type="number"
                  value={coachAssessment.nedreGrans ?? ""}
                  onChange={(e) => updateCoach("nedreGrans", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
            </div>
          </div>
          {/* Puls */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#515154] uppercase tracking-wider">Puls</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">Est. maxpuls</Label>
                <Input
                  type="number"
                  value={coachAssessment.estMaxPuls ?? ""}
                  onChange={(e) => updateCoach("estMaxPuls", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">Högsta uppnådda</Label>
                <Input
                  type="number"
                  value={coachAssessment.hogstaUpnaddPuls ?? ""}
                  onChange={(e) => updateCoach("hogstaUpnaddPuls", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">AT-puls</Label>
                <Input
                  type="number"
                  value={coachAssessment.atPuls ?? ""}
                  onChange={(e) => updateCoach("atPuls", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">LT-puls</Label>
                <Input
                  type="number"
                  value={coachAssessment.ltPuls ?? ""}
                  onChange={(e) => updateCoach("ltPuls", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">Gräns Låg/Medel</Label>
                <Input
                  type="number"
                  value={coachAssessment.granLagMedelPuls ?? ""}
                  onChange={(e) => updateCoach("granLagMedelPuls", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-44 text-sm text-[#515154] shrink-0">Nedre gräns</Label>
                <Input
                  type="number"
                  value={coachAssessment.nedreGransPuls ?? ""}
                  onChange={(e) => updateCoach("nedreGransPuls", e.target.value)}
                  className="h-10 text-base"
                  placeholder="—"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      {showConfirm && <ConfirmLeaveDialog onConfirm={() => { setShowConfirm(false); pendingBack.current?.() }} onCancel={() => setShowConfirm(false)} />}
    </div>
  )
}
