"use client"

import { useRef, useState, useEffect } from "react"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { storage, db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, FileText } from "lucide-react"

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
  onClose: () => void
  onUploaded?: () => void
  /** If set, new files are added to this existing group instead of creating a new one */
  existingGroupId?: string
  /** Pre-select a result type (used when adding to an existing group) */
  initialResultType?: string
  /** Pre-fill the date field */
  initialDate?: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadResultDialog({ athleteId, onClose, onUploaded, existingGroupId, initialResultType, initialDate }: UploadResultDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const customTypeRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const isKnownType = initialResultType ? RESULT_TYPES.includes(initialResultType) : false
  const [resultType, setResultType] = useState(isKnownType ? initialResultType! : initialResultType ? "Annan" : "Glukosanalys")
  const [customResultType, setCustomResultType] = useState(!isKnownType && initialResultType ? initialResultType : "")
  const [testDate, setTestDate] = useState(initialDate ?? "")
  const [testDateEnd, setTestDateEnd] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [fileDisplayNames, setFileDisplayNames] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Auto-focus custom type field when "Annan" is selected
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
      // Avoid exact duplicates by name+size
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

  const isAnnan = resultType === "Annan"
  const effectiveType = isAnnan ? customResultType.trim() : resultType
  const canSubmit = !loading && files.length > 0 && !!testDate && !!effectiveType

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
                      ? "bg-[#007AFF] border-[#007AFF] text-white"
                      : "bg-white border-[#C7C7CC] text-[#1D1D1F] hover:border-[#007AFF]"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* "Annan" custom name field */}
            {isAnnan && (
              <div className="pt-1">
                <input
                  ref={customTypeRef}
                  type="text"
                  placeholder="Ange eget namn på kategorin…"
                  value={customResultType}
                  onChange={(e) => setCustomResultType(e.target.value)}
                  required
                  className="flex h-12 w-full rounded-xl bg-[hsl(var(--input))] px-4 py-3 text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:bg-white transition-all"
                />
              </div>
            )}
          </div>

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
                className="flex h-12 w-full rounded-xl bg-[hsl(var(--input))] px-4 py-3 text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:bg-white transition-all"
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
                className="flex h-12 w-full rounded-xl bg-[hsl(var(--input))] px-4 py-3 text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:bg-white transition-all"
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
                  ? "border-[#007AFF] bg-[#007AFF]/5"
                  : "border-[#C7C7CC] hover:border-[#007AFF] hover:bg-[#F5F5F7]/50"
              )}
            >
              <Upload className="h-6 w-6 text-[#86868B]" />
              <span className="text-sm text-[#515154]">
                Dra och släpp eller <span className="text-[#007AFF]">välj filer</span>
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
                // Reset so same file can be re-selected
                e.target.value = ""
              }}
            />

            {/* Selected files list */}
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
                      className="flex-1 min-w-0 bg-white rounded-lg border border-[#C7C7CC] px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] disabled:opacity-40 placeholder:text-[#C7C7CC]"
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
                  className="h-full bg-[#007AFF] rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Avbryt
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {loading ? `Laddar upp… ${uploadProgress}%` : `Spara ${files.length > 1 ? `${files.length} filer` : "resultat"}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
