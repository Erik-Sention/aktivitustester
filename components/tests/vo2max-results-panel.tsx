import { Test } from "@/types"
import { VO2MAX_ZONES, VO2MAX_BREAKPOINTS_MEN, VO2MAX_BREAKPOINTS_WOMEN } from "@/lib/calculations"

interface Vo2MaxResultsPanelProps {
  test: Test
  gender: "M" | "K" | ""
}

function findZoneIndex(vo2: number, breakpoints: number[]): number {
  let zone = 0
  for (let i = 0; i < breakpoints.length; i++) {
    if (vo2 >= breakpoints[i]) zone = i
  }
  return zone
}

export function Vo2MaxResultsPanel({ test, gender }: Vo2MaxResultsPanelProps) {
  const vo2 = test.results.vo2Max
  const maxHR = test.results.maxHR
  const maxLactate = test.results.maxLactate
  const bodyWeight = test.inputParams.bodyWeight

  const breakpoints = gender === "K" ? VO2MAX_BREAKPOINTS_WOMEN : VO2MAX_BREAKPOINTS_MEN
  const activeZone = vo2 != null ? findZoneIndex(vo2, breakpoints) : -1

  // Derive max watt from rawData (highest watt where hr > 0)
  const maxWatt = test.rawData.length > 0
    ? Math.max(...test.rawData.filter(r => r.hr > 0).map(r => r.watt), 0) || null
    : null

  return (
    <div className="space-y-5">

      {/* Protocol summary */}
      <div className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-apple p-6">
        <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-4">VO₂MAX</p>

        {/* Big value */}
        {vo2 != null && (
          <div className="mb-5 flex items-end gap-2">
            <span className="text-[56px] font-black leading-none tracking-tighter text-[#007AFF]">{vo2}</span>
            <span className="text-base text-[#515154] mb-2">ml/kg/min</span>
          </div>
        )}

        <div className="space-y-0 divide-y divide-[hsl(var(--border))]/50">

          {/* Protokoll */}
          <div className="py-3">
            <p className="text-xs font-black uppercase tracking-widest text-[#515154] mb-2">Protokoll</p>
            <dl className="space-y-1.5">
              <div className="flex justify-between text-base">
                <dt className="text-[#515154]">Starteffekt</dt>
                <dd className="font-semibold text-[#1D1D1F]">
                  {test.inputParams.startWatt > 0 ? `${test.inputParams.startWatt} W` : "Ej angivet"}
                </dd>
              </div>
              <div className="flex justify-between text-base">
                <dt className="text-[#515154]">Effektökning</dt>
                <dd className="font-semibold text-[#1D1D1F]">
                  {test.inputParams.stepSize > 0 ? `${test.inputParams.stepSize} W/min` : "Ej angivet"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Utmattning */}
          <div className="py-3">
            <p className="text-xs font-black uppercase tracking-widest text-[#515154] mb-2">Utmattning</p>
            <dl className="space-y-1.5">
              <div className="flex justify-between text-base">
                <dt className="text-[#515154]">Max effekt</dt>
                <dd className="font-semibold text-[#1D1D1F]">
                  {maxWatt != null && maxWatt > 0 ? `${maxWatt} W` : "Ej angivet"}
                </dd>
              </div>
              {maxLactate != null && maxLactate > 0 && (
                <div className="flex justify-between text-base">
                  <dt className="text-[#515154]">Maxlaktat</dt>
                  <dd className="font-bold text-[#1D1D1F]">{maxLactate.toFixed(2)} mmol/L</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Resultat */}
          <div className="py-3">
            <p className="text-xs font-black uppercase tracking-widest text-[#515154] mb-2">Resultat</p>
            <dl className="space-y-1.5">
              {vo2 != null && bodyWeight != null && bodyWeight > 0 && (
                <div className="flex justify-between text-base">
                  <dt className="text-[#515154]">Syreupptag (abs.)</dt>
                  <dd className="font-semibold text-[#1D1D1F]">{Math.round(vo2 * bodyWeight)} ml/min</dd>
                </div>
              )}
              {maxHR != null && maxHR > 0 && (
                <div className="flex justify-between text-base">
                  <dt className="text-[#515154]">Max puls</dt>
                  <dd className="font-semibold text-[#1D1D1F]">{maxHR} bpm</dd>
                </div>
              )}
            </dl>
          </div>

        </div>
      </div>

      {/* Classification bar — ruler design */}
      {vo2 != null && (
        <div className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-apple p-6">
          <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-5">
            Konditionsklass {gender === "K" ? "— Kvinna" : gender === "M" ? "— Man" : ""}
          </p>
          {(() => {
            const maxDisplay = breakpoints[breakpoints.length - 1] + 14
            const clampedVo2 = Math.min(Math.max(vo2, 0), maxDisplay)
            const markerPct = (clampedVo2 / maxDisplay) * 100
            return (
              <div className="px-1">
                {/* Marker + caret */}
                <div className="relative h-9 mb-0.5 overflow-visible">
                  <div
                    className="absolute flex flex-col items-center"
                    style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
                  >
                    <span className="text-xs font-black text-[#1D1D1F] tabular-nums whitespace-nowrap">
                      {vo2} ml/kg/min
                    </span>
                    <span className="text-[10px] text-[#515154] whitespace-nowrap">
                      {activeZone >= 0 ? VO2MAX_ZONES[activeZone].label : ""}
                    </span>
                    <div className="mt-0.5 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#1D1D1F]" />
                  </div>
                </div>

                {/* Colored bar */}
                <div className="flex h-6 rounded-xl overflow-hidden gap-px bg-[#E5E5EA]">
                  {VO2MAX_ZONES.map((zone, i) => {
                    const start = breakpoints[i]
                    const end = i + 1 < breakpoints.length ? breakpoints[i + 1] : maxDisplay
                    const widthPct = ((end - start) / maxDisplay) * 100
                    const isActive = i === activeZone
                    return (
                      <div
                        key={zone.label}
                        className={`${zone.colorBg} transition-all ${isActive ? "opacity-100" : "opacity-35"}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    )
                  })}
                </div>

                {/* Zone labels */}
                <div className="flex mt-1.5">
                  {VO2MAX_ZONES.map((zone, i) => {
                    const start = breakpoints[i]
                    const end = i + 1 < breakpoints.length ? breakpoints[i + 1] : maxDisplay
                    const widthPct = ((end - start) / maxDisplay) * 100
                    const isActive = i === activeZone
                    return (
                      <div
                        key={zone.label}
                        className="flex flex-col items-center overflow-hidden"
                        style={{ width: `${widthPct}%` }}
                      >
                        <span className={`text-[9px] uppercase leading-tight text-center w-full px-0.5 truncate ${isActive ? "font-black text-[#1D1D1F]" : "font-medium text-[#86868B]"}`}>
                          {zone.label}
                        </span>
                        <span className={`text-[9px] tabular-nums ${isActive ? "text-[#515154]" : "text-[#86868B]/50"}`}>
                          {start > 0 ? start : "—"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}

    </div>
  )
}
