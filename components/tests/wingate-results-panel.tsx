import { Test } from "@/types"

interface WingateResultsPanelProps {
  test: Test
}

export function WingateResultsPanel({ test }: WingateResultsPanelProps) {
  const wd = test.wingateData
  const wp = test.wingateInputParams
  const bw = wp?.bodyWeight

  function wkg(watts: number) {
    if (!bw || bw <= 0) return null
    return (watts / bw).toFixed(2)
  }

  return (
    <div className="space-y-5">

      {/* Effektresultat */}
      <div className="rounded-2xl bg-[#007AFF] p-6 text-white shadow-xl shadow-[#007AFF]/20">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-white mb-4">Wingate-resultat</p>

        <div className="space-y-4">
          {wd?.peakPower != null && (
            <div>
              <p className="text-sm uppercase tracking-wider text-white/80">Peak</p>
              <p className="text-3xl font-black tracking-tighter leading-none">
                {wd.peakPower} <span className="text-base font-normal text-white">W</span>
                {wkg(wd.peakPower) && (
                  <span className="ml-3 text-base font-normal text-white/70">{wkg(wd.peakPower)} W/kg</span>
                )}
              </p>
            </div>
          )}
          {wd?.meanPower != null && (
            <div>
              <p className="text-sm uppercase tracking-wider text-white/80">Medel</p>
              <p className="text-3xl font-black tracking-tighter leading-none">
                {wd.meanPower} <span className="text-base font-normal text-white">W</span>
                {wkg(wd.meanPower) && (
                  <span className="ml-3 text-base font-normal text-white/70">{wkg(wd.meanPower)} W/kg</span>
                )}
              </p>
            </div>
          )}
          {wd?.minPower != null && (
            <div>
              <p className="text-sm uppercase tracking-wider text-white/80">Min</p>
              <p className="text-3xl font-black tracking-tighter leading-none">
                {wd.minPower} <span className="text-base font-normal text-white">W</span>
                {wkg(wd.minPower) && (
                  <span className="ml-3 text-base font-normal text-white/70">{wkg(wd.minPower)} W/kg</span>
                )}
              </p>
            </div>
          )}
          {wd?.peakPower != null && wd?.minPower != null && wd.peakPower > 0 && (
            <div className="mt-2 border-t border-white/30 pt-3 space-y-3">
              <div>
                <p className="text-sm uppercase tracking-wider text-white/80">Fatigue Index</p>
                <p className="text-xl font-black tracking-tighter">
                  {(((wd.peakPower - wd.minPower) / wd.peakPower) * 100).toFixed(1)}
                  <span className="text-base font-normal text-white ml-1">%</span>
                </p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-white/80">Power Drop</p>
                <p className="text-xl font-black tracking-tighter">
                  {wd.peakPower - wd.minPower}
                  <span className="text-base font-normal text-white ml-1">W</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Protokoll */}
      {wp && (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Protokoll</p>
          <dl className="space-y-2 text-base">
            {wp.startCadenceRpm != null && (
              <div className="flex justify-between">
                <dt className="text-[#515154]">Startkadens</dt>
                <dd className="font-semibold">{wp.startCadenceRpm} rpm</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[#515154]">Bromsbelastning</dt>
              <dd className="font-semibold">{wp.bodyWeightPercent} % av kroppsvikt</dd>
            </div>
            {wp.bodyWeight != null && (
              <div className="flex justify-between">
                <dt className="text-[#515154]">Kroppsvikt</dt>
                <dd className="font-semibold">{wp.bodyWeight} kg</dd>
              </div>
            )}
          </dl>
        </div>
      )}

    </div>
  )
}
