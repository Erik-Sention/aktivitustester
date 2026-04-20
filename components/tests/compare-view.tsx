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
  athleteName?: string
}

const TEST_COLORS = ["#3b82f6", "#f97316", "#8b5cf6", "#10b981"]

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

function DeltaCell({ oldVal, newVal, unit }: { oldVal: number | null; newVal: number | null; unit: string }) {
  if (oldVal == null || newVal == null) return <span className="text-[#86868B]">—</span>
  const delta = Math.round((newVal - oldVal) * 10) / 10
  const pct = oldVal !== 0 ? Math.round((delta / Math.abs(oldVal)) * 100) : null
  const positive = delta >= 0
  return (
    <span className={positive ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
      {positive ? "+" : ""}{delta} {unit}
      {pct != null && <span className="ml-1 text-xs">({positive ? "+" : ""}{pct}%)</span>}
    </span>
  )
}

export function CompareView({ tests }: CompareViewProps) {
  const sorted = tests.length === 2
    ? [...tests].sort((a, b) => a.testDateStr.localeCompare(b.testDateStr))
    : tests
  const showDelta = tests.length === 2

  const datasets = sorted.map((t, i) => ({
    data: t.rawData.filter((p) => p.watt > 0).map((p) => ({ watt: p.watt, hr: p.hr || null, lac: p.lac || null })),
    label: t.testDateStr,
    lt1: t.results.atWatt,
    lt2: t.results.ltWatt,
    color: TEST_COLORS[i],
  }))

  const rows: { label: string; unit: string; values: (number | null)[] }[] = [
    { label: "LT1 (Aerob tröskel)", unit: "W", values: sorted.map((t) => t.results.atWatt) },
    { label: "LT2 (Anaerob tröskel)", unit: "W", values: sorted.map((t) => t.results.ltWatt) },
    { label: "Max puls", unit: "bpm", values: sorted.map((t) => t.results.maxHR) },
    { label: "Max laktat", unit: "mmol/L", values: sorted.map((t) => t.results.maxLactate) },
    { label: "VO₂ max", unit: "ml/kg/min", values: sorted.map((t) => t.results.vo2Max) },
    { label: "Starteffekt / steg", unit: "W", values: sorted.map((t) => t.inputParams.startWatt) },
  ]

  const tdBase = "px-5 py-3 text-sm align-middle border-t border-black/[0.04]"

  return (
    <div className="space-y-6">
      {/* Test identity cards */}
      <div className="flex flex-wrap gap-3">
        {sorted.map((t, i) => (
          <div key={t.id} className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm px-4 py-3 flex items-start gap-3 min-w-[160px]">
            <div className="mt-0.5 h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: TEST_COLORS[i] }} />
            <div>
              <p className="text-sm font-semibold text-[#1D1D1F]">Test {i + 1}</p>
              <p className="text-xs text-[#515154] mt-0.5">{testTypeLabel(t.testType)} — {sportLabel(t.sport)}</p>
              <p className="text-xs text-[#86868B]">{t.testDateStr}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-3xl shadow-apple p-6">
        <CompareChart datasets={datasets} />
      </div>

      {/* Results table */}
      <div className="bg-white rounded-3xl shadow-apple overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#515154] whitespace-nowrap">Mätvärde</th>
              {sorted.map((t, i) => (
                <th key={t.id} className="px-5 py-3 text-left border-l border-black/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TEST_COLORS[i] }} />
                    <span className="text-sm font-semibold text-[#1D1D1F] whitespace-nowrap">Test {i + 1}</span>
                  </div>
                  <span className="block text-xs text-[#515154] mt-0.5 font-normal whitespace-nowrap">{t.testDateStr}</span>
                </th>
              ))}
              {showDelta && (
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#515154] border-l border-black/[0.06] whitespace-nowrap">
                  Förändring
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className={`${tdBase} text-[#515154] whitespace-nowrap`}>{row.label}</td>
                {row.values.map((v, j) => (
                  <td key={j} className={`${tdBase} font-medium text-[#1D1D1F] border-l border-black/[0.06]`}>
                    {row.label === "Starteffekt / steg"
                      ? `${sorted[j].inputParams.startWatt} / ${sorted[j].inputParams.stepSize} W`
                      : stat(v, row.unit)}
                  </td>
                ))}
                {showDelta && row.label !== "Starteffekt / steg" && (
                  <td className={`${tdBase} border-l border-black/[0.06]`}>
                    <DeltaCell oldVal={row.values[0]} newVal={row.values[1]} unit={row.unit} />
                  </td>
                )}
                {showDelta && row.label === "Starteffekt / steg" && (
                  <td className={`${tdBase} border-l border-black/[0.06]`} />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
