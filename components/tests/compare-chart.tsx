"use client"

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

interface DataPoint {
  watt: number
  hr: number | null
  lac: number | null
}

interface CompareChartProps {
  dataA: DataPoint[]
  dataB: DataPoint[]
  labelA: string
  labelB: string
  lt1A?: number | null
  lt2A?: number | null
  lt1B?: number | null
  lt2B?: number | null
}

// Merge two datasets by watt value so Recharts can render them on the same x-axis
function mergeDatasets(a: DataPoint[], b: DataPoint[]) {
  const map = new Map<number, Record<string, number | null>>()
  for (const p of a) {
    map.set(p.watt, { watt: p.watt, hrA: p.hr, lacA: p.lac })
  }
  for (const p of b) {
    const existing = map.get(p.watt) ?? { watt: p.watt, hrA: null, lacA: null }
    map.set(p.watt, { ...existing, hrB: p.hr, lacB: p.lac })
  }
  return Array.from(map.values()).sort((a, b) => (a.watt as number) - (b.watt as number))
}

export function CompareChart({ dataA, dataB, labelA, labelB, lt1A, lt2A, lt1B, lt2B }: CompareChartProps) {
  const merged = mergeDatasets(dataA, dataB)

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={merged} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
        <XAxis
          dataKey="watt"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v) => `${v}W`}
          tick={{ fontSize: 12, fill: "#515154" }}
          axisLine={false}
          tickLine={false}
        />
        {/* Left Y: Heart Rate */}
        <YAxis
          yAxisId="hr"
          orientation="left"
          domain={[60, "dataMax + 10"]}
          tickFormatter={(v) => `${v}`}
          tick={{ fontSize: 12, fill: "#515154" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        {/* Right Y: Lactate */}
        <YAxis
          yAxisId="lac"
          orientation="right"
          domain={[0, "dataMax + 1"]}
          tickFormatter={(v) => `${v}`}
          tick={{ fontSize: 12, fill: "#515154" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />

        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E5E5EA", fontSize: 12 }}
          formatter={(value, name) => {
            if (name === `Puls ${labelA}` || name === `Puls ${labelB}`) return [`${value} bpm`, name]
            return [`${value} mmol/L`, name]
          }}
          labelFormatter={(v) => `${v}W`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {/* HR lines */}
        <Line yAxisId="hr" dataKey="hrA" name={`Puls ${labelA}`} stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
        <Line yAxisId="hr" dataKey="hrB" name={`Puls ${labelB}`} stroke="#f97316" strokeWidth={2} dot={false} connectNulls strokeDasharray="5 3" />

        {/* Lactate lines */}
        <Line yAxisId="lac" dataKey="lacA" name={`Laktat ${labelA}`} stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line yAxisId="lac" dataKey="lacB" name={`Laktat ${labelB}`} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls strokeDasharray="5 3" />

        {/* LT reference lines */}
        {lt1A && <ReferenceLine yAxisId="hr" x={lt1A} stroke="#3b82f6" strokeDasharray="4 2" label={{ value: "LT1 A", position: "top", fontSize: 10, fill: "#3b82f6" }} />}
        {lt2A && <ReferenceLine yAxisId="hr" x={lt2A} stroke="#f43f5e" strokeDasharray="4 2" label={{ value: "LT2 A", position: "top", fontSize: 10, fill: "#f43f5e" }} />}
        {lt1B && <ReferenceLine yAxisId="hr" x={lt1B} stroke="#f97316" strokeDasharray="4 2" label={{ value: "LT1 B", position: "top", fontSize: 10, fill: "#f97316" }} />}
        {lt2B && <ReferenceLine yAxisId="hr" x={lt2B} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "LT2 B", position: "top", fontSize: 10, fill: "#f59e0b" }} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
