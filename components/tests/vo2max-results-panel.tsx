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

      {/* Classification bar */}
      {vo2 != null && (
        <div className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-apple p-6">
          <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-4">
            Konditionsklass {gender === "K" ? "— Kvinna" : gender === "M" ? "— Man" : ""}
          </p>
          <div className="flex rounded-xl overflow-hidden">
            {VO2MAX_ZONES.map((zone, i) => {
              const isActive = i === activeZone
              return (
                <div
                  key={zone.label}
                  className={`flex-1 ${zone.colorBg} flex flex-col items-center justify-center py-3 px-1 transition-all ${
                    isActive ? "ring-2 ring-inset ring-[#1D1D1F]/30 scale-y-110 relative z-10" : "opacity-70"
                  }`}
                >
                  <span className={`text-xs font-black tabular-nums ${zone.colorText}`}>
                    {breakpoints[i] > 0 ? breakpoints[i] : "<" + breakpoints[1]}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase leading-tight text-center mt-0.5 ${zone.colorText}`}>
                    {zone.label}
                  </span>
                </div>
              )
            })}
          </div>
          {activeZone >= 0 && (
            <p className="mt-3 text-base text-[#515154] text-center">
              <span className="font-bold text-[#1D1D1F]">{vo2} ml/kg/min</span>
              {" "}— {VO2MAX_ZONES[activeZone].label}
            </p>
          )}
        </div>
      )}

    </div>
  )
}
