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
  tests: SerializedFullTest[]
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
  const datasets = tests.map((t) => ({
    data: t.rawData.filter((p) => p.watt > 0).map((p) => ({ watt: p.watt, hr: p.hr || null, lac: p.lac || null })),
    label: t.testDateStr,
    lt1: t.results.atWatt,
    lt2: t.results.ltWatt,
  }))

  const cols = `auto repeat(${tests.length}, 1fr)`

  const rows = [
    { label: "LT1 (Aerob tröskel)", values: tests.map((t) => stat(t.results.atWatt, "W")) },
    { label: "LT2 (Anaerob tröskel)", values: tests.map((t) => stat(t.results.ltWatt, "W")) },
    { label: "Max puls", values: tests.map((t) => stat(t.results.maxHR, "bpm")) },
    { label: "Max laktat", values: tests.map((t) => stat(t.results.maxLactate, "mmol/L")) },
    { label: "VO₂ max", values: tests.map((t) => stat(t.results.vo2Max, "ml/kg/min")) },
  ]

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-3xl shadow-apple p-6">
        <CompareChart datasets={datasets} />
      </div>

      {/* Results table */}
      <div className="bg-white rounded-3xl shadow-apple overflow-hidden">
        <div className="grid border-b border-black/[0.06]" style={{ gridTemplateColumns: cols }}>
          <div className="px-5 py-3 text-sm font-black uppercase tracking-wider text-[#515154]">Mätvärde</div>
          {tests.map((t) => (
            <div key={t.id} className="px-5 py-3 text-sm font-semibold text-[#1D1D1F] border-l border-black/[0.06]">
              {testTypeLabel(t.testType)} — {sportLabel(t.sport)}
              <span className="block text-xs font-normal text-[#515154]">{t.testDateStr}</span>
            </div>
          ))}
        </div>

        {rows.map((row, i) => (
          <div key={i} className="grid border-b border-black/[0.04] last:border-0" style={{ gridTemplateColumns: cols }}>
            <div className="px-5 py-3 text-sm text-[#515154]">{row.label}</div>
            {row.values.map((v, j) => (
              <div key={j} className="px-5 py-3 text-sm font-medium text-[#1D1D1F] border-l border-black/[0.06]">{v}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
