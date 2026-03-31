import { RawDataPoint } from '@/types'

/**
 * Linear interpolation: find the watt value where lactate crosses targetMmol.
 *
 * Sorts rawData by watt, then finds two adjacent points where lactate
 * crosses the threshold, and linearly interpolates the exact watt value.
 *
 * Returns null if the threshold is never reached in the data.
 */
export function interpolateLactateThreshold(
  rawData: RawDataPoint[],
  targetMmol: number
): number | null {
  if (rawData.length < 2) return null

  const sorted = [...rawData]
    .filter(p => p.lac > 0 && p.watt > 0)
    .sort((a, b) => a.watt - b.watt)

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]

    const crossesThreshold =
      (a.lac <= targetMmol && b.lac >= targetMmol) ||
      (a.lac >= targetMmol && b.lac <= targetMmol)

    if (!crossesThreshold) continue

    // Linear interpolation: watt = a.watt + (targetMmol - a.lac) / (b.lac - a.lac) * (b.watt - a.watt)
    const lacDiff = b.lac - a.lac
    if (lacDiff === 0) return a.watt

    const fraction = (targetMmol - a.lac) / lacDiff
    return Math.round(a.watt + fraction * (b.watt - a.watt))
  }

  return null
}

export const LT1_MMOL = 2.0 // Aerobic Threshold
export const LT2_MMOL = 4.0 // Lactate Threshold

/**
 * Kuipers formula for cycling ramp test:
 * VO₂max (ml/kg/min) = (maxWatt × 10.8 / bodyWeightKg) + 7
 *
 * maxWatt = highest completed watt level where HR was recorded
 */
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
  { label: "Elite",     colorBg: "bg-[#007AFF]", colorText: "text-white" },
]

// Lower bound of each zone, index matches VO2MAX_ZONES
export const VO2MAX_BREAKPOINTS_WOMEN = [0, 16, 26, 36, 46, 56, 66]
export const VO2MAX_BREAKPOINTS_MEN   = [0, 21, 31, 41, 51, 61, 76]
