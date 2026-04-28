import { Test } from "@/types"

interface Vo2MaxResultsPanelProps {
  test: Test
  gender: "M" | "K" | ""
}

function parseExhaustionTime(notes: string): string | null {
  const m = notes?.match(/^Utmattning tid: (\d+:\d+)/)
  return m ? m[1] : null
}

function isSpeedSport(sport: string): boolean {
  return sport === "lopning" || sport === "skidor_band"
}

export function Vo2MaxResultsPanel({ test }: Vo2MaxResultsPanelProps) {
  const vo2 = test.results.vo2Max
  const maxHR = test.results.maxHR
  const maxLactate = test.results.maxLactate
  const bodyWeight = test.inputParams.bodyWeight
  const exhaustionTime = parseExhaustionTime(test.notes ?? "")
  const speedSport = isSpeedSport(test.sport)

  const maxWatt = (test.results.maxWatt ?? 0) > 0
    ? test.results.maxWatt!
    : (test.rawData.length > 0
        ? Math.max(...test.rawData.filter(r => r.hr > 0).map(r => r.watt), 0) || null
        : null)

  const absVo2 = test.results.vo2AbsoluteMlMin != null
    ? test.results.vo2AbsoluteMlMin
    : (vo2 != null && bodyWeight != null && bodyWeight > 0 ? Math.round(vo2 * bodyWeight) : null)

  const stats: { label: string; value: string }[] = []
  if (maxHR != null && maxHR > 0) stats.push({ label: "Max puls", value: `${maxHR} bpm` })
  if (!speedSport && maxWatt != null && maxWatt > 0) stats.push({ label: "Max effekt", value: `${maxWatt} W` })
  if (exhaustionTime) stats.push({ label: "Utmattningstid", value: exhaustionTime })
  if (maxLactate != null && maxLactate > 0) stats.push({ label: "Max laktat", value: `${maxLactate.toFixed(1)} mmol/L` })
  if (absVo2 != null && absVo2 > 0) stats.push({ label: "Syreupptag", value: `${(absVo2 / 1000).toFixed(2)} L/min` })
  if (bodyWeight != null && bodyWeight > 0) stats.push({ label: "Kroppsvikt", value: `${bodyWeight} kg` })

  return (
    <div className="rounded-2xl bg-[#0071BA] p-6 text-white shadow-xl shadow-[#0071BA]/20">
      <span className="text-sm font-black uppercase tracking-[0.15em] text-white/80">VO₂MAX</span>

      {vo2 != null ? (
        <div className="mt-2 flex items-end gap-3">
          <span className="text-[72px] font-black leading-none tracking-tighter text-white">{vo2}</span>
          <span className="text-lg text-white/70 mb-3">ml/kg/min</span>
        </div>
      ) : (
        <p className="mt-3 text-white/60 text-sm">Inget VO₂ max-värde sparat</p>
      )}

      {stats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wider text-white/60 leading-none mb-1.5">{label}</p>
              <p className="text-xl font-black tracking-tight leading-none">{value}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
