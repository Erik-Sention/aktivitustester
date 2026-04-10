"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Plus, GitCompareArrows, FileText, Upload } from "lucide-react"
import Link from "next/link"
import { SerializedAthleteFile } from "@/types"
import { UploadResultDialog } from "./upload-result-dialog"

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
  fileResults: SerializedAthleteFile[]
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

type ListItem =
  | { kind: "test"; dateStr: string; data: SerializedTest }
  | { kind: "file"; dateStr: string; data: SerializedAthleteFile }

export function AthleteTestsPanel({ tests, fileResults: initialFileResults, athleteId }: AthleteTestsPanelProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [fileResults, setFileResults] = useState<SerializedAthleteFile[]>(initialFileResults)

  async function fetchFiles() {
    const q = query(
      collection(db, "athlete_files"),
      where("athleteId", "==", athleteId),
      orderBy("testDate", "desc")
    )
    const snap = await getDocs(q)
    const files: SerializedAthleteFile[] = snap.docs.map((doc) => {
      const d = doc.data()
      const testDate = d.testDate?.toDate ? d.testDate.toDate() : new Date(d.testDate)
      const testDateEnd = d.testDateEnd?.toDate ? d.testDateEnd.toDate() : d.testDateEnd ? new Date(d.testDateEnd) : undefined
      return {
        id: doc.id,
        resultType: d.resultType,
        testDateStr: testDate.toLocaleDateString("sv-SE"),
        testDateEndStr: testDateEnd?.toLocaleDateString("sv-SE"),
        fileName: d.fileName,
        storageUrl: d.storageUrl,
      }
    })
    setFileResults(files)
  }

  useEffect(() => { fetchFiles() }, [athleteId])

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

  const items: ListItem[] = [
    ...tests.map((t): ListItem => ({ kind: "test", dateStr: t.testDateStr, data: t })),
    ...fileResults.map((f): ListItem => ({ kind: "file", dateStr: f.testDateStr, data: f })),
  ].sort((a, b) => b.dateStr.localeCompare(a.dateStr))

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
          <button
            onClick={() => setShowUpload(true)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Upload className="h-4 w-4" />
            Ladda upp resultat
          </button>
          <Link href={`/dashboard/tests/new?athlete=${athleteId}`} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" />
            Nytt test
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[#515154] text-base">Inga tester registrerade ännu.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            if (item.kind === "test") {
              const test = item.data
              const isSelected = selected.has(test.id)
              return (
                <div
                  key={`test-${test.id}`}
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
            }

            // File result
            const f = item.data
            const dateLabel = f.testDateEndStr ? `${f.testDateStr} – ${f.testDateEndStr}` : f.testDateStr
            return (
              <a
                key={`file-${f.id}`}
                href={f.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl border border-[hsl(var(--border))] hover:bg-[#F5F5F7]/50 shadow-sm transition-colors cursor-pointer flex items-center gap-3 px-4 py-4 no-underline"
              >
                {/* File icon */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#515154]">
                  <FileText className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1D1D1F]">{f.resultType}</span>
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Dokument
                    </span>
                  </div>
                  <p className="text-sm text-[#515154] mt-0.5 truncate">{f.fileName}</p>
                </div>

                {/* Date */}
                <span className="flex-shrink-0 text-sm text-[#515154]">{dateLabel}</span>
              </a>
            )
          })}
        </div>
      )}

      {showUpload && (
        <UploadResultDialog athleteId={athleteId} onClose={() => setShowUpload(false)} onUploaded={fetchFiles} />
      )}
    </div>
  )
}
