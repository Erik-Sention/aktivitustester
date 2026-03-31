"use client"

import { CompareChart } from "./compare-chart"

export interface SerializedFullTest {
  id: string
  testType: string
  sport: string
  testDateStr: string
  inputParams: { startWatt: number; stepSize: number; testDuration: number; bodyWeight: number | null }
  results: { atWatt: number | null; ltWatt: number | null; maxHR: number | null; maxLactate: number | null; vo2Max: number | null }
  rawData: { watt: number; hr: number; lac: number }[]
}

interface CompareViewProps {
  tests: [SerializedFullTest, SerializedFullTest]
}

function testTypeLabel(type: string) {
  if (type === "troskeltest") return "Tröskeltest"
  if (type === "vo2max") return "VO₂ max-test"
  if (type === "wingate") return "Wingate"
  return type
}

function sportLabel(sport: string) {
  if (sport === "cykel") return "Cykel"
  if (sport === "lopning") return "Löpning"
  if (sport === "skidor_band") return "Skidor (band)"
  if (sport === "skierg") return "Skierg"
  if (sport === "kajak") return "Kajak"
  return sport
}

function stat(value: number | null, unit: string) {
  return value != null ? `${value} ${unit}` : "—"
}

export function CompareView({ tests }: CompareViewProps) {
  const [a, b] = tests

  const dataA = a.rawData.filter((p) => p.watt > 0).map((p) => ({ watt: p.watt, hr: p.hr || null, lac: p.lac || null }))
  const dataB = b.rawData.filter((p) => p.watt > 0).map((p) => ({ watt: p.watt, hr: p.hr || null, lac: p.lac || null }))

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-3xl shadow-apple p-6">
        <CompareChart
          dataA={dataA}
          dataB={dataB}
          labelA={a.testDateStr}
          labelB={b.testDateStr}
          lt1A={a.results.atWatt}
          lt2A={a.results.ltWatt}
          lt1B={b.results.atWatt}
          lt2B={b.results.ltWatt}
        />
      </div>

      {/* Side-by-side results table */}
      <div className="bg-white rounded-3xl shadow-apple overflow-hidden">
        <div className="grid grid-cols-3 border-b border-black/[0.06]">
          <div className="px-5 py-3 text-sm font-black uppercase tracking-wider text-[#515154]">Mätvärde</div>
          <div className="px-5 py-3 text-sm font-semibold text-[#1D1D1F] border-l border-black/[0.06]">
            {testTypeLabel(a.testType)} — {sportLabel(a.sport)}
            <span className="block text-xs font-normal text-[#515154]">{a.testDateStr}</span>
          </div>
          <div className="px-5 py-3 text-sm font-semibold text-[#1D1D1F] border-l border-black/[0.06]">
            {testTypeLabel(b.testType)} — {sportLabel(b.sport)}
            <span className="block text-xs font-normal text-[#515154]">{b.testDateStr}</span>
          </div>
        </div>

        {[
          { label: "LT1 (Aerob tröskel)", a: stat(a.results.atWatt, "W"), b: stat(b.results.atWatt, "W") },
          { label: "LT2 (Anaerob tröskel)", a: stat(a.results.ltWatt, "W"), b: stat(b.results.ltWatt, "W") },
          { label: "Max puls", a: stat(a.results.maxHR, "bpm"), b: stat(b.results.maxHR, "bpm") },
          { label: "Max laktat", a: stat(a.results.maxLactate, "mmol/L"), b: stat(b.results.maxLactate, "mmol/L") },
          { label: "VO₂ max", a: stat(a.results.vo2Max, "ml/kg/min"), b: stat(b.results.vo2Max, "ml/kg/min") },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-3 border-b border-black/[0.04] last:border-0">
            <div className="px-5 py-3 text-sm text-[#515154]">{row.label}</div>
            <div className="px-5 py-3 text-sm font-medium text-[#1D1D1F] border-l border-black/[0.06]">{row.a}</div>
            <div className="px-5 py-3 text-sm font-medium text-[#1D1D1F] border-l border-black/[0.06]">{row.b}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
