"use client"

import { useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts"
import { Maximize2, Minimize2 } from "lucide-react"
import type { SerializedTest } from "@/components/athletes/athlete-tests-panel"

export function AthleteTrendChart({ tests }: { tests: SerializedTest[] }) {
  const [fullscreen, setFullscreen] = useState(false)

  const eligible = tests.filter(
    (t) => t.testType === "troskeltest" && (t.results.atWatt || t.results.ltWatt)
  )

  if (eligible.length < 2) return null

  // Auto-select sport with most threshold tests — no pill selector shown
  const sportCounts = eligible.reduce<Record<string, number>>((acc, t) => {
    acc[t.sport] = (acc[t.sport] ?? 0) + 1
    return acc
  }, {})
  const dominantSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0][0]

  const data = eligible
    .filter((t) => t.sport === dominantSport)
    .sort((a, b) => a.testDateStr.localeCompare(b.testDateStr))
    .map((t) => ({ date: t.testDateStr, lt1: t.results.atWatt ?? null, lt2: t.results.ltWatt ?? null }))

  if (data.length < 2) return null

  const chart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis unit=" W" tick={{ fontSize: 11 }} width={52} />
        <Tooltip formatter={(v: number, name: string) => [`${v} W`, name === "lt1" ? "AT" : "LT"]} />
        <Legend formatter={(v) => (v === "lt1" ? "AT" : "LT")} />
        <Line type="monotone" dataKey="lt1" name="lt1" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
        <Line type="monotone" dataKey="lt2" name="lt2" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )

  return (
    <>
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Tröskelutveckling</h3>
          <button
            onClick={() => setFullscreen(true)}
            aria-label="Helskärm"
            className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        {chart(200)}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Tröskelutveckling</h3>
              <button
                onClick={() => setFullscreen(false)}
                aria-label="Stäng helskärm"
                className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#86868B] transition-colors"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
            {chart(420)}
          </div>
        </div>
      )}
    </>
  )
}
