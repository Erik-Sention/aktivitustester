import type { BodyCompositionData } from "@/types"

export interface ParseResult {
  data: Partial<BodyCompositionData>
  confidence: "high" | "low" | "none"
  rawText: string
}

function parseNum(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const val = parseFloat(m[1].replace(",", "."))
      return isNaN(val) ? null : val
    }
  }
  return null
}

function parseStr(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function parsePair(text: string, patterns: RegExp[]): [number | null, number | null] {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1] && m?.[2]) {
      const a = parseFloat(m[1].replace(",", "."))
      const b = parseFloat(m[2].replace(",", "."))
      return [isNaN(a) ? null : a, isNaN(b) ? null : b]
    }
  }
  return [null, null]
}

// Core measurements — Swedish (Tanita/Bodyview) and English (InBody)
const PATTERNS = {
  weight: [
    /Din vikt\s*-\s*([\d,\.]+)\s*kg/i,
    /Vikt\s*[:\s]\s*([\d,\.]+)\s*kg/i,
    /Weight\s*[:\s]\s*([\d,\.]+)\s*kg/i,
    /Vikt\s+([\d,\.]+)/i,
  ],
  heightCm: [
    /(\d{3})\s*cm/,           // 3-digit cm like "185 cm"
    /Längd\s*[:\s]\s*(\d+)/i,
    /Height\s*[:\s]\s*(\d+)/i,
  ],
  bodyFatPct: [
    /kroppsfettprocent(?:\s+är)?\s+([\d,\.]+)\s*%/i,
    /kroppsfett\s*-\s*([\d,\.]+)\s*%/i,
    /Fettprocent\s*[:\s]\s*([\d,\.]+)/i,
    /Body\s+Fat\s*%?\s*[:\s]\s*([\d,\.]+)/i,
    /PBF\s*[:\s]\s*([\d,\.]+)/i,
  ],
  fatMassKg: [
    /Fettmassa\s*[:\s]\s*([\d,\.]+)\s*kg/i,
    /Fat\s+Mass\s*[:\s]\s*([\d,\.]+)\s*kg/i,
    /Fettmassa\s+([\d,\.]+)/i,
  ],
  muscleMassKg: [
    /Muskelmassa\s*[:\s]\s*([\d,\.]+)\s*kg/i,
    /Skeletal\s+Muscle\s+Mass\s*[:\s]\s*([\d,\.]+)\s*kg/i,
    /SMM\s*[:\s]\s*([\d,\.]+)\s*kg/i,
    /Muskelmassa\s+([\d,\.]+)/i,
  ],
  visceralFatLevel: [
    /Visceralt?\s+fett(?:nivå)?\s*[:\s]\s*([\d,\.]+)/i,
    /Visceral\s+Fat\s+(?:Level|Area|Rating)\s*[:\s]\s*([\d,\.]+)/i,
    /VFL\s*[:\s]\s*([\d,\.]+)/i,
  ],
  bmr: [
    /BMR\s*-\s*([\d,\.]+)\s*kcal/i,
    /BMR\s*[:\s]\s*([\d,\.]+)\s*kcal/i,
    /Basalomsättning\s*[:\s]\s*([\d,\.]+)/i,
  ],
  activityBmr: [
    /aktivitetsnivå[^.]{0,40}([\d,\.]+)\s*kcal/i,
    /din\s+BMR\s+([\d,\.]+)\s*kcal/i,
  ],
  totalBodyWaterL: [
    /Kroppsvätska\s*[:\s]\s*([\d,\.]+)\s*[Ll]/i,
    /TBW\s*[:\s]\s*([\d,\.]+)\s*[Ll]/i,
    /Total\s+Body\s+Water\s*[:\s]\s*([\d,\.]+)\s*[Ll]/i,
    /Kroppsvätska\s+([\d,\.]+)/i,
  ],
  bmi: [
    /Ditt\s+BMI\s*-\s*([\d,\.]+)/i,
    /BMI\s*[:\s]\s*([\d,\.]+)/i,
  ],
}

// Extract explanatory text sections by finding each section's first sentence and slicing to the next.
// Uses string positions rather than regex lookaheads — robust against PDF text ordering quirks.
function extractTextSections(raw: string): {
  bodyFatText: string | null
  bmiText: string | null
  bmrText: string | null
  recoText: string | null
} {
  const lo = raw.toLowerCase()
  const pos = (phrase: string) => { const i = lo.indexOf(phrase.toLowerCase()); return i === -1 ? Infinity : i }
  const clean = (s: string) => s.trim().replace(/\s+/g, " ") || null

  const i0 = pos("Din kroppsfettprocent är")
  const i1 = pos("Ditt BMI är")
  const i2 = pos("Baserat på din aktivitetsnivå är din BMR")
  const i3 = pos("Baserat på all information rekommenderas")
  // Stop recoText before the disease-risk tables
  const i4 = pos("Relativa Sjukdomsrisker")

  const nextAfter = (from: number, ...candidates: number[]) =>
    Math.min(...candidates.filter(c => c > from), from + 3000)

  return {
    bodyFatText: i0 < Infinity ? clean(raw.slice(i0, nextAfter(i0, i1, i2, i3))) : null,
    bmiText:     i1 < Infinity ? clean(raw.slice(i1, nextAfter(i1, i2, i3)))     : null,
    bmrText:     i2 < Infinity ? clean(raw.slice(i2, nextAfter(i2, i3)))          : null,
    recoText:    i3 < Infinity ? clean(raw.slice(i3, i4 < Infinity ? i4 : i3 + 3000)) : null,
  }
}

// Bodyview-specific patterns
const BODYVIEW_PATTERNS = {
  bodyFatCategory: [
    /faller\s+inom\s+([\w]+)\s+kategorin/i,
    /kategori[n]?\s*[:\-]\s*([\wÅÄÖåäö\s]+?)[\.\n]/i,
  ],
  bodyFatHealthyRange: [
    /hälsosam\s+nivå[^0-9]+([\d,\.]+)\s+till\s+([\d,\.]+)/i,
    /healthy.*?is\s+([\d,\.]+)\s+to\s+([\d,\.]+)/i,
  ],
  healthyWeightRange: [
    /hälsosam\s+vikt\s+(?:ligger\s+)?mellan\s+([\d,\.]+)\s+och\s+([\d,\.]+)\s*kg/i,
    /healthy\s+weight.*?between\s+([\d,\.]+)\s+and\s+([\d,\.]+)\s*kg/i,
  ],
  targetFatLossKg: [
    /minska\s+([\d,\.]+)\s*kg\s+i\s+kroppsfett/i,
    /lose\s+([\d,\.]+)\s*kg\s+(?:of\s+)?fat/i,
  ],
  daysToGoal: [
    /(\d+)\s+dagar\s+att\s+nå\s+ditt\s+mål/i,
    /(\d+)\s+days?\s+to\s+(?:reach|achieve)/i,
  ],
  riskHeartDisease: [
    /Hjärtsjukdom\s+([\d,\.]+)/i,
    /Heart\s+Disease\s+([\d,\.]+)/i,
  ],
  riskStroke: [
    /Stroke\s+([\d,\.]+)/i,
  ],
  riskDiabetes: [
    /Diabetes[^\d]{0,15}([\d,\.]+)/i,
  ],
}

export async function extractAndParse(file: File): Promise<ParseResult> {
  let rawText = ""
  try {
    const { pdfjs } = await import("react-pdf")
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
    const pdfDoc = await loadingTask.promise

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const content = await page.getTextContent()
      rawText += content.items
        .map((item: unknown) => ((item as { str?: string }).str ?? ""))
        .join(" ") + "\n"
    }
  } catch {
    return { data: {}, confidence: "none", rawText: "" }
  }

  if (!rawText.trim()) {
    return { data: {}, confidence: "none", rawText }
  }

  const [bodyFatHealthyMin, bodyFatHealthyMax] = parsePair(rawText, BODYVIEW_PATTERNS.bodyFatHealthyRange)
  const [healthyWeightMin, healthyWeightMax]   = parsePair(rawText, BODYVIEW_PATTERNS.healthyWeightRange)

  const data: Partial<BodyCompositionData> = {
    weight:           parseNum(rawText, PATTERNS.weight),
    heightCm:         parseNum(rawText, PATTERNS.heightCm),
    bodyFatPct:       parseNum(rawText, PATTERNS.bodyFatPct),
    fatMassKg:        parseNum(rawText, PATTERNS.fatMassKg),
    muscleMassKg:     parseNum(rawText, PATTERNS.muscleMassKg),
    visceralFatLevel: parseNum(rawText, PATTERNS.visceralFatLevel),
    bmr:              parseNum(rawText, PATTERNS.bmr),
    activityBmr:      parseNum(rawText, PATTERNS.activityBmr),
    totalBodyWaterL:  parseNum(rawText, PATTERNS.totalBodyWaterL),
    bmi:              parseNum(rawText, PATTERNS.bmi),
    bodyFatCategory:  parseStr(rawText, BODYVIEW_PATTERNS.bodyFatCategory),
    bodyFatHealthyMin,
    bodyFatHealthyMax,
    healthyWeightMin,
    healthyWeightMax,
    targetFatLossKg:  parseNum(rawText, BODYVIEW_PATTERNS.targetFatLossKg),
    daysToGoal:       parseNum(rawText, BODYVIEW_PATTERNS.daysToGoal),
    riskHeartDisease: parseNum(rawText, BODYVIEW_PATTERNS.riskHeartDisease),
    riskStroke:       parseNum(rawText, BODYVIEW_PATTERNS.riskStroke),
    riskDiabetes:     parseNum(rawText, BODYVIEW_PATTERNS.riskDiabetes),
    coachComment:     null,
    ...extractTextSections(rawText),
  }

  const found = Object.values(data).filter((v) => v !== null && v !== undefined).length
  const confidence: ParseResult["confidence"] =
    found >= 6 ? "high" : found >= 2 ? "low" : "none"

  return { data, confidence, rawText }
}
