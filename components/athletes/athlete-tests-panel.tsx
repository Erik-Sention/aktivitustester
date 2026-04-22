"use client"

import { useState, useEffect, useRef, useMemo, createElement } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn, isSpeedSport, thresholdUnit } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import {
  Plus, GitCompareArrows, FileText, Upload, Pencil, Eye, MoreHorizontal,
  Check, X as XIcon, Download, Folder, ChevronDown, ChevronRight,
  Maximize2, Minimize2, ZoomIn, ZoomOut, ShieldCheck, ShieldOff, Trash2, TrendingUp,
} from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { SerializedAthleteFile } from "@/types"
import { getConsentEvents, ConsentEvent } from "@/lib/consent-events"

// react-pdf uses DOMMatrix at module evaluation time — must be client-only
const PdfViewer = dynamic(
  () => import("@/components/athletes/pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false }
)
import { UploadResultDialog } from "./upload-result-dialog"
import { DeleteFileButton } from "./delete-file-button"
import { archiveAthleteFilesAction } from "@/app/actions/athlete-files"
import { archiveTestAction } from "@/app/actions/tests"
import { fetchTestsForExport, buildAthleteCSV, downloadCSV } from "@/lib/export"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts"

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
  athleteName?: string
  isAdmin?: boolean
  requiresConsent?: boolean
  onConsentRequired?: () => void
  hasTrendData?: boolean
  showTrend?: boolean
  onToggleTrend?: () => void
}

function testTypeLabel(type: string) {
  if (type === "troskeltest") return "Tröskeltest"
  if (type === "vo2max") return "VO₂ max-test"
  if (type === "wingate") return "Wingate"
  return type
}

function SportBadge({ sport }: { sport: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    cykel:       { label: "Cykel",   bg: "bg-blue-100",   text: "text-blue-700" },
    lopning:     { label: "Löpning", bg: "bg-green-100",  text: "text-green-700" },
    skidor_band: { label: "Skidor",  bg: "bg-purple-100", text: "text-purple-700" },
    skierg:      { label: "Skierg",  bg: "bg-indigo-100", text: "text-indigo-700" },
    kajak:       { label: "Kajak",   bg: "bg-teal-100",   text: "text-teal-700" },
  }
  const c = config[sport] ?? { label: sport, bg: "bg-gray-100", text: "text-gray-600" }
  return (
    <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-full", c.bg, c.text)}>
      {c.label}
    </span>
  )
}

// --- Grouping types ---

type SingleFileItem = { kind: "single-file"; file: SerializedAthleteFile }
type GroupItem      = { kind: "group"; groupId: string; files: SerializedAthleteFile[] }
type FileDisplayItem = SingleFileItem | GroupItem

type ListItem =
  | { kind: "test"; dateStr: string; data: SerializedTest }
  | { kind: "file-item"; dateStr: string; data: FileDisplayItem }
  | { kind: "consent"; dateStr: string; data: ConsentEvent }

// ---- Excel preview helpers ----

/** Converts an Excel fractional-day time value (e.g. 0.000694 = 1 min) to "MM:SS" */
function excelTimeToStr(value: unknown): string {
  if (value === "" || value == null) return ""
  const n = Number(value)
  if (isNaN(n) || n < 0) return String(value)
  const totalSeconds = Math.round(n * 24 * 60 * 60)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

/** Converts an Excel date serial (e.g. 46023 → 2026-01-01) to a readable date string */
function maybeExcelDate(val: string): string {
  const n = Number(val)
  if (!isNaN(n) && n > 20000 && n < 60000) {
    const date = new Date(Math.round((n - 25569) * 86400 * 1000))
    return date.toLocaleDateString("sv-SE")
  }
  return val
}

const CHART_DEFS = [
  { keys: ["effekt", "watt", " w"], color: "#007AFF", name: "Effekt (W)", yAxis: "left" },
  { keys: ["puls", "hr", "hjärt"],  color: "#F59E0B", name: "Puls",       yAxis: "left" },
  { keys: ["laktat", "lac"],         color: "#EF4444", name: "Laktat",     yAxis: "right" },
]

function isExcel(fileName: string) {
  return /\.(xlsx|xlsm|xls)$/i.test(fileName)
}

const SKIP_LABELS = /^(sökväg|glidervärde|diagramkorrigering|grund-inställningar|ange minut|förstärkning|höjdkorrigering|testdata|data|databas|databas_jämföra|jämförelsedata|jämförelsedokument|dokument|inmatning|start)$/i
const SKIP_VALUES = /^(W|cm|kg|M\/K|min|mm:ss|ml\s*O2\/min|rpm|%|Ej angivet|EJ ANGIVET)$/i

function ExcelMetaSection({ metaRows }: { metaRows: unknown[][] }) {
  const pairs: { label: string; value: string }[] = []
  const seen = new Set<string>()

  for (const row of metaRows) {
    for (let i = 0; i < row.length - 1; i++) {
      const cell = String(row[i] ?? "").trim()
      if (!cell || !/[a-zA-ZåäöÅÄÖ]/.test(cell)) continue
      if (/ÅÅÅÅ|MM-DD/.test(cell)) continue

      const label = cell.endsWith(":") ? cell.slice(0, -1).trim() : cell
      if (SKIP_LABELS.test(label)) continue
      if (seen.has(label)) continue

      // Find the next non-empty value cell (up to 2 columns ahead)
      for (let j = i + 1; j <= Math.min(i + 2, row.length - 1); j++) {
        const raw = String(row[j] ?? "").trim()
        if (!raw || /ÅÅÅÅ|MM-DD|↓|▼/.test(raw)) continue
        if (raw.endsWith(":")) continue                        // another label
        if (/^[A-Za-z]:\\|^\//.test(raw)) continue            // file path
        if (SKIP_VALUES.test(raw)) continue                    // bare unit
        if (raw === label) continue                            // same as label

        const value = maybeExcelDate(raw)
        seen.add(label)
        pairs.push({ label, value })
        break
      }
    }
  }

  if (pairs.length === 0) return null

  return (
    <div className="px-4 pt-3 pb-3 border-b border-[#E5E5EA] bg-[#F5F5F7]/50">
      <p className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Testinformation</p>
      <div className="flex flex-wrap gap-1.5">
        {pairs.map((p, i) => (
          <div key={i} className="bg-white border border-[#E5E5EA] rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[#86868B]">{p.label}: </span>
            <span className="font-semibold text-[#1D1D1F]">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExcelChartSection({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  const tidIdx = headers.findIndex((h) => /^tid$/i.test(String(h).trim()))

  const detected = CHART_DEFS.flatMap((def) => {
    const idx = headers.findIndex((h) =>
      def.keys.some((k) => String(h).toLowerCase().trim().includes(k))
    )
    return idx >= 0 ? [{ ...def, idx }] : []
  })

  if (detected.length === 0) return null

  const chartData = rows
    .filter((row) => detected.some((d) => row[d.idx] !== "" && row[d.idx] != null && !isNaN(Number(row[d.idx]))))
    .map((row, i) => {
      const point: Record<string, unknown> = {
        tid: tidIdx >= 0 ? excelTimeToStr(row[tidIdx]) : String(i),
      }
      for (const d of detected) {
        const cell = row[d.idx]
        // Leave key unset for empty cells → Recharts shows a gap instead of 0
        if (cell !== "" && cell != null) {
          const v = Number(cell)
          if (!isNaN(v)) point[d.name] = v
        }
      }
      return point
    })

  if (chartData.length === 0) return null

  const hasRight = detected.some((d) => d.yAxis === "right")

  return (
    <div className="px-4 pt-4 pb-2">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: hasRight ? 48 : 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
          <XAxis dataKey="tid" tick={{ fontSize: 11, fill: "#515154" }} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#515154" }} width={40} />
          {hasRight && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#515154" }} width={40} />}
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {detected.map((d) => (
            <Line
              key={d.name}
              yAxisId={d.yAxis}
              type="monotone"
              dataKey={d.name}
              stroke={d.color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ExcelTableSection({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  const tidColIdx = headers.findIndex((h) => /^tid$/i.test(String(h).trim()))
  const dataRows = rows.filter((row) => row.some((cell) => cell !== "" && cell != null))
  return (
    <div className="overflow-auto flex-1 px-4 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
      <p className="text-xs text-[#86868B] py-1.5">← Scrolla horisontellt för att se alla kolumner</p>
      <table className="text-sm w-full border-collapse min-w-max">
        <thead className="sticky top-0 bg-white z-10">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold text-[#1D1D1F] border-b border-[#E5E5EA] whitespace-nowrap"
              >
                {String(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[#F5F5F7]"}>
              {headers.map((_, ci) => {
                const cell = row[ci]
                const display = (tidColIdx >= 0 && ci === tidColIdx)
                  ? excelTimeToStr(cell)
                  : String(cell ?? "")
                return (
                  <td key={ci} className="px-3 py-1.5 border-b border-[#F5F5F7] text-[#1D1D1F] whitespace-nowrap">
                    {display}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function groupFiles(fileResults: SerializedAthleteFile[]): FileDisplayItem[] {
  const groups = new Map<string, SerializedAthleteFile[]>()
  const singles: SerializedAthleteFile[] = []

  for (const f of fileResults) {
    if (!f.uploadGroupId) {
      singles.push(f)
    } else {
      const arr = groups.get(f.uploadGroupId) ?? []
      arr.push(f)
      groups.set(f.uploadGroupId, arr)
    }
  }

  const result: FileDisplayItem[] = []

  for (const f of singles) {
    result.push({ kind: "single-file", file: f })
  }

  for (const [groupId, files] of groups.entries()) {
    if (files.length === 1) {
      result.push({ kind: "single-file", file: files[0] })
    } else {
      result.push({ kind: "group", groupId, files })
    }
  }

  return result
}

export function AthleteTestsPanel({ tests, fileResults: initialFileResults, athleteId, athleteName, isAdmin, requiresConsent, onConsentRequired, hasTrendData, showTrend, onToggleTrend }: AthleteTestsPanelProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const openMenuRef = useRef<HTMLDivElement>(null)
  const [fileResults, setFileResults] = useState<SerializedAthleteFile[]>(initialFileResults)
  const [filesLoading, setFilesLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState<"all" | "test" | "file" | "consent">("all")
  const [testTypeFilter, setTestTypeFilter] = useState<string>("all")
  const [sportFilter, setSportFilter] = useState<string>("all")
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingResultType, setEditingResultType] = useState("")
  const [previewFile, setPreviewFile] = useState<SerializedAthleteFile | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [addToGroup, setAddToGroup] = useState<{ groupId: string; resultType: string; testDateStr: string } | null>(null)
  const [previewFullscreen, setPreviewFullscreen] = useState(false)
  const [pdfScale, setPdfScale] = useState(1)
  const [excelData, setExcelData] = useState<{
    headers: string[]
    rows: unknown[][]
    metaRows: unknown[][]
  } | null>(null)
  const [excelLoading, setExcelLoading] = useState(false)
  const [consentEvents, setConsentEvents] = useState<ConsentEvent[]>([])
  const [consentPreview, setConsentPreview] = useState<{ dataUrl: string; blobUrl: string; name: string } | null>(null)
  const [previewMoreOpen, setPreviewMoreOpen] = useState(false)
  const [consentPreviewLoading, setConsentPreviewLoading] = useState<string | null>(null)
  const [consentPreviewScale, setConsentPreviewScale] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [archivingMenuId, setArchivingMenuId] = useState<string | null>(null)
  const [archiveMenuReason, setArchiveMenuReason] = useState("")
  const [archiveMenuLoading, setArchiveMenuLoading] = useState(false)
  const [archiveMenuError, setArchiveMenuError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<{ title: string; message: string } | null>(null)

  async function fetchFiles() {
    const q = query(
      collection(db, "athlete_files"),
      where("athleteId", "==", athleteId),
      orderBy("testDate", "desc")
    )
    const snap = await getDocs(q)
    const files: SerializedAthleteFile[] = snap.docs.filter((d) => !d.data().isArchived).map((d) => {
      const data = d.data()
      const testDate = data.testDate?.toDate ? data.testDate.toDate() : new Date(data.testDate)
      const testDateEnd = data.testDateEnd?.toDate
        ? data.testDateEnd.toDate()
        : data.testDateEnd ? new Date(data.testDateEnd) : undefined
      return {
        id: d.id,
        resultType: data.resultType,
        category: data.category,
        testDateStr: testDate.toLocaleDateString("sv-SE"),
        testDateEndStr: testDateEnd?.toLocaleDateString("sv-SE"),
        fileName: data.fileName,
        storageUrl: data.storageUrl,
        uploadGroupId: data.uploadGroupId,
      }
    })
    setFileResults(files)
    setFilesLoading(false)
  }

  async function fetchConsentEventsForAthlete() {
    const events = await getConsentEvents(athleteId)
    setConsentEvents(events)
  }

  useEffect(() => {
    fetchFiles()
    fetchConsentEventsForAthlete()
  }, [athleteId])

  useEffect(() => {
    if (!openMenuId || archivingMenuId) return  // Keep menu open if we're archiving
    function close(e: MouseEvent) {
      // Don't close if clicking inside the open menu
      if (openMenuRef.current && openMenuRef.current.contains(e.target as Node)) {
        return
      }
      setOpenMenuId(null)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [openMenuId, archivingMenuId])

  function toggle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (!showExportMenu) return
    function onClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showExportMenu])

  async function handleExport(anonymize: boolean) {
    if (!athleteName) return
    setExporting(true)
    setShowExportMenu(false)
    try {
      const fullTests = await fetchTestsForExport(athleteId)
      const csv = buildAthleteCSV(fullTests, athleteName, anonymize)
      const slug = anonymize ? 'anonym' : athleteName.replace(/\s+/g, '-').toLowerCase()
      downloadCSV(csv, `${slug}-testdata.csv`)
    } finally {
      setExporting(false)
    }
  }

  function handleCompare() {
    const ids = Array.from(selected).join(",")
    router.push(`/dashboard/tests/compare?ids=${ids}`)
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const availableSports = [...new Set(tests.map((t) => t.sport))]

  const sportLabels: Record<string, string> = {
    cykel: "Cykel", lopning: "Löpning", skidor_band: "Skidor", skierg: "Skierg", kajak: "Kajak",
  }

  const fileDisplayItems = useMemo(() => groupFiles(fileResults), [fileResults])

  const items: ListItem[] = [
    ...tests
      .filter(() => kindFilter !== "file" && kindFilter !== "consent")
      .filter((t) => testTypeFilter === "all" || t.testType === testTypeFilter)
      .filter((t) => sportFilter === "all" || t.sport === sportFilter)
      .map((t): ListItem => ({ kind: "test", dateStr: t.testDateStr, data: t })),
    ...fileDisplayItems
      .filter(() => kindFilter !== "test" && kindFilter !== "consent")
      .map((fd): ListItem => {
        const dateStr = fd.kind === "single-file" ? fd.file.testDateStr : fd.files[0].testDateStr
        return { kind: "file-item", dateStr, data: fd }
      }),
    ...consentEvents
      .filter(() => kindFilter !== "test" && kindFilter !== "file")
      .map((ev): ListItem => {
        const dateStr = new Date(ev.timestamp.seconds * 1000).toLocaleDateString("sv-SE")
        return { kind: "consent", dateStr, data: ev }
      }),
  ].sort((a, b) => b.dateStr.localeCompare(a.dateStr))

  function handleArchived(fileIds: string[]) {
    const ids = new Set(fileIds)
    setFileResults((prev) => prev.filter((x) => !ids.has(x.id)))
  }

  async function handleSaveEdit(f: SerializedAthleteFile, e: React.MouseEvent) {
    e.preventDefault()
    await updateDoc(doc(db, "athlete_files", f.id), { resultType: editingResultType })
    setFileResults((prev) => prev.map((x) => x.id === f.id ? { ...x, resultType: editingResultType } : x))
    setEditingFileId(null)
  }

  async function handleSaveGroupEdit(group: GroupItem) {
    const trimmed = editingGroupName.trim()
    if (!trimmed) { setEditingGroupId(null); return }
    await Promise.all(group.files.map(f => updateDoc(doc(db, "athlete_files", f.id), { category: trimmed })))
    setFileResults(prev => prev.map(f => f.uploadGroupId === group.groupId ? { ...f, category: trimmed } : f))
    setEditingGroupId(null)
  }

  function closeArchiveMenu() {
    setArchivingMenuId(null)
    setArchiveMenuReason("")
    setArchiveMenuError(null)
    setOpenMenuId(null)
  }

  async function handleArchiveFiles(ids: string[]) {
    if (!archiveMenuReason.trim()) return
    setArchiveMenuLoading(true)
    try {
      await archiveAthleteFilesAction(ids, athleteId, archiveMenuReason)
      handleArchived(ids)
      setSuccessMessage({ title: "Arkiverat", message: `${ids.length} fil${ids.length > 1 ? "er" : ""} arkiverad` })
      closeArchiveMenu()
      router.refresh()
    } finally {
      setArchiveMenuLoading(false)
    }
  }

  async function handleArchiveTest(testId: string) {
    if (!archiveMenuReason.trim()) return
    setArchiveMenuLoading(true)
    setArchiveMenuError(null)
    try {
      await archiveTestAction(testId, athleteId, archiveMenuReason)
      setSuccessMessage("Testet arkiverat")
      setTimeout(() => setSuccessMessage(null), 2000)
      router.refresh()
      closeArchiveMenu()
    } catch {
      setArchiveMenuError("Kunde inte arkivera testet")
    } finally {
      setArchiveMenuLoading(false)
    }
  }

  async function loadExcel(url: string) {
    setExcelData(null)
    setExcelLoading(true)
    try {
      const { read, utils } = await import("xlsx")
      // Route through server-side proxy to avoid Firebase Storage CORS restrictions
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = await res.arrayBuffer()
      const wb = read(new Uint8Array(buffer), { type: "array" })
      const sheetName = wb.SheetNames.includes("Inmatning") ? "Inmatning" : wb.SheetNames[0]
      const raw = utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: "" })
      if (!raw || raw.length < 2) throw new Error("Tom fil eller oläsbart format")

      // Find the actual data header row (the row containing "Tid")
      // Sheets often have metadata above the real table
      let headerRowIdx = 0
      for (let i = 0; i < Math.min(raw.length, 30); i++) {
        const row = raw[i] as unknown[]
        if (row.some((cell) => /^tid$/i.test(String(cell).trim()))) {
          headerRowIdx = i
          break
        }
      }

      setExcelData({
        headers: (raw[headerRowIdx] as string[]).map((h) => String(h ?? "")),
        rows: raw.slice(headerRowIdx + 1) as unknown[][],
        metaRows: raw.slice(0, headerRowIdx) as unknown[][],
      })
    } catch (err) {
      console.error("loadExcel error:", err)
      setExcelData(null)
    }
    setExcelLoading(false)
  }

  function openPreview(f: SerializedAthleteFile) {
    setPreviewFile(f)
    if (isExcel(f.fileName)) {
      loadExcel(f.storageUrl)
    } else {
      setExcelData(null)
    }
  }

  function closePreview() {
    setPreviewFile(null)
    setExcelData(null)
    setExcelLoading(false)
    setPreviewFullscreen(false)
    setPdfScale(1)
    setPreviewMoreOpen(false)
  }

  async function handleConsentPreview(ev: ConsentEvent) {
    if (!athleteName) return
    setConsentPreviewLoading(ev.id)
    try {
      const [{ pdf }, { ConsentReceiptDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/athletes/consent-receipt-pdf"),
      ])
      const ts = new Date(ev.timestamp.seconds * 1000)
      const blob = await pdf(createElement(ConsentReceiptDocument, {
        athleteId: ev.athleteId,
        athleteName,
        athleteEmail: ev.email,
        personnummer: ev.personnummer,
        eventType: ev.eventType,
        eventDate: ts.toLocaleDateString("sv-SE"),
        systemTimestamp: ts.toISOString(),
        coachDisplayName: ev.coachDisplayName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any).toBlob()
      const blobUrl = URL.createObjectURL(blob)
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      const slug = athleteName.replace(/\s+/g, "-").toLowerCase()
      setConsentPreview({ dataUrl, blobUrl, name: `${slug}-samtycke-${ev.eventType}-${ts.toLocaleDateString("sv-SE")}.pdf` })
      setConsentPreviewScale(1)
    } catch (err) {
      console.error("Consent preview failed:", err)
    } finally {
      setConsentPreviewLoading(null)
    }
  }

  function closeConsentPreview() {
    if (consentPreview) URL.revokeObjectURL(consentPreview.blobUrl)
    setConsentPreview(null)
    setConsentPreviewScale(1)
  }

  function renderArchiveConfirm(onConfirm: () => void) {
    return (
      <div className="p-3">
        <div className="relative mb-2">
          <input
            autoFocus
            type="text"
            placeholder="Orsak till arkivering…"
            value={archiveMenuReason}
            onChange={(e) => setArchiveMenuReason(e.target.value.slice(0, 50))}
            className="w-full rounded-lg border border-[#C7C7CC] px-2.5 py-1.5 text-sm pr-9 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#86868B]">{archiveMenuReason.length}/50</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="destructive" onClick={onConfirm} disabled={archiveMenuLoading || !archiveMenuReason.trim()}>
            {archiveMenuLoading ? "…" : "Bekräfta"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setArchivingMenuId(null); setArchiveMenuReason(""); setArchiveMenuError(null) }}>
            Avbryt
          </Button>
        </div>
        {archiveMenuError && <p className="mt-1.5 text-xs text-red-500">{archiveMenuError}</p>}
      </div>
    )
  }

  function renderConsentRow(ev: ConsentEvent) {
    const labels: Record<string, string> = {
      granted: "Samtycke bekräftat",
      renewed: "Samtycke förnyat",
      revoked: "Samtycke indraget",
      declined: "Samtycke avböjt",
    }
    const isPositive = ev.eventType === "granted" || ev.eventType === "renewed"
    const isRevoked = ev.eventType === "revoked"
    const dateStr = new Date(ev.timestamp.seconds * 1000).toLocaleDateString("sv-SE")
    return (
      <div
        key={`consent-${ev.id}`}
        onClick={() => athleteName && handleConsentPreview(ev)}
        className={cn(
          "bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-3 px-4 py-4 transition-colors",
          athleteName && "cursor-pointer hover:bg-[#F5F5F7]/50"
        )}
      >
        <div className={cn(
          "flex-shrink-0 w-5 h-5 flex items-center justify-center",
          isPositive ? "text-green-600" : isRevoked ? "text-red-500" : "text-amber-500"
        )}>
          {isPositive ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-semibold text-[#1D1D1F]">{labels[ev.eventType] ?? ev.eventType}</span>
          <p className="text-sm text-[#515154] mt-0.5">
            av {ev.coachDisplayName}
          </p>
        </div>

        <span className="flex-shrink-0 text-sm text-[#515154] mr-1">{dateStr}</span>
        {athleteName && (
          <button
            onClick={(e) => { e.stopPropagation(); handleConsentPreview(ev) }}
            disabled={consentPreviewLoading === ev.id}
            className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-xs font-semibold text-[#86868B] shadow-sm transition-all hover:bg-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Eye className="h-3 w-3" />
            {consentPreviewLoading === ev.id ? "Genererar…" : "Visa"}
          </button>
        )}
      </div>
    )
  }

  // --- Render a single file row (used inside groups and for lone files) ---
  function renderSingleFileRow(f: SerializedAthleteFile, indented = false) {
    const dateLabel = f.testDateEndStr ? `${f.testDateStr} – ${f.testDateEndStr}` : f.testDateStr
    const isEditing = editingFileId === f.id
    const isActive = previewFile?.id === f.id

    return (
      <div
        key={`file-${f.id}`}
        onClick={() => !isEditing && openPreview(f)}
        className={cn(
          "bg-white rounded-2xl border shadow-sm flex items-center gap-3 px-4 py-4 transition-colors",
          !isEditing && "cursor-pointer hover:bg-[#F5F5F7]/50",
          isActive
            ? "border-[#007AFF] shadow-[0_0_0_2px_rgba(0,122,255,0.1)]"
            : "border-[hsl(var(--border))]",
          indented && "ml-6 border-l-2 border-l-[#007AFF]/20 rounded-l-none"
        )}
      >
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#515154]">
          <FileText className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <input
                autoFocus
                aria-label="Redigera resultattyp"
                value={editingResultType}
                onChange={(e) => setEditingResultType(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold border border-[#007AFF] rounded px-1.5 py-0.5 outline-none"
              />
            ) : (
              <span className="font-semibold text-[#1D1D1F]">{f.resultType}</span>
            )}
            {!indented && (
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Dokument</span>
            )}
          </div>
          {f.resultType !== f.fileName && (
            <p className="text-sm text-[#515154] mt-0.5 truncate">{f.fileName}</p>
          )}
        </div>

        <span className="flex-shrink-0 text-sm text-[#515154] mr-1">{dateLabel}</span>

        {isEditing ? (
          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Spara" onClick={(e) => handleSaveEdit(f, e)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button aria-label="Avbryt" onClick={(e) => { e.preventDefault(); setEditingFileId(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#515154] transition-colors">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="relative flex-shrink-0">
              <button
                aria-label="Fler alternativ"
                onClick={() => setOpenMenuId(openMenuId === `file-${f.id}` ? null : `file-${f.id}`)}
                className="p-1.5 rounded-full hover:bg-[#F5F5F7] text-[#86868B] transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {openMenuId === `file-${f.id}` && (
                <div ref={openMenuRef} className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[hsl(var(--border))] z-20 min-w-[160px] overflow-hidden">
                  {archivingMenuId === `file-${f.id}` ? renderArchiveConfirm(() => handleArchiveFiles([f.id])) : (
                    <>
                      <button
                        onClick={() => { setEditingFileId(f.id); setEditingResultType(f.resultType); setOpenMenuId(null) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] text-left"
                      >
                        <Pencil className="h-3.5 w-3.5 flex-shrink-0" /> Döp om
                      </button>
                      <a
                        href={f.storageUrl}
                        download={f.fileName}
                        onClick={() => setOpenMenuId(null)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
                      >
                        <Download className="h-3.5 w-3.5 flex-shrink-0" /> Ladda ner
                      </a>
                      <div className="h-px bg-[hsl(var(--border))]" />
                      <button
                        onClick={() => setArchivingMenuId(`file-${f.id}`)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 text-left"
                      >
                        <Trash2 className="h-3.5 w-3.5 flex-shrink-0" /> Arkivera
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); openPreview(f) }}
              className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-xs font-semibold text-[#86868B] shadow-sm transition-all hover:bg-[#F5F5F7] flex-shrink-0"
            >
              <Eye className="h-3 w-3" />
              Visa
            </button>
          </div>
        )}
      </div>
    )
  }

  // --- Render a group (folder) ---
  function renderGroupRow(group: GroupItem) {
    const isExpanded = expandedGroups.has(group.groupId)
    const sample = group.files[0]
    const dateLabel = sample.testDateEndStr
      ? `${sample.testDateStr} – ${sample.testDateEndStr}`
      : sample.testDateStr

    return (
      <div key={`group-${group.groupId}`} className="space-y-1">
        {/* Folder row */}
        <div
          onClick={() => toggleGroup(group.groupId)}
          className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-[#F5F5F7]/50 transition-colors"
        >
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#007AFF]">
            <Folder className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0" onClick={(e) => editingGroupId === group.groupId && e.stopPropagation()}>
            {editingGroupId === group.groupId ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  className="text-sm font-semibold border border-[#007AFF] rounded px-1.5 py-0.5 outline-none flex-1 min-w-0"
                />
                <button onClick={() => handleSaveGroupEdit(group)} className="p-1 rounded hover:bg-green-50 text-green-600">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingGroupId(null)} className="p-1 rounded hover:bg-gray-100 text-[#515154]">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#1D1D1F]">{sample.category ?? sample.resultType}</span>
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {group.files.length} filer
                </span>
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Dokument</span>
              </div>
            )}
          </div>

          <span className="flex-shrink-0 text-sm text-[#515154]">{dateLabel}</span>

          {editingGroupId !== group.groupId && (
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="relative flex-shrink-0">
                <button
                  aria-label="Fler alternativ"
                  onClick={() => setOpenMenuId(openMenuId === `group-${group.groupId}` ? null : `group-${group.groupId}`)}
                  className="p-1.5 rounded-full hover:bg-[#F5F5F7] text-[#86868B] transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {openMenuId === `group-${group.groupId}` && (
                  <div ref={openMenuRef} className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[hsl(var(--border))] z-20 min-w-[160px] overflow-hidden">
                    {archivingMenuId === `group-${group.groupId}` ? renderArchiveConfirm(() => handleArchiveFiles(group.files.map(f => f.id))) : (
                      <>
                        <button
                          onClick={() => { setEditingGroupId(group.groupId); setEditingGroupName(sample.category ?? sample.resultType); setOpenMenuId(null) }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] text-left"
                        >
                          <Pencil className="h-3.5 w-3.5 flex-shrink-0" /> Döp om mapp
                        </button>
                        <button
                          onClick={() => { setAddToGroup({ groupId: group.groupId, resultType: sample.category ?? sample.resultType, testDateStr: sample.testDateStr }); setOpenMenuId(null) }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] text-left"
                        >
                          <Plus className="h-3.5 w-3.5 flex-shrink-0" /> Lägg till filer
                        </button>
                        <div className="h-px bg-[hsl(var(--border))]" />
                        <button
                          onClick={() => setArchivingMenuId(`group-${group.groupId}`)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 text-left"
                        >
                          <Trash2 className="h-3.5 w-3.5 flex-shrink-0" /> Arkivera mapp
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div onClick={() => toggleGroup(group.groupId)} className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-xs font-semibold text-[#86868B] shadow-sm cursor-pointer hover:bg-[#F5F5F7]">
                {isExpanded ? "Stäng" : "Visa"}
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </div>
            </div>
          )}
        </div>

        {/* Expanded individual files */}
        {isExpanded && (
          <div className="space-y-1">
            {group.files.map((f) => renderSingleFileRow(f, true))}
          </div>
        )}
      </div>
    )
  }

  const isPdf = !!previewFile && (
    previewFile.fileName.toLowerCase().endsWith(".pdf") ||
    !!previewFile.storageUrl.match(/\.pdf(\?|$)/i)
  )
  const pdfPageWidth = Math.round(760 * pdfScale)

  return (
    <div className="space-y-3">
      {/* Single row: heading + filter pills + action buttons */}
      <div className="flex flex-wrap gap-1.5 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 items-center">
          <h2 className="text-lg font-semibold mr-1">Historik</h2>

          {/* Type filter pills — only shown when that type has data */}
          {[
            { label: "Alla",        kind: "all"     as const, type: "all",          show: true },
            { label: "Tröskeltest", kind: "test"    as const, type: "troskeltest",  show: tests.some((t) => t.testType === "troskeltest") },
            { label: "VO₂ max",    kind: "test"    as const, type: "vo2max",       show: tests.some((t) => t.testType === "vo2max") },
            { label: "Wingate",    kind: "test"    as const, type: "wingate",      show: tests.some((t) => t.testType === "wingate") },
            { label: "Dokument",   kind: "file"    as const, type: "all",          show: true },
            { label: "Samtycke",   kind: "consent" as const, type: "all",          show: true },
          ].filter((p) => p.show).map(({ label, kind, type }) => {
            const active = kindFilter === kind && (kind === "all" || kind === "file" || kind === "consent" || testTypeFilter === type)
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

          {/* Contextual action buttons (inline with filters) */}
          {selected.size >= 2 && (
            <button onClick={handleCompare} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <GitCompareArrows className="h-4 w-4" />
              Jämför valda ({selected.size})
            </button>
          )}
          {hasTrendData && (
            <button onClick={onToggleTrend} className={cn(buttonVariants({ variant: showTrend ? "default" : "outline", size: "sm" }))}>
              <TrendingUp className="h-4 w-4" />
              Förändring
            </button>
          )}
        </div>

        {/* Primary actions pinned to the right */}
        <div className="flex gap-1.5 items-center flex-shrink-0">
          {isAdmin && athleteName && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(v => !v)}
                disabled={exporting}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporterar…' : 'Exportera'}
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-apple-md border border-black/[0.06] py-1.5 min-w-[190px]">
                  <button
                    onClick={() => handleExport(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-[#F5F5F7] transition-colors"
                  >
                    CSV med namn
                  </button>
                  <button
                    onClick={() => handleExport(true)}
                    className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-[#F5F5F7] transition-colors"
                  >
                    CSV anonymiserad (GDPR)
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => requiresConsent && onConsentRequired ? onConsentRequired() : setShowUpload(true)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Upload className="h-4 w-4" />
            Ladda upp
          </button>
          <Link href={`/dashboard/tests/new?athlete=${athleteId}`} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" />
            Nytt test
          </Link>
        </div>
      </div>


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
          {kindFilter === "all" && testTypeFilter === "all"
            ? "Ingen historik registrerad ännu."
            : "Inget matchar filtret."}
        </p>
      ) : (
        <>
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
                  {/* Checkbox - larger click area around small checkbox */}
                  <div
                    onClick={(e) => toggle(test.id, e)}
                    className="flex-shrink-0 p-1.5 rounded cursor-pointer hover:bg-[#F5F5F7] transition-colors -m-1.5"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
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
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1D1D1F]">{testTypeLabel(test.testType)}</span>
                      <SportBadge sport={test.sport} />
                    </div>
                    <p className="text-sm text-[#515154] mt-0.5">
                      {test.inputParams.startWatt > 0 && (
                        <span>{test.inputParams.startWatt}W +{test.inputParams.stepSize}W / {test.inputParams.testDuration} min</span>
                      )}
                      {(test.results.atWatt || test.results.ltWatt) && (test.inputParams.startWatt > 0 || isSpeedSport(test.sport)) && <span> · </span>}
                      {test.results.atWatt ? `LT1: ${test.results.atWatt} ${thresholdUnit(test.sport)}` : ""}
                      {test.results.atWatt && test.results.ltWatt ? " · " : ""}
                      {test.results.ltWatt ? `LT2: ${test.results.ltWatt} ${thresholdUnit(test.sport)}` : ""}
                    </p>
                  </div>

                  <span className="flex-shrink-0 text-sm text-[#515154] mr-1">{test.testDateStr}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex-shrink-0">
                      <button
                        aria-label="Fler alternativ"
                        onClick={() => setOpenMenuId(openMenuId === `test-${test.id}` ? null : `test-${test.id}`)}
                        className="p-1.5 rounded-full hover:bg-[#F5F5F7] text-[#86868B] transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenuId === `test-${test.id}` && (
                        <div ref={openMenuRef} className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[hsl(var(--border))] z-20 min-w-[160px] overflow-hidden">
                          {archivingMenuId === `test-${test.id}` ? renderArchiveConfirm(() => handleArchiveTest(test.id)) : (
                            <>
                              <button
                                onClick={() => { router.push(`/dashboard/tests/${test.id}/edit`); setOpenMenuId(null) }}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] text-left"
                              >
                                <Pencil className="h-3.5 w-3.5 flex-shrink-0" /> Redigera
                              </button>
                              <div className="h-px bg-[hsl(var(--border))]" />
                              <button
                                onClick={(e) => { setArchivingMenuId(`test-${test.id}`) }}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 text-left"
                              >
                                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" /> Arkivera
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-xs font-semibold text-[#86868B] shadow-sm cursor-pointer hover:bg-[#F5F5F7]" onClick={() => router.push(`/dashboard/tests/${test.id}`)}>
                      <Eye className="h-3 w-3" />
                      Visa
                    </div>
                  </div>
                </div>
              )
            }

            // Consent event
            if (item.kind === "consent") {
              return renderConsentRow(item.data)
            }

            // File display item
            const fd = item.data
            if (fd.kind === "group") {
              return renderGroupRow(fd)
            }
            return renderSingleFileRow(fd.file)
          })}
        </div>
        {successMessage && (
          <div className="mt-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 font-medium">
            {successMessage}
          </div>
        )}
        </>
      )}

      {showUpload && (
        <UploadResultDialog athleteId={athleteId} onClose={() => setShowUpload(false)} onUploaded={fetchFiles} />
      )}

      {addToGroup && (
        <UploadResultDialog
          athleteId={athleteId}
          existingGroupId={addToGroup.groupId}
          initialResultType={addToGroup.resultType}
          initialDate={addToGroup.testDateStr}
          onClose={() => setAddToGroup(null)}
          onUploaded={fetchFiles}
        />
      )}

      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closePreview}
        >
          <div
            className={cn(
              "bg-white flex flex-col overflow-hidden transition-all duration-200",
              previewFullscreen
                ? "w-screen h-screen rounded-none shadow-none"
                : isExcel(previewFile.fileName)
                  ? "w-[95vw] max-w-[95vw] mx-2 rounded-2xl shadow-2xl"
                  : isPdf
                    ? "mx-4 rounded-2xl shadow-2xl"
                    : "w-full max-w-4xl mx-4 rounded-2xl shadow-2xl"
            )}
            style={previewFullscreen
              ? undefined
              : isPdf
                ? { maxHeight: "92vh", width: pdfPageWidth + 32, maxWidth: "calc(95vw - 16px)", minWidth: 320 }
                : { maxHeight: "92vh" }
            }
            onClick={(e) => e.stopPropagation()}
          >
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

                {/* "..." actions menu */}
                <div className="relative">
                  <button
                    onClick={() => setPreviewMoreOpen((o) => !o)}
                    className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#515154] transition-colors"
                    title="Fler alternativ"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {previewMoreOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPreviewMoreOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[#E5E5EA] py-1 z-20 min-w-[160px]">
                        <button
                          onClick={() => {
                            setPreviewMoreOpen(false)
                            const f = previewFile
                            closePreview()
                            setEditingFileId(f.id)
                            setEditingResultType(f.resultType)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] flex items-center gap-2"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#515154]" />
                          Döp om
                        </button>
                        <div className="px-2 py-1">
                          <DeleteFileButton
                            fileIds={[previewFile.id]}
                            athleteId={athleteId}
                            onArchived={(ids) => { handleArchived(ids); closePreview() }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setPreviewFullscreen((f) => !f)}
                  className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#515154] transition-colors"
                  title={previewFullscreen ? "Återgå till normalläge" : "Helskärm"}
                >
                  {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button aria-label="Stäng" onClick={closePreview} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#515154] transition-colors">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF zoom bar — rendered outside the scroll area so it's always visible */}
            {isPdf && (
              <div className="flex-shrink-0 flex items-center justify-center gap-1 border-b border-[#E5E5EA] bg-white px-3 py-2">
                <button
                  onClick={() => setPdfScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))}
                  disabled={pdfScale <= 0.5}
                  className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
                  title="Zooma ut"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPdfScale(1)}
                  className="px-2 py-1 text-xs font-medium text-[#515154] hover:bg-[#F5F5F7] rounded-lg transition-colors min-w-[3.5rem] text-center"
                  title="Återställ zoom"
                >
                  {Math.round(pdfScale * 100)}%
                </button>
                <button
                  onClick={() => setPdfScale(s => Math.min(3, +(s + 0.25).toFixed(2)))}
                  disabled={pdfScale >= 3}
                  className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
                  title="Zooma in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto bg-[#F5F5F7] flex flex-col" style={{ minHeight: 0 }}>
              {isPdf ? (
                <PdfViewer url={previewFile.storageUrl} pageWidth={pdfPageWidth} />
              ) : previewFile.fileName.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                <div className="flex items-center justify-center p-6 min-h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewFile.storageUrl} alt={previewFile.fileName} className="max-w-full max-h-[70vh] rounded-lg shadow" />
                </div>
              ) : isExcel(previewFile.fileName) ? (
                <div className="flex flex-col flex-1 bg-white">
                  {excelLoading && (
                    <div className="flex items-center justify-center flex-1 gap-3 text-[#515154] py-16">
                      <div className="w-5 h-5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                      Läser fil…
                    </div>
                  )}
                  {!excelLoading && excelData && (
                    <>
                      <ExcelMetaSection metaRows={excelData.metaRows} />
                      <ExcelChartSection headers={excelData.headers} rows={excelData.rows} />
                      <ExcelTableSection headers={excelData.headers} rows={excelData.rows} />
                    </>
                  )}
                  {!excelLoading && !excelData && (
                    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
                      <FileText className="w-16 h-16 text-[#86868B]" />
                      <p className="text-[#515154]">Kunde inte läsa filen.</p>
                      <a href={previewFile.storageUrl} download={previewFile.fileName} className={cn(buttonVariants())}>
                        <Download className="w-4 h-4" />
                        Ladda ned filen
                      </a>
                    </div>
                  )}
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

      {consentPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closeConsentPreview}
        >
          <div
            className="mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "92vh", width: Math.round(760 * consentPreviewScale) + 32, maxWidth: "calc(95vw - 16px)", minWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA]">
              <p className="font-semibold text-[#1D1D1F] truncate">Samtyckesregistrering</p>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <a
                  href={consentPreview.blobUrl}
                  download={consentPreview.name}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <Download className="w-4 h-4" />
                  Ladda ner
                </a>
                <button aria-label="Stäng" onClick={closeConsentPreview} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#515154] transition-colors">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center gap-1 border-b border-[#E5E5EA] bg-white px-3 py-2">
              <button
                onClick={() => setConsentPreviewScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))}
                disabled={consentPreviewScale <= 0.5}
                className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConsentPreviewScale(1)}
                className="px-2 py-1 text-xs font-medium text-[#515154] hover:bg-[#F5F5F7] rounded-lg transition-colors min-w-[3.5rem] text-center"
              >
                {Math.round(consentPreviewScale * 100)}%
              </button>
              <button
                onClick={() => setConsentPreviewScale(s => Math.min(3, +(s + 0.25).toFixed(2)))}
                disabled={consentPreviewScale >= 3}
                className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#F5F5F7]" style={{ minHeight: 0 }}>
              <PdfViewer url={consentPreview.dataUrl} pageWidth={Math.round(760 * consentPreviewScale)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
