"use client"

import { useState, useRef, useEffect } from "react"
import { createWingateTestAction } from "@/app/actions/tests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { fullName } from "@/lib/utils"
import { Play, Pause, RotateCcw } from "lucide-react"
import { ClinicLocation } from "@/types"

interface AthleteOption {
  id: string
  firstName: string
  lastName: string
  currentWeight?: number | null
}

interface WingateRecordingViewProps {
  athletes: AthleteOption[]
  defaultAthleteId?: string
  defaultTestLeader?: string
}

const CLINIC_LOCATIONS: { value: ClinicLocation; label: string }[] = [
  { value: "stockholm", label: "Stockholm" },
  { value: "stockholm_c", label: "Stockholm C" },
  { value: "linkoping", label: "Linköping" },
  { value: "goteborg", label: "Göteborg" },
  { value: "malmo", label: "Malmö" },
]

const WINGATE_DURATION = 30 // seconds

export function WingateTimer() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  useEffect(() => {
    if (elapsed >= WINGATE_DURATION) {
      setRunning(false)
    }
  }, [elapsed])

  function reset() {
    setRunning(false)
    setElapsed(0)
  }

  const remaining = Math.max(0, WINGATE_DURATION - elapsed)
  const finished = elapsed >= WINGATE_DURATION

  return (
    <div className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-4 flex items-center gap-3 shadow-sm">
      <div className="flex-1 text-center">
        <span className="text-sm font-bold text-[#515154] uppercase tracking-widest block leading-none mb-1.5">
          {finished ? "KLAR" : "WINGATE 30 SEK"}
        </span>
        <span className={`text-4xl font-black tabular-nums tracking-tighter leading-none ${running ? "text-[#007AFF]" : finished ? "text-[#34C759]" : "text-[#D1D1D6]"}`}>
          {String(remaining).padStart(2, "0")}
        </span>
      </div>
      <button
        type="button"
        onClick={() => { if (!finished) setRunning((r) => !r) }}
        disabled={finished}
        className="p-2.5 rounded-xl hover:bg-[#F5F5F7] text-[#515154] transition-colors disabled:opacity-40"
      >
        {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <button type="button" onClick={reset} className="p-2 rounded-xl hover:bg-[#F5F5F7] text-[#515154] transition-colors">
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  )
}

export function WingateRecordingView({ athletes, defaultAthleteId, defaultTestLeader }: WingateRecordingViewProps) {
  const [step, setStep] = useState<"setup" | "recording">("setup")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    athleteId: defaultAthleteId ?? "",
    testLocation: "" as ClinicLocation | "",
    testLeader: defaultTestLeader ?? "",
    testDate: new Date().toISOString().split("T")[0],
    notes: "",
    startCadenceRpm: "",
    bodyWeightPercent: "10",
    bodyWeight: "",
  })

  const [results, setResults] = useState({
    peakPower: "",
    meanPower: "",
    minPower: "",
  })

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const lockedAthlete = defaultAthleteId
    ? athletes.find((a) => a.id === defaultAthleteId)
    : null

  // Auto-fill body weight from athlete profile when athlete is selected
  useEffect(() => {
    if (form.athleteId && !form.bodyWeight) {
      const athlete = athletes.find((a) => a.id === form.athleteId)
      if (athlete?.currentWeight) {
        setField("bodyWeight", String(athlete.currentWeight))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.athleteId])

  async function handleSave() {
    if (!form.athleteId) { setError("Välj en atlet"); return }
    const peak = parseFloat(results.peakPower)
    const mean = parseFloat(results.meanPower)
    const min = parseFloat(results.minPower)
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
          startCadenceRpm: parseInt(form.startCadenceRpm) || null,
          bodyWeightPercent: parseFloat(form.bodyWeightPercent) || 10,
          bodyWeight: parseFloat(form.bodyWeight) || null,
        },
      })
    } catch (e: unknown) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e
      setError("Något gick fel. Försök igen.")
      setSaving(false)
    }
  }

  // ── Setup screen ──────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Wingate — Cykel</h1>
          <p className="text-base text-[#515154] mt-0.5">30-sekunders anaerobt kapacitetstest</p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-5">
          <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Testinfo</p>

          {/* Atlet */}
          {lockedAthlete ? (
            <div>
              <Label>Atlet</Label>
              <p className="mt-1 text-base font-semibold text-[#1D1D1F]">
                {fullName(lockedAthlete.firstName, lockedAthlete.lastName)}
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="athleteId">Atlet</Label>
              <Select
                id="athleteId"
                value={form.athleteId}
                onChange={(e) => setField("athleteId", e.target.value)}
                className="mt-1"
              >
                <option value="">Välj atlet…</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {fullName(a.firstName, a.lastName)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testDate">Datum</Label>
              <Input
                id="testDate"
                type="date"
                value={form.testDate}
                onChange={(e) => setField("testDate", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="testLocation">Klinik</Label>
              <Select
                id="testLocation"
                value={form.testLocation}
                onChange={(e) => setField("testLocation", e.target.value)}
                className="mt-1"
              >
                <option value="">Välj ort…</option>
                {CLINIC_LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="testLeader">Testledare</Label>
            <Input
              id="testLeader"
              value={form.testLeader}
              onChange={(e) => setField("testLeader", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-5">
          <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Cykelinställningar</p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startCadenceRpm">Startkadens (rpm)</Label>
              <Input
                id="startCadenceRpm"
                type="text"
                inputMode="numeric"
                placeholder="t.ex. 110"
                value={form.startCadenceRpm}
                onChange={(e) => setField("startCadenceRpm", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bodyWeightPercent">% kroppsvikt</Label>
              <Input
                id="bodyWeightPercent"
                type="text"
                inputMode="decimal"
                value={form.bodyWeightPercent}
                onChange={(e) => setField("bodyWeightPercent", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bodyWeight">Kroppsvikt (kg)</Label>
              <Input
                id="bodyWeight"
                type="text"
                inputMode="decimal"
                placeholder="t.ex. 75"
                value={form.bodyWeight}
                onChange={(e) => setField("bodyWeight", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            if (!form.athleteId) { setError("Välj en atlet"); return }
            setError(null)
            setStep("recording")
          }}
          className="w-full"
        >
          Starta test
        </Button>
        {error && <p className="text-sm text-[hsl(var(--destructive))] text-center">{error}</p>}
      </div>
    )
  }

  // ── Recording screen ──────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Wingate — Cykel</h1>
          <p className="text-base text-[#515154] mt-0.5">
            {(() => {
              const a = athletes.find((a) => a.id === form.athleteId)
              return a ? fullName(a.firstName, a.lastName) : ""
            })()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("setup")}>Tillbaka</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Sparar…" : "Spara test"}
          </Button>
        </div>
      </div>

      <WingateTimer />

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-5">
        <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Effektresultat (W)</p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="peakPower">Peak</Label>
            <Input
              id="peakPower"
              type="text"
              inputMode="numeric"
              placeholder="W"
              value={results.peakPower}
              onChange={(e) => setResults((r) => ({ ...r, peakPower: e.target.value }))}
              className="mt-1 text-center text-lg font-bold"
            />
          </div>
          <div>
            <Label htmlFor="meanPower">Medel</Label>
            <Input
              id="meanPower"
              type="text"
              inputMode="numeric"
              placeholder="W"
              value={results.meanPower}
              onChange={(e) => setResults((r) => ({ ...r, meanPower: e.target.value }))}
              className="mt-1 text-center text-lg font-bold"
            />
          </div>
          <div>
            <Label htmlFor="minPower">Min</Label>
            <Input
              id="minPower"
              type="text"
              inputMode="numeric"
              placeholder="W"
              value={results.minPower}
              onChange={(e) => setResults((r) => ({ ...r, minPower: e.target.value }))}
              className="mt-1 text-center text-lg font-bold"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
        <Label htmlFor="notes">Anteckningar</Label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={3}
          placeholder="Fritext…"
          className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[#F5F5F7] px-3 py-2 text-base text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
        />
      </div>

      {error && <p className="text-sm text-[hsl(var(--destructive))] text-center">{error}</p>}
    </div>
  )
}
