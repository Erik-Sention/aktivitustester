"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Plus, GitCompareArrows } from "lucide-react"
import Link from "next/link"

export interface SerializedTest {
  id: string
  testType: string
  sport: string
  testDateStr: string
  inputParams: { startWatt: number; stepSize: number; testDuration: number }
  results: { atWatt: number | null; ltWatt: number | null; maxHR: number | null; maxLactate: number | null }
}

interface AthleteTestsPanelProps {
  tests: SerializedTest[]
  athleteId: string
}

function testTypeLabel(type: string) {
  if (type === "troskeltest") return "Tröskeltest"
  if (type === "vo2max") return "VO₂ max-test"
  if (type === "wingate") return "Wingate"
  return type
}

function SportBadge({ sport }: { sport: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    cykel:       { label: "Cykel",        bg: "bg-blue-100",   text: "text-blue-700" },
    lopning:     { label: "Löpning",      bg: "bg-green-100",  text: "text-green-700" },
    skidor_band: { label: "Skidor",       bg: "bg-purple-100", text: "text-purple-700" },
    skierg:      { label: "Skierg",       bg: "bg-indigo-100", text: "text-indigo-700" },
    kajak:       { label: "Kajak",        bg: "bg-teal-100",   text: "text-teal-700" },
  }
  const c = config[sport] ?? { label: sport, bg: "bg-gray-100", text: "text-gray-600" }
  return (
    <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-full", c.bg, c.text)}>
      {c.label}
    </span>
  )
}

export function AthleteTestsPanel({ tests, athleteId }: AthleteTestsPanelProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCompare() {
    const ids = Array.from(selected).join(",")
    router.push(`/dashboard/tests/compare?ids=${ids}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Tester</h2>
        <div className="flex gap-2">
          {selected.size >= 2 && (
            <button
              onClick={handleCompare}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <GitCompareArrows className="h-4 w-4" />
              Jämför valda ({selected.size})
            </button>
          )}
          <Link href={`/dashboard/tests/new?athlete=${athleteId}`} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" />
            Nytt test
          </Link>
        </div>
      </div>

      {tests.length === 0 ? (
        <p className="text-[#515154] text-base">Inga tester registrerade ännu.</p>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => {
            const isSelected = selected.has(test.id)
            return (
              <div
                key={test.id}
                onClick={() => router.push(`/dashboard/tests/${test.id}`)}
                className={cn(
                  "bg-white rounded-2xl border transition-colors cursor-pointer flex items-center gap-3 px-4 py-4",
                  isSelected
                    ? "border-[#007AFF] shadow-[0_0_0_2px_rgba(0,122,255,0.15)]"
                    : "border-[hsl(var(--border))] hover:bg-[#F5F5F7]/50 shadow-sm"
                )}
              >
                {/* Checkbox */}
                <div
                  onClick={(e) => toggle(test.id, e)}
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-[#007AFF] border-[#007AFF]"
                      : "bg-white border-[#C7C7CC] hover:border-[#007AFF]"
                  )}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1D1D1F]">{testTypeLabel(test.testType)}</span>
                    <SportBadge sport={test.sport} />
                  </div>
                  <p className="text-sm text-[#515154] mt-0.5">
                    {test.inputParams.startWatt > 0 && (
                      <span>{test.inputParams.startWatt}W +{test.inputParams.stepSize}W / {test.inputParams.testDuration} min</span>
                    )}
                    {test.inputParams.startWatt > 0 && (test.results.atWatt || test.results.ltWatt) && <span> · </span>}
                    {test.results.atWatt ? `LT1: ${test.results.atWatt}W` : ""}
                    {test.results.atWatt && test.results.ltWatt ? " · " : ""}
                    {test.results.ltWatt ? `LT2: ${test.results.ltWatt}W` : ""}
                  </p>
                </div>

                {/* Date */}
                <span className="flex-shrink-0 text-sm text-[#515154]">{test.testDateStr}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
