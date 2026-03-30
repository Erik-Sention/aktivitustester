"use client"

import { useState } from "react"
import { FileDown } from "lucide-react"
import type { Test } from "@/types"

// Firebase Timestamps have toJSON/toDate methods that can't cross the
// server → client component boundary in Next.js App Router.
// We accept a serialized version with plain { seconds, nanoseconds } objects.
type PlainTS = { seconds: number; nanoseconds: number }
export type SerializedTest = Omit<Test, "testDate" | "createdAt"> & {
  testDate: PlainTS
  createdAt: PlainTS
}

interface Props {
  test: SerializedTest
  athleteName: string
}

export function ReportDownloadButton({ test, athleteName }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      // Dynamic imports keep @react-pdf/renderer out of the initial bundle
      const [{ pdf }, { AktivitusReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./report-pdf"),
      ])

      const doc = <AktivitusReport test={test} athleteName={athleteName} />
      const blob = await pdf(doc).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const slug = athleteName.replace(/\s+/g, "-").toLowerCase()
      const dateStr = new Date(test.testDate.seconds * 1000).toLocaleDateString("sv-SE")
      a.href = url
      a.download = `${slug}-${dateStr}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF generation failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-semibold text-[#86868B] shadow-sm transition-all hover:bg-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FileDown className="h-3.5 w-3.5" />
      {loading ? "Genererar PDF…" : "Export PDF"}
    </button>
  )
}
