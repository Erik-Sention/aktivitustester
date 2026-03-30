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
