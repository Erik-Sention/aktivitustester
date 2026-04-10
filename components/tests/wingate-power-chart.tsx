"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts"
import { WingateData } from "@/types"

interface WingatePowerChartProps {
  wingateData: WingateData
  bodyWeight?: number | null
}

const COLORS: Record<string, string> = {
  Peak:  "#007AFF",
  Medel: "#34C759",
  Min:   "#FF9500",
}

export function WingatePowerChart({ wingateData, bodyWeight }: WingatePowerChartProps) {
  const bw = bodyWeight && bodyWeight > 0 ? bodyWeight : null

  const data = [
    { name: "Peak",  watt: wingateData.peakPower  },
    { name: "Medel", watt: wingateData.meanPower  },
    { name: "Min",   watt: wingateData.minPower   },
  ]

  function wkgLabel(watt: number) {
    if (!bw) return `${watt} W`
    return `${watt} W · ${(watt / bw).toFixed(1)} W/kg`
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: 0 }} barCategoryGap="35%">
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 13, fontWeight: 700, fill: "#1D1D1F" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#86868B" }}
          tickFormatter={(v) => `${v}`}
          unit=" W"
          domain={[0, "auto"]}
        />
        <Tooltip
          formatter={(value: number, name: string, props: { payload?: { name: string } }) =>
            [wkgLabel(value), props.payload?.name ?? name]
          }
          contentStyle={{ borderRadius: 10, border: "1px solid #E5E5EA", fontSize: 13 }}
          cursor={{ fill: "#F5F5F7" }}
        />
        <Bar dataKey="watt" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
          <LabelList
            dataKey="watt"
            position="top"
            formatter={(v: number) => `${v} W`}
            style={{ fontSize: 12, fontWeight: 700, fill: "#1D1D1F" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
