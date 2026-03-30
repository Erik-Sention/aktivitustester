"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createTestAction } from "@/app/actions/tests"
import { interpolateLactateThreshold, LT1_MMOL, LT2_MMOL } from "@/lib/calculations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { LactateChart } from "@/components/tests/lactate-chart"
import { fullName } from "@/lib/utils"
import { Play, Pause, RotateCcw } from "lucide-react"
import { RawDataPoint, SportType, TestType, ProtocolType, ClinicLocation } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────

interface AthleteOption {
  id: string
  firstName: string
  lastName: string
  currentWeight?: number | null
}

interface LiveRecordingViewProps {
  athletes: AthleteOption[]
  defaultAthleteId?: string
  defaultTestType?: string
  defaultTestLeader?: string
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
  { label: "60W / +20W", startWatt: 60, stepSize: 20 },
  { label: "80W / +30W", startWatt: 80, stepSize: 30 },
]

const TESTTYPE_LABELS: Record<TestType, string> = {
  troskeltest: "Tröskeltest",
  vo2max: "VO2-max",
  wingate: "Wingate",
}

const PROTOCOL_OPTIONS: Record<SportType, { value: ProtocolType; label: string }[]> = {
  cykel: [
    { value: "standard_3min", label: "Standard 3 min-steg" },
    { value: "ramp_test", label: "Ramp-test" },
  ],
  skidor_band: [{ value: "standard_3min", label: "Standard 3 min-steg" }],
  skierg: [{ value: "standard_3min", label: "Standard 3 min-steg" }],
  lopning: [{ value: "standard_3min", label: "Standard 3 min-steg" }],
  kajak: [{ value: "standard_3min", label: "Standard 3 min-steg" }],
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

// ── Sample data ───────────────────────────────────────────────────────

const SAMPLE_ROWS: RawDataPoint[] = [
  { min: 3,  watt: 100, hr: 118, lac: 0.8, borg: 9,  cadence: 90 },
  { min: 6,  watt: 120, hr: 131, lac: 1.0, borg: 11, cadence: 90 },
  { min: 9,  watt: 140, hr: 143, lac: 1.3, borg: 12, cadence: 90 },
  { min: 12, watt: 160, hr: 155, lac: 1.7, borg: 13, cadence: 90 },
  { min: 15, watt: 180, hr: 162, lac: 2.2, borg: 14, cadence: 89 },
  { min: 18, watt: 200, hr: 170, lac: 3.1, borg: 16, cadence: 88 },
  { min: 21, watt: 220, hr: 177, lac: 5.2, borg: 17, cadence: 87 },
  { min: 24, watt: 240, hr: 183, lac: 8.4, borg: 19, cadence: 85 },
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

  // Auto-advance stage when interval expires
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
        <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest block leading-none mb-1.5">
          Stage {stage} / {totalStages}
        </span>
        <span className={`text-3xl font-black tabular-nums tracking-tighter leading-none ${running ? "text-[#1D1D1F]" : "text-[#D1D1D6]"}`}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>
      <button type="button" onClick={() => setRunning((r) => !r)}
        className="p-2.5 rounded-xl hover:bg-[#F5F5F7] text-[#86868B] transition-colors">
        {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <button type="button" onClick={reset}
        className="p-2 rounded-xl hover:bg-[#F5F5F7] text-[#86868B] transition-colors">
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

function emptyRow(stageNum: number, watt: number): RawDataPoint {
  return { min: stageNum * 3, watt, hr: 0, lac: 0, borg: 0, cadence: 0 }
}

export function LiveRecordingView({ athletes, defaultAthleteId, defaultTestType, defaultTestLeader }: LiveRecordingViewProps) {
  const router = useRouter()
  const [step, setStep] = useState<"setup" | "recording">("setup")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  })

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function changeSport(sport: SportType) {
    const firstProtocol = PROTOCOL_OPTIONS[sport][0].value
    const defaults = PROTOCOL_DEFAULTS[firstProtocol]
    setForm((f) => ({
      ...f,
      sport,
      protocol: firstProtocol,
      startWatt: String(defaults.startWatt),
      stepSize: String(defaults.stepSize),
      testDuration: String(defaults.testDuration),
    }))
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

  // ── Raw data rows ─────────────────────────────────────────────────
  const [rows, setRows] = useState<RawDataPoint[]>([])
  const [activeRow, setActiveRow] = useState<number | null>(null)
  const [timerStage, setTimerStage] = useState(1)
  const [lacStrings, setLacStrings] = useState<Record<number, string>>({})
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  function focusNextInput(rowIdx: number, field: string) {
    const fields = ["min", "watt", "hr", "borg", "lac", "cadence"]
    const nextField = fields[fields.indexOf(field) + 1]
    if (nextField) {
      inputRefs.current.get(`${rowIdx}-${nextField}`)?.focus()
    } else {
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
    const start = parseInt(form.startWatt) || 40
    const step = parseInt(form.stepSize) || 20
    const dur = parseInt(form.testDuration) || 3
    const generated = Array.from({ length: 10 }, (_, i) =>
      emptyRow(i + 1, start + i * step)
    )
    setRows(generated)
    setStep("recording")
  }

  function updateRow(index: number, field: keyof RawDataPoint, value: string) {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: parseFloat(value) || 0 }
      return next
    })
  }

  function addRow() {
    const last = rows[rows.length - 1]
    const step = parseInt(form.stepSize) || 20
    const dur = parseInt(form.testDuration) || 3
    const newWatt = last ? last.watt + step : parseInt(form.startWatt) || 40
    const newMin = last ? last.min + dur : dur
    setRows((prev) => [...prev, { min: newMin, watt: newWatt, hr: 0, lac: 0, borg: 0, cadence: 0 }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Live LT1/LT2 calculation ──────────────────────────────────────
  const liveAtWatt = interpolateLactateThreshold(rows, LT1_MMOL)
  const liveLtWatt = interpolateLactateThreshold(rows, LT2_MMOL)

  // ── Chart data ────────────────────────────────────────────────────
  const chartStages = rows.map((p, i) => ({
    stageNumber: i + 1,
    loadWatts: p.watt || null,
    loadSpeedKmh: null,
    heartRate: p.hr || null,
    lactateMmol: p.lac || null,
    vo2MlKgMin: null,
    rpe: p.borg || null,
  }))

  async function handleSave() {
    if (!form.athleteId) { setError("Välj en atlet"); return }
    setSaving(true)
    setError(null)

    try {
      const validRows = rows.filter(p => p.hr > 0 || p.lac > 0 || p.watt > 0)
      await createTestAction({
        athleteId: form.athleteId,
        sport: form.sport,
        testType: form.testType,
        protocol: form.protocol,
        testLocation: (form.testLocation || "stockholm") as ClinicLocation,
        testLeader: form.testLeader,
        testDate: form.testDate,
        startWatt: parseInt(form.startWatt) || 0,
        stepSize: parseInt(form.stepSize) || 0,
        testDuration: parseInt(form.testDuration) || 0,
        bodyWeight: parseFloat(form.bodyWeight) || undefined,
        heightCm: parseFloat(form.heightCm) || undefined,
        notes: form.notes,
        rawData: validRows,
      })
    } catch (e: unknown) {
      // Next.js redirect() throws a special error — let it propagate
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
          <p className="text-muted-foreground text-sm">Fyll i uppgifterna nedan innan du startar.</p>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">

            {/* Atlet — read-only if navigated from athlete page */}
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
                {(Object.keys(SPORT_LABELS) as SportType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSport(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
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

            {/* Val 2 + Val 3 — same row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="testType">Val 2 — Testtyp</Label>
                <Select id="testType" value={form.testType} onChange={(e) => update("testType", e.target.value as TestType)}>
                  {(Object.keys(TESTTYPE_LABELS) as TestType[]).map((t) => (
                    <option key={t} value={t}>{TESTTYPE_LABELS[t]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="protocol">Val 3 — Protokoll</Label>
                <Select id="protocol" value={form.protocol} onChange={(e) => changeProtocol(e.target.value as ProtocolType)}>
                  {PROTOCOL_OPTIONS[form.sport].map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Watt presets (standard) or manual inputs (ramp) */}
            {form.protocol === "standard_3min" ? (
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
                            : "bg-white text-[#86868B] border-[hsl(var(--border))] hover:border-[#86868B]"
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
                  <Label htmlFor="startWatt">Start (W)</Label>
                  <Input id="startWatt" type="number" value={form.startWatt} onChange={(e) => update("startWatt", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stepSize">Steg (W)</Label>
                  <Input id="stepSize" type="number" value={form.stepSize} onChange={(e) => update("stepSize", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="testDuration">Min/steg</Label>
                  <Input id="testDuration" type="number" value={form.testDuration} onChange={(e) => update("testDuration", e.target.value)} />
                </div>
              </div>
            )}

            {/* Dagsaktuell mätning + Plats & Testledare — two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bodyWeight">Vikt (kg) <span className="text-[#86868B] font-normal">– idag</span></Label>
                <Input id="bodyWeight" type="number" step="0.1" value={form.bodyWeight} onChange={(e) => update("bodyWeight", e.target.value)} placeholder="t.ex. 72,5" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="heightCm">Längd (cm)</Label>
                <Input id="heightCm" type="number" value={form.heightCm} onChange={(e) => update("heightCm", e.target.value)} placeholder="t.ex. 178" />
              </div>
            </div>

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

  // ── Recording screen ──────────────────────────────────────────────
  const selectedAthlete = athletes.find((a) => a.id === form.athleteId)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {SPORT_LABELS[form.sport]} — {TESTTYPE_LABELS[form.testType]}
          </h1>
          <p className="text-sm text-[#86868B] mt-0.5">
            {selectedAthlete && <span>{fullName(selectedAthlete.firstName, selectedAthlete.lastName)} · </span>}
            {PROTOCOL_OPTIONS[form.sport].find((p) => p.value === form.protocol)?.label}
            {" · "}{form.startWatt}W +{form.stepSize}W/{form.testDuration}min
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StageTimer
            intervalSeconds={parseInt(form.testDuration) || 3}
            totalStages={rows.length || 1}
            onStageChange={(s) => setTimerStage(s)}
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Sparar…" : "Spara test"}
          </Button>
          <Button variant="outline" onClick={() => {
            if (window.confirm("Gå tillbaka till inställningar? Inmatad data raderas.")) setStep("setup")
          }}>
            Tillbaka
          </Button>
        </div>
      </div>

      {/* LT1 / LT2 — always visible, discrete until calculated */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2.5 text-sm text-center">
          <span className="text-[9px] font-bold uppercase tracking-widest block leading-none mb-1 text-[#86868B]">Laktattröskel 1 (LT1) — 2.0 mmol</span>
          <span className={`text-lg font-black leading-none ${liveAtWatt ? "text-[#1D1D1F]" : "text-[#D1D1D6]"}`}>
            {liveAtWatt ? `${liveAtWatt} W` : "—"}
          </span>
        </div>
        <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2.5 text-sm text-center">
          <span className="text-[9px] font-bold uppercase tracking-widest block leading-none mb-1 text-[#86868B]">Laktattröskel 2 (LT2) — 4.0 mmol</span>
          <span className={`text-lg font-black leading-none ${liveLtWatt ? "text-[#1D1D1F]" : "text-[#D1D1D6]"}`}>
            {liveLtWatt ? `${liveLtWatt} W` : "—"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Data table */}
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-white shadow-sm">
          <div className="border-b border-[hsl(var(--border))]/60 bg-[#F5F5F7]/50 px-5 py-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#86868B]">Stegindata</p>
            <button
              type="button"
              onClick={() => setRows(SAMPLE_ROWS.map(r => ({ ...r })))}
              className="text-[10px] text-[#007AFF] hover:text-[#0066d6] font-medium"
            >
              Fyll i exempeldata
            </button>
          </div>
          <div className="overflow-y-auto max-h-[520px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.1em] text-[#86868B] border-b border-[hsl(var(--border))]/60">
                  <th className="px-3 py-2 text-left">Min</th>
                  <th className="px-3 py-2 text-right">Watt</th>
                  <th className="px-3 py-2 text-right">Puls</th>
                  <th className="px-3 py-2 text-right">Borg</th>
                  <th className="px-3 py-2 text-right">Laktat</th>
                  <th className="px-3 py-2 text-right">Kadans</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]/30">
                {rows.map((row, i) => (
                  <tr key={i} className={`transition-colors ${activeRow === i ? "row-active" : timerStage - 1 === i ? "row-current" : "hover:bg-[#F5F5F7]/50"}`}>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <input
                          ref={makeRef(i, "min")}
                          type="number"
                          value={row.min || ""}
                          onChange={(e) => updateRow(i, "min", e.target.value)}
                          onFocus={() => setActiveRow(i)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "min") } }}
                          className="table-input w-12 text-center"
                        />
                        {timerStage - 1 === i && (
                          <span className="text-[9px] font-black bg-[#007AFF]/10 text-[#007AFF] rounded px-1 py-0.5 leading-none">
                            S{timerStage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        ref={makeRef(i, "watt")}
                        type="number"
                        value={row.watt || ""}
                        onChange={(e) => updateRow(i, "watt", e.target.value)}
                        onFocus={() => setActiveRow(i)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "watt") } }}
                        className="table-input w-16 text-right"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        ref={makeRef(i, "hr")}
                        type="number"
                        value={row.hr || ""}
                        onChange={(e) => updateRow(i, "hr", e.target.value)}
                        onFocus={() => setActiveRow(i)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "hr") } }}
                        className="table-input w-14 text-right"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        ref={makeRef(i, "borg")}
                        type="number"
                        value={row.borg || ""}
                        onChange={(e) => updateRow(i, "borg", e.target.value)}
                        onFocus={() => setActiveRow(i)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "borg") } }}
                        className="w-12 text-xs border border-slate-200 rounded px-1.5 py-1 text-right focus:outline-none focus:border-blue-400"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
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
                        className="table-input w-16 text-right font-bold"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        ref={makeRef(i, "cadence")}
                        type="number"
                        value={row.cadence || ""}
                        onChange={(e) => updateRow(i, "cadence", e.target.value)}
                        onFocus={() => setActiveRow(i)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(i, "cadence") } }}
                        className="table-input w-14 text-right"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-[#D1D1D6] hover:text-[hsl(var(--destructive))] text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-[hsl(var(--border))]/40">
            <button
              type="button"
              onClick={addRow}
              className="text-xs text-[#007AFF] hover:text-[#0066d6] font-medium"
            >
              + Lägg till steg
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#86868B] mb-4">Kurva (live)</p>
          {chartStages.filter(s => s.lactateMmol != null && s.loadWatts != null).length > 1 ? (
            <LactateChart
              stages={chartStages}
              lt1Watts={liveAtWatt}
              lt2Watts={liveLtWatt}
              maxHr={rows.reduce<number | null>((max, r) => r.hr > 0 ? Math.max(max ?? 0, r.hr) : max, null)}
              testType={form.testType}
              height={460}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-[#D1D1D6] text-sm">
              Fyll i laktatvärden för att se kurvan
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
    </div>
  )
}
