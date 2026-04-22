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

export interface ChartDataset {
  data: DataPoint[]
  label: string
  lt1?: number | null
  lt2?: number | null
}

interface CompareChartProps {
  datasets: ChartDataset[]
  xUnit?: string
}

const COLORS = [
  { hr: "#3b82f6", lac: "#f43f5e" },
  { hr: "#f97316", lac: "#f59e0b" },
  { hr: "#10b981", lac: "#8b5cf6" },
  { hr: "#ec4899", lac: "#14b8a6" },
  { hr: "#6366f1", lac: "#84cc16" },
]

function mergeDatasets(datasets: ChartDataset[]) {
  const map = new Map<number, Record<string, number | null>>()
  datasets.forEach((ds, i) => {
    for (const p of ds.data) {
      const existing = map.get(p.watt) ?? { watt: p.watt }
      map.set(p.watt, { ...existing, [`hr${i}`]: p.hr, [`lac${i}`]: p.lac })
    }
  })
  return Array.from(map.values()).sort((a, b) => (a.watt as number) - (b.watt as number))
}

export function CompareChart({ datasets, xUnit = "W" }: CompareChartProps) {
  const merged = mergeDatasets(datasets)

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={merged} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
        <XAxis
          dataKey="watt"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v) => `${v} ${xUnit}`}
          tick={{ fontSize: 12, fill: "#515154" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="hr"
          orientation="left"
          domain={[60, "dataMax + 10"]}
          tick={{ fontSize: 12, fill: "#515154" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <YAxis
          yAxisId="lac"
          orientation="right"
          domain={[0, "dataMax + 1"]}
          tick={{ fontSize: 12, fill: "#515154" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />

        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E5E5EA", fontSize: 12 }}
          formatter={(value, name: string) => {
            if (name.startsWith("Puls")) return [`${value} bpm`, name]
            return [`${value} mmol/L`, name]
          }}
          labelFormatter={(v) => `${v} ${xUnit}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {datasets.map((ds, i) => {
          const color = COLORS[i % COLORS.length]
          const dash = i > 0 ? "5 3" : undefined
          return [
            <Line
              key={`hr${i}`}
              yAxisId="hr"
              dataKey={`hr${i}`}
              name={`Puls ${ds.label}`}
              stroke={color.hr}
              strokeWidth={2}
              dot={false}
              connectNulls
              strokeDasharray={dash}
            />,
            <Line
              key={`lac${i}`}
              yAxisId="lac"
              dataKey={`lac${i}`}
              name={`Laktat ${ds.label}`}
              stroke={color.lac}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              strokeDasharray={dash}
            />,
          ]
        })}

        {datasets.map((ds, i) => {
          const color = COLORS[i % COLORS.length]
          return [
            ds.lt1 ? <ReferenceLine key={`lt1-${i}`} yAxisId="hr" x={ds.lt1} stroke={color.hr} strokeDasharray="4 2" label={{ value: `LT1 ${ds.label}`, position: "top", fontSize: 10, fill: color.hr }} /> : null,
            ds.lt2 ? <ReferenceLine key={`lt2-${i}`} yAxisId="hr" x={ds.lt2} stroke={color.lac} strokeDasharray="4 2" label={{ value: `LT2 ${ds.label}`, position: "top", fontSize: 10, fill: color.lac }} /> : null,
          ]
        })}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
