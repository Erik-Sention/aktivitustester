"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateCoachAssessmentAction } from "@/app/actions/tests"
import { CoachAssessment } from "@/types"
import { isSpeedSport } from "@/lib/utils"

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
    setAssessment((prev) => ({
      ...prev,
      [field]: value === "" ? null : (parseFloat(value) || null),
    }))
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

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#515154] uppercase tracking-wider">
            {speedSport ? "Hastighet (km/h)" : "Effekt (W)"}
          </p>
          <div className="space-y-2">
            {speedSport ? (
              <>
                {field("AT Hastighet (km/h)", "atEffektSpeed")}
                {field("LT Hastighet (km/h)", "ltEffektSpeed")}
                {field("Gräns Låg/Medel (km/h)", "granLagMedelSpeed")}
                {field("Nedre gräns (km/h)", "nedreGransSpeed")}
              </>
            ) : (
              <>
                {field("AT Effekt (W)", "atEffektWatt")}
                {field("LT Effekt (W)", "ltEffektWatt")}
                {field("Gräns Låg/Medel (W)", "granLagMedel")}
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
            {field("AT-puls", "atPuls")}
            {field("LT-puls", "ltPuls")}
            {field("Gräns Låg/Medel (bpm)", "granLagMedelPuls")}
            {field("Nedre gräns (bpm)", "nedreGransPuls")}
          </div>
        </div>
      </div>
    </div>
  )
}
