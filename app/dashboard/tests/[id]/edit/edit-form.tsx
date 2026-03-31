"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateTestAction } from "@/app/actions/tests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  RawDataPoint, SportType, TestType, ProtocolType, ClinicLocation,
  TestInputParams, CoachAssessment, SportSettings,
} from "@/types"

const SPORT_LABELS: Record<SportType, string> = {
  cykel: "Cykel",
  skidor_band: "Skidor (band)",
  skierg: "Skierg",
  lopning: "Löpning",
  kajak: "Kajak",
}

const TESTTYPE_LABELS: Record<TestType, string> = {
  troskeltest: "Tröskeltest",
  vo2max: "VO2-max",
  wingate: "Wingate",
}

const PROTOCOL_LABELS: Record<ProtocolType, string> = {
  standard_3min: "Standard 3 min-steg",
  ramp_test: "Ramp-test",
}

const CLINIC_LOCATIONS: { value: ClinicLocation; label: string }[] = [
  { value: "stockholm", label: "Stockholm" },
  { value: "stockholm_c", label: "Stockholm C" },
  { value: "linkoping", label: "Linköping" },
  { value: "goteborg", label: "Göteborg" },
  { value: "malmo", label: "Malmö" },
]

const EMPTY_COACH: CoachAssessment = {
  atEffektWatt: null, ltEffektWatt: null, granLagMedel: null, nedreGrans: null,
  estMaxPuls: null, hogstaUpnaddPuls: null, atPuls: null, ltPuls: null,
  granLagMedelPuls: null, nedreGransPuls: null,
}

interface EditFormProps {
  testId: string
  athleteId: string
  testDate: string
  notes: string
  rawData: RawDataPoint[]
  sport: SportType
  testType: TestType
  protocol: ProtocolType
  testLocation: ClinicLocation
  testLeader: string
  inputParams: TestInputParams
  coachAssessment: CoachAssessment | null
  settings: SportSettings | null
}

export function EditTestForm({
  testId, athleteId, testDate, notes, rawData: initialRows,
  sport: initialSport, testType: initialTestType, protocol: initialProtocol,
  testLocation: initialLocation, testLeader: initialLeader,
  inputParams, coachAssessment: initialCoach, settings: initialSettings,
}: EditFormProps) {
  const router = useRouter()

  const [date, setDate] = useState(testDate)
  const [noteText, setNoteText] = useState(notes)
  const [sport, setSport] = useState<SportType>(initialSport)
  const [testType, setTestType] = useState<TestType>(initialTestType)
  const [protocol, setProtocol] = useState<ProtocolType>(initialProtocol)
  const [location, setLocation] = useState<ClinicLocation | "">(initialLocation)
  const [leader, setLeader] = useState(initialLeader)
  const [startWatt, setStartWatt] = useState(String(inputParams.startWatt || ""))
  const [stepSize, setStepSize] = useState(String(inputParams.stepSize || ""))
  const [testDuration, setTestDuration] = useState(String(inputParams.testDuration || ""))
  const [bodyWeight, setBodyWeight] = useState(String(inputParams.bodyWeight ?? ""))
  const [heightCm, setHeightCm] = useState(String(inputParams.heightCm ?? ""))

  const [coach, setCoach] = useState<CoachAssessment>(initialCoach ?? EMPTY_COACH)

  function updateCoach(field: keyof CoachAssessment, value: string) {
    setCoach((prev) => ({ ...prev, [field]: value === "" ? null : (parseFloat(value) || null) }))
  }

  const [rows, setRows] = useState<RawDataPoint[]>(initialRows)
  const [lacStrings, setLacStrings] = useState<Record<number, string>>({})

  function updateRow(index: number, field: keyof RawDataPoint, value: string) {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: parseFloat(value) || 0 }
      return next
    })
  }

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const hasCoach = Object.values(coach).some((v) => v !== null)
      await updateTestAction(testId, athleteId, {
        testDate: date,
        notes: noteText,
        rawData: rows.filter((r) => r.hr > 0 || r.lac > 0 || r.watt > 0),
        sport,
        testType,
        protocol,
        testLocation: (location || "stockholm") as ClinicLocation,
        testLeader: leader,
        startWatt: parseInt(startWatt) || 0,
        stepSize: parseInt(stepSize) || 0,
        testDuration: parseInt(testDuration) || 0,
        bodyWeight: parseFloat(bodyWeight) || null,
        heightCm: parseFloat(heightCm) || null,
        coachAssessment: hasCoach ? coach : undefined,
        settings: initialSettings ?? undefined,
      })
    } catch (e: unknown) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e
      setError("Något gick fel. Försök igen.")
      setSaving(false)
    }
  }

  function coachField(label: string, key: keyof CoachAssessment) {
    return (
      <div key={key} className="flex items-center gap-3">
        <span className="w-48 text-sm text-[#515154] shrink-0">{label}</span>
        <Input
          type="number"
          value={coach[key] ?? ""}
          onChange={(e) => updateCoach(key, e.target.value)}
          className="h-10 text-base"
          placeholder="—"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Section 1: Testuppgifter */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-4">
        <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Testuppgifter</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="sport">Sport</Label>
            <Select id="sport" value={sport} onChange={(e) => setSport(e.target.value as SportType)}>
              {(Object.keys(SPORT_LABELS) as SportType[]).map((s) => (
                <option key={s} value={s}>{SPORT_LABELS[s]}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="testType">Testtyp</Label>
            <Select id="testType" value={testType} onChange={(e) => setTestType(e.target.value as TestType)}>
              {(Object.keys(TESTTYPE_LABELS) as TestType[]).map((t) => (
                <option key={t} value={t}>{TESTTYPE_LABELS[t]}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="protocol">Protokoll</Label>
            <Select id="protocol" value={protocol} onChange={(e) => setProtocol(e.target.value as ProtocolType)}>
              {(Object.keys(PROTOCOL_LABELS) as ProtocolType[]).map((p) => (
                <option key={p} value={p}>{PROTOCOL_LABELS[p]}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="location">Plats</Label>
            <Select id="location" value={location} onChange={(e) => setLocation(e.target.value as ClinicLocation)}>
              <option value="">Välj plats…</option>
              {CLINIC_LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="leader">Testledare</Label>
            <Input id="leader" value={leader} onChange={(e) => setLeader(e.target.value)} placeholder="Namn eller e-post" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date">Datum</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-3">
            <Label htmlFor="notes">Anteckningar</Label>
            <Input id="notes" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Valfritt…" />
          </div>
        </div>
      </div>

      {/* Section 2: Protokollparametrar */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-4">
        <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Protokoll</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="startWatt">Start (W)</Label>
            <Input id="startWatt" type="number" value={startWatt} onChange={(e) => setStartWatt(e.target.value)} placeholder="40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stepSize">Steg (W)</Label>
            <Input id="stepSize" type="number" value={stepSize} onChange={(e) => setStepSize(e.target.value)} placeholder="20" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="testDuration">Tid/steg (min)</Label>
            <Input id="testDuration" type="number" value={testDuration} onChange={(e) => setTestDuration(e.target.value)} placeholder="3" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bodyWeight">Vikt (kg)</Label>
            <Input id="bodyWeight" type="number" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="heightCm">Längd (cm)</Label>
            <Input id="heightCm" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="—" />
          </div>
        </div>
      </div>

      {/* Section 3: Coachbedömning */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm space-y-4">
        <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Coachbedömning</p>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#515154] uppercase tracking-wider">Effekt</p>
            <div className="space-y-2">
              {coachField("AT Effekt (W)", "atEffektWatt")}
              {coachField("LT Effekt (W)", "ltEffektWatt")}
              {coachField("Gräns Låg/Medel (W)", "granLagMedel")}
              {coachField("Nedre gräns (W)", "nedreGrans")}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#515154] uppercase tracking-wider">Puls</p>
            <div className="space-y-2">
              {coachField("Est. maxpuls", "estMaxPuls")}
              {coachField("Högsta uppnådda puls", "hogstaUpnaddPuls")}
              {coachField("AT-puls", "atPuls")}
              {coachField("LT-puls", "ltPuls")}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Minutdata */}
      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-white shadow-sm">
        <div className="border-b border-[hsl(var(--border))] bg-[#F5F5F7]/50 px-5 py-3">
          <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Minutdata</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base table-fixed">
            <thead>
              <tr className="text-sm font-black uppercase tracking-wider text-[#1D1D1F] border-b border-[hsl(var(--border))]">
                <th className="px-3 py-3 text-left w-16">Min</th>
                <th className="px-3 py-3 text-right w-20">Watt</th>
                <th className="px-3 py-3 text-right w-18">Puls</th>
                <th className="px-3 py-3 text-right w-20">Laktat</th>
                <th className="px-3 py-3 text-right w-16">Borg</th>
                <th className="px-3 py-3 text-right w-20">Kadans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/30">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-[#F5F5F7]/50">
                  <td className="px-3 py-2">
                    <input type="number" value={row.min || ""} onChange={(e) => updateRow(i, "min", e.target.value)}
                      className="table-input w-14 text-center" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" value={row.watt || ""} onChange={(e) => updateRow(i, "watt", e.target.value)}
                      className="table-input w-16 text-right" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" value={row.hr || ""} onChange={(e) => updateRow(i, "hr", e.target.value)}
                      className="table-input w-16 text-right" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="text" inputMode="decimal"
                      value={lacStrings[i] ?? (row.lac > 0 ? String(row.lac) : "")}
                      onChange={(e) => {
                        const raw = e.target.value
                        setLacStrings((prev) => ({ ...prev, [i]: raw }))
                        const num = parseFloat(raw.replace(",", "."))
                        if (!isNaN(num)) updateRow(i, "lac", String(num))
                      }}
                      onBlur={() => setLacStrings((prev) => { const n = { ...prev }; delete n[i]; return n })}
                      className="table-input w-16 text-right font-bold"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" value={row.borg || ""} onChange={(e) => updateRow(i, "borg", e.target.value)}
                      className="table-input w-14 text-right" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" value={row.cadence || ""} onChange={(e) => updateRow(i, "cadence", e.target.value)}
                      className="table-input w-16 text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      <div className="flex gap-3 pb-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sparar…" : "Spara ändringar"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/dashboard/tests/${testId}`)}>
          Avbryt
        </Button>
      </div>
    </div>
  )
}
