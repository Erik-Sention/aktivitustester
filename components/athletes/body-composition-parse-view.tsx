"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { extractAndParse } from "@/lib/body-composition-parser"

const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false }
)
import type { BodyCompositionData } from "@/types"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Loader2, ZoomIn, ZoomOut } from "lucide-react"

interface Props {
  file: File
  initialDate: string      // YYYY-MM-DD
  onSave: (data: BodyCompositionData) => Promise<void>
  onCancel: () => void
}

const inputCls = "flex h-10 w-full rounded-xl bg-[hsl(var(--input))] px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-[#0071BA]/30 focus:bg-white transition-all"

function NumField({ label, unit, value, onChange, step = "0.1" }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; step?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-[#515154]">
        {label}{unit ? <span className="text-[#86868B] font-normal"> {unit}</span> : null}
      </Label>
      <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  )
}

function TextField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-[#515154]">{label}</Label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  )
}

function TextAreaField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-[#515154]">{label}</Label>
      <textarea
        rows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex w-full rounded-xl bg-[hsl(var(--input))] px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-[#0071BA]/30 focus:bg-white transition-all resize-none"
      />
    </div>
  )
}

function SectionHead({ label }: { label: string }) {
  return (
    <div className="pt-2">
      <p className="text-[10px] font-semibold tracking-widest text-[#86868B] uppercase">{label}</p>
      <div className="mt-1 h-px bg-[#E5E5EA]" />
    </div>
  )
}

function toStr(v: number | null | undefined): string {
  return v != null ? String(v) : ""
}

export function BodyCompositionParseView({ file, initialDate, onSave, onCancel }: Props) {
  const [dataUrl, setDataUrl] = useState("")
  const [parsing, setParsing] = useState(true)
  const [pdfScale, setPdfScale] = useState(1)
  const [confidence, setConfidence] = useState<"high" | "low" | "none">("none")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Core measurements
  const [date, setDate]                     = useState(initialDate)
  const [weight, setWeight]                 = useState("")
  const [heightCm, setHeightCm]             = useState("")
  const [bodyFatPct, setBodyFatPct]         = useState("")
  const [fatMassKg, setFatMassKg]           = useState("")
  const [muscleMassKg, setMuscleMassKg]     = useState("")
  const [visceralFatLevel, setVisceralFatLevel] = useState("")
  const [bmr, setBmr]                       = useState("")
  const [activityBmr, setActivityBmr]       = useState("")
  const [totalBodyWaterL, setTotalBodyWaterL] = useState("")
  const [bmi, setBmi]                       = useState("")

  // Explanatory text sections
  const [bodyFatText, setBodyFatText] = useState("")
  const [bmiText, setBmiText]         = useState("")
  const [bmrText, setBmrText]         = useState("")
  const [recoText, setRecoText]       = useState("")

  // Disease risk + coach comment
  const [riskHeartDisease, setRiskHeartDisease] = useState("")
  const [riskStroke, setRiskStroke]             = useState("")
  const [riskDiabetes, setRiskDiabetes]         = useState("")
  const [coachComment, setCoachComment]         = useState("")

  // Context & recommendations
  const [bodyFatCategory, setBodyFatCategory]     = useState("")
  const [bodyFatHealthyMin, setBodyFatHealthyMin] = useState("")
  const [bodyFatHealthyMax, setBodyFatHealthyMax] = useState("")
  const [healthyWeightMin, setHealthyWeightMin]   = useState("")
  const [healthyWeightMax, setHealthyWeightMax]   = useState("")
  const [targetFatLossKg, setTargetFatLossKg]     = useState("")
  const [daysToGoal, setDaysToGoal]               = useState("")

  useEffect(() => {
    let cancelled = false

    const reader = new FileReader()
    reader.onload = () => { if (!cancelled) setDataUrl(reader.result as string) }
    reader.readAsDataURL(file)

    extractAndParse(file).then((result) => {
      if (cancelled) return
      setConfidence(result.confidence)
      const d = result.data
      if (d.weight != null)             setWeight(toStr(d.weight))
      if (d.heightCm != null)           setHeightCm(toStr(d.heightCm))
      if (d.bodyFatPct != null)         setBodyFatPct(toStr(d.bodyFatPct))
      if (d.fatMassKg != null)          setFatMassKg(toStr(d.fatMassKg))
      if (d.muscleMassKg != null)       setMuscleMassKg(toStr(d.muscleMassKg))
      if (d.visceralFatLevel != null)   setVisceralFatLevel(toStr(d.visceralFatLevel))
      if (d.bmr != null)                setBmr(toStr(d.bmr))
      if (d.activityBmr != null)        setActivityBmr(toStr(d.activityBmr))
      if (d.totalBodyWaterL != null)    setTotalBodyWaterL(toStr(d.totalBodyWaterL))
      if (d.bmi != null)                setBmi(toStr(d.bmi))
      if (d.bodyFatCategory)            setBodyFatCategory(d.bodyFatCategory)
      if (d.bodyFatHealthyMin != null)  setBodyFatHealthyMin(toStr(d.bodyFatHealthyMin))
      if (d.bodyFatHealthyMax != null)  setBodyFatHealthyMax(toStr(d.bodyFatHealthyMax))
      if (d.healthyWeightMin != null)   setHealthyWeightMin(toStr(d.healthyWeightMin))
      if (d.healthyWeightMax != null)   setHealthyWeightMax(toStr(d.healthyWeightMax))
      if (d.targetFatLossKg != null)    setTargetFatLossKg(toStr(d.targetFatLossKg))
      if (d.daysToGoal != null)         setDaysToGoal(toStr(d.daysToGoal))
      if (d.bodyFatText)                setBodyFatText(d.bodyFatText)
      if (d.bmiText)                    setBmiText(d.bmiText)
      if (d.bmrText)                    setBmrText(d.bmrText)
      if (d.recoText)                   setRecoText(d.recoText)
      if (d.riskHeartDisease != null)   setRiskHeartDisease(toStr(d.riskHeartDisease))
      if (d.riskStroke != null)         setRiskStroke(toStr(d.riskStroke))
      if (d.riskDiabetes != null)       setRiskDiabetes(toStr(d.riskDiabetes))
      setParsing(false)
    })

    return () => { cancelled = true }
  }, [file])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const n = (s: string) => s ? parseFloat(s) : null
      const data: BodyCompositionData = {
        measuredAt:        date,
        weight:            n(weight),
        heightCm:          n(heightCm),
        bodyFatPct:        n(bodyFatPct),
        fatMassKg:         n(fatMassKg),
        muscleMassKg:      n(muscleMassKg),
        visceralFatLevel:  n(visceralFatLevel),
        bmr:               n(bmr),
        activityBmr:       n(activityBmr),
        totalBodyWaterL:   n(totalBodyWaterL),
        bmi:               n(bmi),
        bodyFatCategory:   bodyFatCategory.trim() || null,
        bodyFatHealthyMin: n(bodyFatHealthyMin),
        bodyFatHealthyMax: n(bodyFatHealthyMax),
        healthyWeightMin:  n(healthyWeightMin),
        healthyWeightMax:  n(healthyWeightMax),
        targetFatLossKg:   n(targetFatLossKg),
        daysToGoal:        n(daysToGoal),
        bodyFatText:       bodyFatText.trim() || null,
        bmiText:           bmiText.trim() || null,
        bmrText:           bmrText.trim() || null,
        recoText:          recoText.trim() || null,
        riskHeartDisease:  n(riskHeartDisease),
        riskStroke:        n(riskStroke),
        riskDiabetes:      n(riskDiabetes),
        coachComment:      coachComment.trim() || null,
      }
      await onSave(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel")
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* ── Left: original PDF — min-w-0 + overflow-hidden so zoom scrolls internally ── */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden border-r border-[#E5E5EA]">
        <div className="px-4 py-2 border-b border-[#E5E5EA] flex items-center gap-2">
          <span className="text-xs font-semibold text-[#515154] tracking-wide uppercase">Original</span>
          <span className="text-xs text-[#86868B] truncate max-w-[200px]">{file.name}</span>
        </div>

        {/* Zoom controls */}
        <div className="flex-shrink-0 flex items-center justify-center gap-1 border-b border-[#E5E5EA] bg-white px-3 py-1.5">
          <button
            onClick={() => setPdfScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            disabled={pdfScale <= 0.5}
            className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
            title="Zooma ut"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPdfScale(1)}
            className="px-2 py-1 text-xs font-medium text-[#515154] hover:bg-[#F5F5F7] rounded-lg transition-colors min-w-[3.5rem] text-center"
            title="Återställ zoom"
          >
            {Math.round(pdfScale * 100)}%
          </button>
          <button
            onClick={() => setPdfScale(s => Math.min(3, +(s + 0.25).toFixed(2)))}
            disabled={pdfScale >= 3}
            className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
            title="Zooma in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {dataUrl && <PdfViewer url={dataUrl} pageWidth={Math.round(560 * pdfScale)} />}
      </div>

      {/* ── Right: parse form — fixed width, scrolls independently ── */}
      <div className="w-80 flex-shrink-0 flex flex-col overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#E5E5EA]">
          <p className="text-sm font-semibold text-[#1D1D1F]">Aktivitusrapport</p>
          {parsing ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-[#86868B]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Läser PDF…
            </div>
          ) : confidence === "high" ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />Värden hittade — kontrollera och spara
            </div>
          ) : confidence === "low" ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertCircle className="h-3.5 w-3.5" />Delvis inläst — fyll i resterande fält
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#86868B]">
              <AlertCircle className="h-3.5 w-3.5" />Kunde inte läsa PDF — fyll i manuellt
            </div>
          )}
        </div>

        <div className="flex-1 px-5 py-4 space-y-3">
          {/* Date */}
          <div className="space-y-1">
            <Label className="text-xs text-[#515154]">Mätdatum</Label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>

          <SectionHead label="Kroppsfett" />
          <NumField label="Fettprocent" unit="%" value={bodyFatPct} onChange={setBodyFatPct} />
          <TextField label="Fettkategori" value={bodyFatCategory} onChange={setBodyFatCategory} />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Hälsosam fett% min" unit="%" value={bodyFatHealthyMin} onChange={setBodyFatHealthyMin} />
            <NumField label="max" unit="%" value={bodyFatHealthyMax} onChange={setBodyFatHealthyMax} />
          </div>
          <NumField label="Fettmassa" unit="kg" value={fatMassKg} onChange={setFatMassKg} />

          <SectionHead label="Vikt & BMI" />
          <NumField label="Vikt" unit="kg" value={weight} onChange={setWeight} />
          <NumField label="Längd" unit="cm" value={heightCm} onChange={setHeightCm} step="1" />
          <NumField label="BMI" unit="" value={bmi} onChange={setBmi} />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Hälsosam vikt min" unit="kg" value={healthyWeightMin} onChange={setHealthyWeightMin} />
            <NumField label="max" unit="kg" value={healthyWeightMax} onChange={setHealthyWeightMax} />
          </div>

          <SectionHead label="Metabolism" />
          <NumField label="BMR (vila)" unit="kcal" value={bmr} onChange={setBmr} step="1" />
          <NumField label="BMR (aktivitet)" unit="kcal" value={activityBmr} onChange={setActivityBmr} step="1" />
          <NumField label="Muskelmassa" unit="kg" value={muscleMassKg} onChange={setMuscleMassKg} />
          <NumField label="Visceralt fett" unit="nivå" value={visceralFatLevel} onChange={setVisceralFatLevel} step="1" />
          <NumField label="Kroppsvätska" unit="L" value={totalBodyWaterL} onChange={setTotalBodyWaterL} />

          <SectionHead label="Rekommendation" />
          <NumField label="Minska fett" unit="kg" value={targetFatLossKg} onChange={setTargetFatLossKg} />
          <NumField label="Dagar till mål" unit="" value={daysToGoal} onChange={setDaysToGoal} step="1" />

          <SectionHead label="Relativa sjukdomsrisker" />
          <NumField label="Hjärtsjukdom" unit="" value={riskHeartDisease} onChange={setRiskHeartDisease} />
          <NumField label="Stroke" unit="" value={riskStroke} onChange={setRiskStroke} />
          <NumField label="Diabetes" unit="" value={riskDiabetes} onChange={setRiskDiabetes} />

          <SectionHead label="Förklaringstext (kopieras till rapporten)" />
          <TextAreaField label="Kroppsfett" value={bodyFatText} onChange={setBodyFatText} />
          <TextAreaField label="Vikt & BMI" value={bmiText} onChange={setBmiText} />
          <TextAreaField label="BMR" value={bmrText} onChange={setBmrText} />
          <TextAreaField label="Rekommendation" value={recoText} onChange={setRecoText} />

          <SectionHead label="Coach-kommentar" />
          <TextAreaField label="Kommentar" value={coachComment} onChange={setCoachComment} />
        </div>

        {error && <div className="px-5 pb-2 text-xs text-red-500">{error}</div>}

        <div className="px-5 py-4 border-t border-[#E5E5EA] flex gap-2">
          <Button type="button" variant="outline" className="flex-1 text-sm" onClick={onCancel} disabled={saving}>
            Avbryt
          </Button>
          <Button type="button" className="flex-1 text-sm" onClick={handleSave} disabled={saving || !date}>
            {saving ? "Sparar…" : "Spara rapport"}
          </Button>
        </div>
      </div>
    </div>
  )
}
