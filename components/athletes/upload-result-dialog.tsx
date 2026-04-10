"use client"

import { useRef, useState } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { storage, db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, FileText } from "lucide-react"

const RESULT_TYPES = ["Glukosanalys", "Blodprov", "EKG", "Kroppsammansättning", "Funktionsanalys", "Annan"]

interface UploadResultDialogProps {
  athleteId: string
  onClose: () => void
  onUploaded?: () => void
}

export function UploadResultDialog({ athleteId, onClose, onUploaded }: UploadResultDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [resultType, setResultType] = useState("Glukosanalys")
  const [testDate, setTestDate] = useState("")
  const [testDateEnd, setTestDateEnd] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ACCEPTED_TYPES = [
    "application/pdf",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]

  function handleFile(f: File) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Filtypen stöds inte. Tillåtna format: PDF, JPEG, PNG, GIF, WEBP, XLS, XLSX.")
      return
    }
    setError(null)
    setFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `athletes/${athleteId}/${timestamp}-${safeName}`
      const storageRef = ref(storage, filePath)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const url = await getDownloadURL(storageRef)
      const doc: Record<string, unknown> = {
        athleteId,
        clinicId: "",
        coachId: "",
        resultType,
        testDate: new Date(testDate),
        fileName: file.name,
        storageUrl: url,
        createdAt: serverTimestamp(),
      }
      if (testDateEnd) doc.testDateEnd = new Date(testDateEnd)
      await addDoc(collection(db, "athlete_files"), doc)
      onUploaded?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel")
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Ladda upp resultat</h2>
          <button
            onClick={onClose}
            className="text-[#515154] hover:text-[#1D1D1F] transition-colors"
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
              <Label>Fil (PDF)</Label>
              <div
                ref={dropRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                  dragOver
                    ? "border-[#007AFF] bg-[#007AFF]/5"
                    : "border-[#C7C7CC] hover:border-[#007AFF] hover:bg-[#F5F5F7]/50"
                )}
              >
                {file ? (
                  <>
                    <FileText className="h-7 w-7 text-[#007AFF]" />
                    <span className="text-sm text-[#1D1D1F] font-medium text-center break-all">{file.name}</span>
                    <span className="text-xs text-[#515154]">Klicka för att byta fil</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-[#86868B]" />
                    <span className="text-sm text-[#515154]">Dra och släpp eller <span className="text-[#007AFF]">välj fil</span></span>
                    <span className="text-xs text-[#86868B]">PDF, JPEG, PNG, XLS, XLSX</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Avbryt
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Laddar upp…" : "Spara resultat"}
              </Button>
            </div>
          </form>
      </div>
    </div>
  )
}
