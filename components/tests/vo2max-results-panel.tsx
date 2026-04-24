import { Test } from "@/types"

interface Vo2MaxResultsPanelProps {
  test: Test
  gender: "M" | "K" | ""
}

function parseExhaustionTime(notes: string): string | null {
  const m = notes?.match(/^Utmattning tid: (\d+:\d+)/)
  return m ? m[1] : null
}

export function Vo2MaxResultsPanel({ test }: Vo2MaxResultsPanelProps) {
  const vo2 = test.results.vo2Max
  const maxHR = test.results.maxHR
  const maxLactate = test.results.maxLactate
  const bodyWeight = test.inputParams.bodyWeight
  const exhaustionTime = parseExhaustionTime(test.notes ?? "")

  // Prefer explicitly stored maxWatt, fall back to rawData derivation
  const maxWatt = (test.results.maxWatt ?? 0) > 0
    ? test.results.maxWatt!
    : (test.rawData.length > 0
        ? Math.max(...test.rawData.filter(r => r.hr > 0).map(r => r.watt), 0) || null
        : null)

  // Absolute VO2: use stored value if available, fall back to reverse-calc
  const absVo2 = test.results.vo2AbsoluteMlMin != null
    ? test.results.vo2AbsoluteMlMin
    : (vo2 != null && bodyWeight != null && bodyWeight > 0 ? Math.round(vo2 * bodyWeight) : null)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-apple p-6">
        <p className="text-sm font-black uppercase tracking-widest text-primary mb-4">VO₂MAX</p>

        {/* Big value */}
        {vo2 != null && (
          <div className="mb-5 flex items-end gap-2">
            <span className="text-[56px] font-black leading-none tracking-tighter text-interactive">{vo2}</span>
            <span className="text-base text-secondary mb-2">ml/kg/min</span>
          </div>
        )}

        <div className="space-y-0 divide-y divide-[hsl(var(--border))]/50">

          {/* Protokoll */}
          <div className="py-3">
            <p className="text-xs font-black uppercase tracking-widest text-secondary mb-2">Protokoll</p>
            <dl className="space-y-1.5">
              <div className="flex justify-between text-base">
                <dt className="text-secondary">Starteffekt</dt>
                <dd className="font-semibold text-primary">
                  {(test.inputParams.startWatt ?? 0) > 0 ? `${test.inputParams.startWatt} W` : "Ej angivet"}
                </dd>
              </div>
              <div className="flex justify-between text-base">
                <dt className="text-secondary">Effektökning</dt>
                <dd className="font-semibold text-primary">
                  {(test.inputParams.stepSize ?? 0) > 0 ? `${test.inputParams.stepSize} W/min` : "Ej angivet"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Utmattning */}
          <div className="py-3">
            <p className="text-xs font-black uppercase tracking-widest text-secondary mb-2">Utmattning</p>
            <dl className="space-y-1.5">
              {exhaustionTime && (
                <div className="flex justify-between text-base">
                  <dt className="text-secondary">Utmattningstid</dt>
                  <dd className="font-semibold text-primary">{exhaustionTime}</dd>
                </div>
              )}
              <div className="flex justify-between text-base">
                <dt className="text-secondary">Max effekt</dt>
                <dd className="font-semibold text-primary">
                  {maxWatt != null && maxWatt > 0 ? `${maxWatt} W` : "Ej angivet"}
                </dd>
              </div>
              {maxLactate != null && maxLactate > 0 && (
                <div className="flex justify-between text-base">
                  <dt className="text-secondary">Maxlaktat</dt>
                  <dd className="font-bold text-primary">{maxLactate.toFixed(2)} mmol/L</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Resultat */}
          <div className="py-3">
            <p className="text-xs font-black uppercase tracking-widest text-secondary mb-2">Resultat</p>
            <dl className="space-y-1.5">
              {absVo2 != null && absVo2 > 0 && (
                <div className="flex justify-between text-base">
                  <dt className="text-secondary">Syreupptag (abs.)</dt>
                  <dd className="font-semibold text-primary">{absVo2} ml/min</dd>
                </div>
              )}
              {maxHR != null && maxHR > 0 && (
                <div className="flex justify-between text-base">
                  <dt className="text-secondary">Max puls</dt>
                  <dd className="font-semibold text-primary">{maxHR} bpm</dd>
                </div>
              )}
            </dl>
          </div>

        </div>
      </div>
    </div>
  )
}
