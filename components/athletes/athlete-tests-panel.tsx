"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Plus, GitCompareArrows, FileText, Upload, Trash2, Pencil, Check, X as XIcon, Download } from "lucide-react"
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
  const [filesLoading, setFilesLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState<"all" | "test" | "file">("all")
  const [testTypeFilter, setTestTypeFilter] = useState<string>("all")
  const [sportFilter, setSportFilter] = useState<string>("all")
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingResultType, setEditingResultType] = useState("")
  const [previewFile, setPreviewFile] = useState<SerializedAthleteFile | null>(null)

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
    setFilesLoading(false)
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

  const availableSports = [...new Set(tests.map((t) => t.sport))]

  const sportLabels: Record<string, string> = {
    cykel: "Cykel", lopning: "Löpning", skidor_band: "Skidor", skierg: "Skierg", kajak: "Kajak",
  }

  const items: ListItem[] = [
    ...tests
      .filter(() => kindFilter !== "file")
      .filter((t) => testTypeFilter === "all" || t.testType === testTypeFilter)
      .filter((t) => sportFilter === "all" || t.sport === sportFilter)
      .map((t): ListItem => ({ kind: "test", dateStr: t.testDateStr, data: t })),
    ...fileResults
      .filter((_f) => kindFilter !== "test")
      .map((f): ListItem => ({ kind: "file", dateStr: f.testDateStr, data: f })),
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

      {/* Filter pills — typ */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Alla", kind: "all" as const, type: "all" },
          { label: "Tröskeltest", kind: "test" as const, type: "troskeltest" },
          { label: "VO₂ max", kind: "test" as const, type: "vo2max" },
          { label: "Wingate", kind: "test" as const, type: "wingate" },
          { label: "Dokument", kind: "file" as const, type: "all" },
        ].map(({ label, kind, type }) => {
          const active = kindFilter === kind && (kind === "all" || kind === "file" || testTypeFilter === type)
          return (
            <button
              key={label}
              onClick={() => { setKindFilter(kind); setTestTypeFilter(type); setSportFilter("all") }}
              className={cn(buttonVariants({ variant: active ? "default" : "outline", size: "sm" }))}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Filter pills — sport (dold vid Dokument-filter) */}
      {kindFilter !== "file" && availableSports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {["all", ...availableSports].map((sport) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={cn(buttonVariants({ variant: sportFilter === sport ? "default" : "outline", size: "sm" }))}
            >
              {sport === "all" ? "Alla sporter" : (sportLabels[sport] ?? sport)}
            </button>
          ))}
        </div>
      )}

      {filesLoading ? (
        <div className="space-y-2">
          {[...Array(tests.length + 1)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm px-4 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 rounded bg-[#E5E5EA] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#E5E5EA] rounded w-1/3" />
                <div className="h-3 bg-[#F5F5F7] rounded w-1/2" />
              </div>
              <div className="h-3 bg-[#E5E5EA] rounded w-20 flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[#515154] text-base">
          {kindFilter === "all" && testTypeFilter === "all" && sportFilter === "all"
            ? "Inga tester registrerade ännu."
            : "Inga tester matchar filtret."}
        </p>
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
            const isEditing = editingFileId === f.id

            async function handleDeleteFile(e: React.MouseEvent) {
              e.preventDefault()
              if (!confirm(`Ta bort "${f.fileName}"?`)) return
              await deleteDoc(doc(db, "athlete_files", f.id))
              setFileResults((prev) => prev.filter((x) => x.id !== f.id))
            }

            async function handleSaveEdit(e: React.MouseEvent) {
              e.preventDefault()
              await updateDoc(doc(db, "athlete_files", f.id), { resultType: editingResultType })
              setFileResults((prev) => prev.map((x) => x.id === f.id ? { ...x, resultType: editingResultType } : x))
              setEditingFileId(null)
            }

            return (
              <div
                key={`file-${f.id}`}
                className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-3 px-4 py-4"
              >
                {/* File icon */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#515154]">
                  <FileText className="w-4 h-4" />
                </div>

                {/* Content */}
                <div onClick={() => !isEditing && setPreviewFile(f)} className="flex-1 min-w-0 cursor-pointer hover:opacity-70 transition-opacity">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingResultType}
                        onChange={(e) => setEditingResultType(e.target.value)}
                        onClick={(e) => e.preventDefault()}
                        className="text-sm font-semibold border border-[#007AFF] rounded px-1.5 py-0.5 outline-none"
                      />
                    ) : (
                      <span className="font-semibold text-[#1D1D1F]">{f.resultType}</span>
                    )}
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Dokument</span>
                  </div>
                  <p className="text-sm text-[#515154] mt-0.5 truncate">{f.fileName}</p>
                </div>

                {/* Date */}
                <span className="flex-shrink-0 text-sm text-[#515154]">{dateLabel}</span>

                {/* Actions */}
                {isEditing ? (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={handleSaveEdit} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"><Check className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.preventDefault(); setEditingFileId(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#515154] transition-colors"><XIcon className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.preventDefault(); setEditingFileId(f.id); setEditingResultType(f.resultType) }} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#515154] transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={handleDeleteFile} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showUpload && (
        <UploadResultDialog athleteId={athleteId} onClose={() => setShowUpload(false)} onUploaded={fetchFiles} />
      )}

      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl mx-4 overflow-hidden"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA]">
              <div className="min-w-0">
                <p className="font-semibold text-[#1D1D1F] truncate">{previewFile.resultType}</p>
                <p className="text-xs text-[#515154] truncate">{previewFile.fileName}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <a
                  href={previewFile.storageUrl}
                  download={previewFile.fileName}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <Download className="w-4 h-4" />
                  Ladda ned
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#515154] transition-colors">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-auto bg-[#F5F5F7]" style={{ minHeight: 0 }}>
              {previewFile.storageUrl.match(/\.pdf(\?|$)/i) || previewFile.fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewFile.storageUrl} className="w-full h-full" style={{ minHeight: "70vh" }} />
              ) : previewFile.fileName.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                <div className="flex items-center justify-center p-6 min-h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewFile.storageUrl} alt={previewFile.fileName} className="max-w-full max-h-[70vh] rounded-lg shadow" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
                  <FileText className="w-16 h-16 text-[#86868B]" />
                  <p className="text-[#515154]">Förhandsgranskning ej tillgänglig för denna filtyp.</p>
                  <a href={previewFile.storageUrl} download={previewFile.fileName} className={cn(buttonVariants())}>
                    <Download className="w-4 h-4" />
                    Ladda ned filen
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
