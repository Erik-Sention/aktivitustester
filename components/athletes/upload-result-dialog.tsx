"use client"

import { useRef, useState, useEffect } from "react"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { storage, db, auth } from "@/lib/firebase"
import { getCoachProfileClient } from "@/lib/coach-profile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, FileText, Sparkles } from "lucide-react"
import { BodyCompositionParseView } from "./body-composition-parse-view"
import type { BodyCompositionData } from "@/types"

async function fetchAsBase64(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

const RESULT_TYPES = ["Glukosanalys", "Blodprov", "EKG", "Kroppsammansättning", "Funktionsanalys", "Annan"]

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
]

interface UploadResultDialogProps {
  athleteId: string
  athleteName?: string
  onClose: () => void
  onUploaded?: () => void
  /** If set, new files are added to this existing group instead of creating a new one */
  existingGroupId?: string
  /** Pre-select a result type (used when adding to an existing group) */
  initialResultType?: string
  /** Pre-fill the date field */
  initialDate?: string
  /** Locks category to "Arkiv" and pre-fills date to 2000-01-01 (used for pre-consent athletes) */
  archiveOnly?: boolean
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function uploadFileWithProgress(
  file: File,
  filePath: string,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, filePath)
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type })
    task.on(
      "state_changed",
      (snap) => onProgress(snap.bytesTransferred / snap.totalBytes),
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

export function UploadResultDialog({
  athleteId,
  athleteName = "",
  onClose,
  onUploaded,
  existingGroupId,
  initialResultType,
  initialDate,
  archiveOnly,
}: UploadResultDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const customTypeRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const isKnownType = initialResultType ? RESULT_TYPES.includes(initialResultType) : false
  const [resultType, setResultType] = useState(
    archiveOnly ? "Arkiv"
    : isKnownType ? initialResultType!
    : initialResultType ? "Annan"
    : "Glukosanalys"
  )
  const [customResultType, setCustomResultType] = useState(!isKnownType && initialResultType ? initialResultType : "")
  const [testDate, setTestDate] = useState(initialDate ?? (archiveOnly ? "2000-01-01" : ""))
  const [testDateEnd, setTestDateEnd] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [fileDisplayNames, setFileDisplayNames] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // step: 'form' = normal upload form, 'parse' = side-by-side body composition view
  const [step, setStep] = useState<"form" | "parse">("form")

  // True when Kroppsammansättning is selected and the first file is a PDF
  const isBodyCompPdf =
    resultType === "Kroppsammansättning" &&
    files.length > 0 &&
    files[0].type === "application/pdf"

  useEffect(() => {
    if (resultType === "Annan") {
      customTypeRef.current?.focus()
    }
  }, [resultType])

  function validateAndAddFiles(newFiles: File[]) {
    const invalid = newFiles.filter((f) => !ACCEPTED_TYPES.includes(f.type))
    if (invalid.length > 0) {
      setError(`Filtypen stöds inte: ${invalid.map((f) => f.name).join(", ")}. Tillåtna format: PDF, JPEG, PNG, GIF, WEBP, XLS, XLSX.`)
      return
    }
    setError(null)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`))
      const unique = newFiles.filter((f) => !existing.has(`${f.name}-${f.size}`))
      setFileDisplayNames((dn) => [...dn, ...unique.map(() => "")])
      return [...prev, ...unique]
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    validateAndAddFiles(Array.from(e.dataTransfer.files))
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setFileDisplayNames((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (files.length === 0) return
    const effectiveType = resultType === "Annan" ? customResultType.trim() : resultType
    if (!effectiveType) return

    setLoading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const uploadGroupId = existingGroupId ?? crypto.randomUUID()
      const perFileProgress: number[] = files.map(() => 0)

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const filePath = `athletes/${athleteId}/uploads/${uploadGroupId}/${safeName}`

        const url = await uploadFileWithProgress(file, filePath, (pct) => {
          perFileProgress[i] = pct
          const overall = perFileProgress.reduce((sum, p) => sum + p, 0) / files.length
          setUploadProgress(Math.round(overall * 100))
        })

        const docData: Record<string, unknown> = {
          athleteId,
          clinicId: "",
          coachId: "",
          resultType: fileDisplayNames[i]?.trim() || file.name,
          category: effectiveType,
          testDate: new Date(testDate),
          fileName: file.name,
          storageUrl: url,
          uploadGroupId,
          createdAt: serverTimestamp(),
          isArchived: false,
        }
        if (testDateEnd) docData.testDateEnd = new Date(testDateEnd)
        await addDoc(collection(db, "athlete_files"), docData)
      }

      setUploadProgress(100)
      onUploaded?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel")
      setLoading(false)
    }
  }

  async function handleBodyCompSave(data: BodyCompositionData) {
    const originalFile = files[0]
    const uploadGroupId = existingGroupId ?? crypto.randomUUID()
    const category = "Kroppsammansättning"

    setLoading(true)
    setError(null)

    // 1. Upload original PDF
    const safeName = originalFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const originalPath = `athletes/${athleteId}/uploads/${uploadGroupId}/${safeName}`
    const originalUrl = await uploadFileWithProgress(originalFile, originalPath, () => {})

    await addDoc(collection(db, "athlete_files"), {
      athleteId,
      clinicId: "",
      coachId: "",
      resultType: originalFile.name,
      category,
      testDate: new Date(data.measuredAt),
      fileName: originalFile.name,
      storageUrl: originalUrl,
      uploadGroupId,
      createdAt: serverTimestamp(),
      isArchived: false,
    })

    // 2. Generate Aktivitus PDF
    const uid = auth.currentUser?.uid
    const coachProfile = uid ? await getCoachProfileClient(uid).catch(() => null) : null
    const coachName = coachProfile?.displayName ?? undefined
    const coachAvatarUrl = coachProfile?.avatarUrl
      ? await fetchAsBase64(`/api/proxy-image?url=${encodeURIComponent(coachProfile.avatarUrl)}`)
      : undefined

    const [{ pdf }, { BodyCompositionReport }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./body-composition-report-pdf"),
    ])
    const React = (await import("react")).default
    const element = React.createElement(BodyCompositionReport, { data, athleteName, coachName, coachAvatarUrl })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob: Blob = await pdf(element as any).toBlob()

    // 3. Upload Aktivitus PDF
    const aktivitusFileName = `aktivitus-kroppssammansattning-${data.measuredAt}.pdf`
    const aktivitusFile = new File([blob], aktivitusFileName, { type: "application/pdf" })
    const aktivitusPath = `athletes/${athleteId}/uploads/${uploadGroupId}/${aktivitusFileName}`
    const aktivitusUrl = await uploadFileWithProgress(aktivitusFile, aktivitusPath, () => {})

    await addDoc(collection(db, "athlete_files"), {
      athleteId,
      clinicId: "",
      coachId: "",
      resultType: aktivitusFileName,
      category,
      testDate: new Date(data.measuredAt),
      fileName: aktivitusFileName,
      storageUrl: aktivitusUrl,
      uploadGroupId,
      createdAt: serverTimestamp(),
      isArchived: false,
    })

    onUploaded?.()
    onClose()
  }

  const isAnnan = resultType === "Annan"
  const effectiveType = isAnnan ? customResultType.trim() : resultType
  const canSubmit = !loading && files.length > 0 && !!testDate && !!effectiveType

  // ── Parse step (full-width modal) ─────────────────────────────────────────
  if (step === "parse") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
      >
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA]">
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">Generera Aktivitusrapport</h2>
              <p className="text-xs text-[#86868B] mt-0.5">Kontrollera de inlästa värdena mot originalet och spara</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-[#515154] hover:text-[#1D1D1F] transition-colors disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <BodyCompositionParseView
              file={files[0]}
              initialDate={testDate}
              onSave={handleBodyCompSave}
              onCancel={() => setStep("form")}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Normal form step ───────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Ladda upp resultat</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#515154] hover:text-[#1D1D1F] transition-colors disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Result type */}
          {!archiveOnly && (
            <div className="space-y-1.5">
              <Label>Typ av resultat</Label>
              <div className="flex flex-wrap gap-2">
                {RESULT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setResultType(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      resultType === type
                        ? "bg-[#0071BA] border-[#0071BA] text-white"
                        : "bg-white border-[#C7C7CC] text-[#1D1D1F] hover:border-[#0071BA]"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {isAnnan && (
                <div className="pt-1">
                  <input
                    ref={customTypeRef}
                    type="text"
                    placeholder="Ange eget namn på kategorin…"
                    value={customResultType}
                    onChange={(e) => setCustomResultType(e.target.value)}
                    required
                    className="flex h-12 w-full rounded-xl bg-[hsl(var(--input))] px-4 py-3 text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#0071BA]/30 focus:bg-white transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="testDate">Datum</Label>
              <input
                id="testDate"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
                min={archiveOnly ? "2000-01-01" : undefined}
                className="flex h-12 w-full rounded-xl bg-[hsl(var(--input))] px-4 py-3 text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#0071BA]/30 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="testDateEnd">Till datum <span className="text-[#86868B] font-normal">(valfritt)</span></Label>
              <input
                id="testDateEnd"
                type="date"
                value={testDateEnd}
                onChange={(e) => setTestDateEnd(e.target.value)}
                min={testDate || undefined}
                className="flex h-12 w-full rounded-xl bg-[hsl(var(--input))] px-4 py-3 text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#0071BA]/30 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Drag-and-drop zone */}
          <div className="space-y-1.5">
            <Label>Filer</Label>
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                dragOver
                  ? "border-[#0071BA] bg-[#0071BA]/5"
                  : "border-[#C7C7CC] hover:border-[#0071BA] hover:bg-[#F5F5F7]/50"
              )}
            >
              <Upload className="h-6 w-6 text-[#86868B]" />
              <span className="text-sm text-[#515154]">
                Dra och släpp eller <span className="text-[#0071BA]">välj filer</span>
              </span>
              <span className="text-xs text-[#86868B]">PDF, JPEG, PNG, XLS, XLSX, XLSM — flera filer tillåtna</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,.xlsm"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  validateAndAddFiles(Array.from(e.target.files))
                }
                e.target.value = ""
              }}
            />

            {files.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${file.size}-${i}`}
                    className="flex items-center gap-2 bg-[#F5F5F7] rounded-xl px-3 py-2"
                  >
                    <FileText className="h-4 w-4 text-[#515154] flex-shrink-0" />
                    <span className="text-xs text-[#515154] w-28 min-w-0 truncate flex-shrink-0" title={file.name}>{file.name}</span>
                    <input
                      type="text"
                      placeholder={file.name}
                      value={fileDisplayNames[i] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value
                        setFileDisplayNames((prev) => prev.map((v, j) => j === i ? val : v))
                      }}
                      disabled={loading}
                      className="flex-1 min-w-0 bg-white rounded-lg border border-[#C7C7CC] px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0071BA] disabled:opacity-40 placeholder:text-[#C7C7CC]"
                    />
                    <span className="text-xs text-[#86868B] flex-shrink-0">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={loading}
                      className="flex-shrink-0 text-[#86868B] hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Progress bar */}
          {loading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#515154]">
                <span>Laddar upp {files.length} {files.length === 1 ? "fil" : "filer"}…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0071BA] rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Action buttons */}
          {isBodyCompPdf && !loading ? (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!testDate) { setError("Välj datum innan du fortsätter"); return }
                  setError(null)
                  setStep("parse")
                }}
                disabled={!testDate}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0071BA] text-white font-semibold py-3 text-sm hover:bg-[#005fa0] transition-colors disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                Generera Aktivitusrapport
              </button>
              <Button type="submit" variant="outline" className="w-full" disabled={!canSubmit}>
                Spara original
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                Avbryt
              </Button>
              <Button type="submit" className="flex-1" disabled={!canSubmit}>
                {loading ? `Laddar upp… ${uploadProgress}%` : `Spara ${files.length > 1 ? `${files.length} filer` : "resultat"}`}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
