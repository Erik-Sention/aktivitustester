"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateCoachAssessmentAction } from "@/app/actions/tests"
import { CoachAssessment } from "@/types"
import { isSpeedSport } from "@/lib/utils"
import { ZoneTable } from "@/components/tests/zone-table"

interface CoachAssessmentPanelProps {
  testId: string
  athleteId: string
  sport: string
  initial?: CoachAssessment | null
}

const EMPTY: CoachAssessment = {
  atEffektWatt: null,
  ltEffektWatt: null,
  granLagMedel: null,
  nedreGrans: null,
  atEffektSpeed: null,
  ltEffektSpeed: null,
  granLagMedelSpeed: null,
  nedreGransSpeed: null,
  estMaxPuls: null,
  hogstaUpnaddPuls: null,
  vilopuls: null,
  atPuls: null,
  ltPuls: null,
  granLagMedelPuls: null,
  nedreGransPuls: null,
}

export function CoachAssessmentPanel({ testId, athleteId, sport, initial }: CoachAssessmentPanelProps) {
  const speedSport = isSpeedSport(sport)
  const [assessment, setAssessment] = useState<CoachAssessment>(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function updateField(field: keyof CoachAssessment, value: string) {
    setSaved(false)
    setAssessment((prev) => {
      const num = value === "" ? null : (parseFloat(value) || null)
      const extra: Partial<CoachAssessment> = {}
      if (field === "ltEffektWatt") extra.granLagMedel = num
      if (field === "ltEffektSpeed") extra.granLagMedelSpeed = num
      if (field === "ltPuls") extra.granLagMedelPuls = num
      return { ...prev, [field]: num, ...extra }
    })
  }

  function readOnly(label: string, value: number | null | undefined) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-48 text-sm text-[#515154] shrink-0">{label}</span>
        <div className="h-10 flex items-center px-3 rounded-xl bg-[#F5F5F7] text-sm font-semibold text-[#86868B] flex-1">
          {value != null ? String(value) : "—"}
        </div>
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await updateCoachAssessmentAction(testId, athleteId, assessment)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  function field(label: string, key: keyof CoachAssessment) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-48 text-sm text-[#515154] shrink-0">{label}</span>
        <Input
          type="number"
          value={assessment[key] ?? ""}
          onChange={(e) => updateField(key, e.target.value)}
          className="h-10 text-base"
          placeholder="—"
        />
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Coachbedömning
        </p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">Sparad</span>}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Sparar…" : "Spara bedömning"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#515154] uppercase tracking-wider">
            {speedSport ? "Hastighet (km/h)" : "Effekt (W)"}
          </p>
          <div className="space-y-2">
            {speedSport ? (
              <>
                {field("AT Hastighet (km/h)", "atEffektSpeed")}
                {field("LT Hastighet (km/h)", "ltEffektSpeed")}
                {readOnly("Gräns Låg/Medel (km/h)", assessment.granLagMedelSpeed)}
                {field("Nedre gräns (km/h)", "nedreGransSpeed")}
              </>
            ) : (
              <>
                {field("AT Effekt (W)", "atEffektWatt")}
                {field("LT Effekt (W)", "ltEffektWatt")}
                {readOnly("Gräns Låg/Medel (W)", assessment.granLagMedel)}
                {field("Nedre gräns (W)", "nedreGrans")}
              </>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#515154] uppercase tracking-wider">Puls</p>
          <div className="space-y-2">
            {field("Est. maxpuls", "estMaxPuls")}
            {field("Högsta uppnådda puls", "hogstaUpnaddPuls")}
            {field("Vilopuls", "vilopuls")}
            {field("AT-puls", "atPuls")}
            {field("LT-puls", "ltPuls")}
            {readOnly("Gräns Låg/Medel (bpm)", assessment.granLagMedelPuls)}
            {field("Nedre gräns (bpm)", "nedreGransPuls")}
          </div>
        </div>
      </div>

      {/* Live zone table */}
      <div className="mt-6">
        <ZoneTable
          atHR={assessment.atPuls}
          ltHR={assessment.ltPuls}
          maxHR={assessment.estMaxPuls ?? assessment.hogstaUpnaddPuls}
          atWatt={speedSport ? assessment.atEffektSpeed : assessment.atEffektWatt}
          ltWatt={speedSport ? assessment.ltEffektSpeed : assessment.ltEffektWatt}
          isSpeed={speedSport}
        />
      </div>
    </div>
  )
}
