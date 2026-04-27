import { RawDataPoint } from '@/types'

export function interpolateLactateThreshold(
  rawData: RawDataPoint[],
  targetMmol: number
): number | null {
  if (rawData.length < 2) return null

  // Auto-detect speed-based sport: if any point has speed recorded, use speed axis
  const useSpeed = rawData.some(p => (p.speed ?? 0) > 0)
  const intensity = (p: RawDataPoint) => useSpeed ? (p.speed ?? 0) : p.watt

  const sorted = [...rawData]
    .filter(p => p.lac > 0 && intensity(p) > 0)
    .sort((a, b) => intensity(a) - intensity(b))

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]

    const crossesThreshold =
      (a.lac <= targetMmol && b.lac >= targetMmol) ||
      (a.lac >= targetMmol && b.lac <= targetMmol)

    if (!crossesThreshold) continue

    const lacDiff = b.lac - a.lac
    const iA = intensity(a)
    if (lacDiff === 0) return useSpeed ? Math.round(iA * 10) / 10 : Math.round(iA)

    const fraction = (targetMmol - a.lac) / lacDiff
    const raw = iA + fraction * (intensity(b) - iA)
    return useSpeed ? Math.round(raw * 10) / 10 : Math.round(raw)
  }

  return null
}

export const LT1_MMOL = 2.0 // Aerobic Threshold
export const LT2_MMOL = 4.0 // Lactate Threshold

export function calculateVo2Max(maxWatt: number, bodyWeightKg: number): number {
  return Math.round((maxWatt * 10.8) / bodyWeightKg + 7)
}

export const VO2MAX_ZONES = [
  { label: "Hjärtrisk", colorBg: "bg-[#E8735A]", colorText: "text-white" },
  { label: "Hälsorisk", colorBg: "bg-[#F4A88A]", colorText: "text-[#1D1D1F]" },
  { label: "Låg risk",  colorBg: "bg-[#FAD4C0]", colorText: "text-[#1D1D1F]" },
  { label: "Aktiv",     colorBg: "bg-[#B8E6B8]", colorText: "text-[#1D1D1F]" },
  { label: "Atlet",     colorBg: "bg-[#6EC96E]", colorText: "text-white" },
  { label: "Pro",       colorBg: "bg-[#3DB8B8]", colorText: "text-white" },
  { label: "Elite",     colorBg: "bg-[#0071BA]", colorText: "text-white" },
]

// Lower bound of each zone, index matches VO2MAX_ZONES
export const VO2MAX_BREAKPOINTS_WOMEN = [0, 16, 26, 36, 46, 56, 66]
export const VO2MAX_BREAKPOINTS_MEN   = [0, 21, 31, 41, 51, 61, 76]
