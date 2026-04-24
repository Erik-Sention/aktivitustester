"use client"

import { useState } from "react"
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from "recharts"
import { BarChart2, X, Maximize2 } from "lucide-react"
import { RawDataPoint } from "@/types"

function lacEnabledCheck(row: RawDataPoint, dur: number) {
  return row.min === 0 || (row.min > 0 && row.min % dur === 0)
}

interface LiveTestChartProps {
  rows: RawDataPoint[]
  dur: number
  height?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WattDot(props: any) {
  const { cx, cy, payload, stepMins } = props
  if (!stepMins?.has(payload.min) || payload.watt == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={2.5} fill="#C7C7CC" />
      <text x={cx + 5} y={cy - 14} fontSize={13} fill="#86868B" fontWeight="700" fontFamily="sans-serif">
        {payload.watt}W
      </text>
    </g>
  )
}

export function LiveTestChart({ rows, dur, height = 460 }: LiveTestChartProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const data = rows.map((r) => ({
    min: r.min,
    watt: r.watt > 0 ? r.watt : null,
    hr: r.hr > 0 ? r.hr : null,
    lac: lacEnabledCheck(r, dur) && r.lac > 0 ? r.lac : null,
    borg: lacEnabledCheck(r, dur) && r.borg > 0 ? r.borg : null,
    cadence: lacEnabledCheck(r, dur) && r.cadence > 0 ? r.cadence : null,
  }))

  const hasHr      = data.some((d) => d.hr != null)
  const hasLac     = data.some((d) => d.lac != null)
  const hasBorg    = data.some((d) => d.borg != null)
  const hasCadence = data.some((d) => d.cadence != null)

  if (!hasHr && !hasLac) {
    return (
      <div className="flex items-center justify-center h-40 text-[#D1D1D6] text-sm">
        Fyll i puls och laktatvärden för att se kurvan
      </div>
    )
  }

  const stepMins = new Set(
    rows.reduce<number[]>((acc, r, i) => {
      if (r.watt > 0 && (i === 0 || r.watt !== rows[i - 1].watt)) acc.push(r.min)
      return acc
    }, [])
  )

  const rightMargin = 48 + (hasLac ? 52 : 0)

  const chartContent = (
    <ComposedChart data={data} margin={{ top: 28, right: rightMargin, left: 0, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

      <XAxis
        dataKey="min"
        type="number"
        domain={[0, "dataMax"]}
        tickCount={Math.min(data.length, 20)}
        label={{ value: "Minut", position: "insideBottom", offset: -12, fontSize: 14 }}
        tick={{ fontSize: 13 }}
        height={48}
      />

      {/* Left: HR only */}
      <YAxis
        yAxisId="hr"
        orientation="left"
        label={{ value: "Puls (bpm)", angle: -90, position: "insideLeft", offset: 16, fontSize: 13 }}
        tick={{ fontSize: 13 }}
        width={56}
      />

      {/* Right 1: Watt */}
      <YAxis
        yAxisId="watt"
        orientation="right"
        label={{ value: "Watt", angle: 90, position: "insideRight", offset: 16, fontSize: 13 }}
        tick={{ fontSize: 13 }}
        width={48}
      />

      {/* Cadence — hidden axis, large domain pushes values into bottom quarter */}
      {hasCadence && (
        <YAxis yAxisId="cadence" orientation="left" domain={[0, 360]} hide />
      )}

      {/* Right 3: Lactate */}
      {hasLac && (
        <YAxis
          yAxisId="lac"
          orientation="right"
          domain={[0, "dataMax + 1"]}
          label={{ value: "Laktat (mmol)", angle: 90, position: "insideRight", offset: 16, fontSize: 13 }}
          tick={{ fontSize: 13 }}
          width={52}
        />
      )}

      {/* Borg — hidden axis, legend is sufficient */}
      {hasBorg && (
        <YAxis yAxisId="borg" orientation="right" domain={[6, 20]} hide />
      )}

      <Tooltip
        contentStyle={{ fontSize: 13 }}
        formatter={(value: number, name: string) => {
          if (name === "Puls")   return [`${value} bpm`, "Puls"]
          if (name === "Laktat") return [`${value} mmol/L`, "Laktat"]
          if (name === "Watt")   return [`${value} W`, "Watt"]
          if (name === "Kadans") return [`${value} rpm`, "Kadans"]
          if (name === "Borg")   return [`${value} (Borg)`, "Borg"]
          return [value, name]
        }}
        labelFormatter={(v) => `Minut ${v}`}
      />
      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />

      {/* Watt staircase */}
      <Line
        yAxisId="watt"
        type="stepAfter"
        dataKey="watt"
        name="Watt"
        stroke="#C7C7CC"
        strokeWidth={2}
        dot={({ key, ...props }) => <WattDot key={key} {...props} stepMins={stepMins} />}
        activeDot={false}
        connectNulls
      />

      {/* HR */}
      {hasHr && (
        <Line
          yAxisId="hr"
          type="monotone"
          dataKey="hr"
          name="Puls"
          stroke="#f43f5e"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
        >
          <LabelList dataKey="hr" position="top" offset={6} style={{ fontSize: 13, fill: "#f43f5e", fontWeight: 700 }} />
        </Line>
      )}

      {/* Cadence */}
      {hasCadence && (
        <Line
          yAxisId="cadence"
          type="monotone"
          dataKey="cadence"
          name="Kadans"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
        >
          <LabelList dataKey="cadence" position="bottom" offset={7} style={{ fontSize: 13, fill: "#8b5cf6", fontWeight: 700 }} />
        </Line>
      )}

      {/* Lactate */}
      {hasLac && (
        <Line
          yAxisId="lac"
          type="monotone"
          dataKey="lac"
          name="Laktat"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }}
          activeDot={{ r: 7 }}
          connectNulls
        >
          <LabelList dataKey="lac" position="top" offset={8} style={{ fontSize: 13, fill: "#3b82f6", fontWeight: 700 }} />
        </Line>
      )}

      {/* Borg */}
      {hasBorg && (
        <Line
          yAxisId="borg"
          type="monotone"
          dataKey="borg"
          name="Borg"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
        >
          <LabelList dataKey="borg" position="top" offset={7} style={{ fontSize: 13, fill: "#f59e0b", fontWeight: 700 }} />
        </Line>
      )}
    </ComposedChart>
  )

  return (
    <>
      {/* Inline chart — desktop only */}
      <div className="hidden lg:block relative">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="absolute top-0 right-0 z-10 p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors"
          title="Helskärm"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <ResponsiveContainer width="100%" height={height}>
          {chartContent}
        </ResponsiveContainer>
      </div>

      {/* Mobile trigger */}
      <button
        type="button"
        className="lg:hidden w-full rounded-xl border border-[hsl(var(--border))] bg-[#F5F5F7] py-4 text-sm font-semibold text-[#007AFF] flex items-center justify-center gap-2"
        onClick={() => setModalOpen(true)}
      >
        <BarChart2 className="h-4 w-4" />
        Se diagram
      </button>

      {/* Full-screen modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <span className="text-sm font-semibold text-[#1D1D1F]">Prestandagraf</span>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="p-2 rounded-lg hover:bg-[#F5F5F7] text-[#86868B]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartContent}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  )
}
