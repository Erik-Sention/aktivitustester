"use client"

import React from "react"
import { useState } from "react"
import { FileDown } from "lucide-react"
import type { Test } from "@/types"
import { getCoachProfileClient } from "@/lib/coach-profile"

type PlainTS = { seconds: number; nanoseconds: number }
export type SerializedTest = Omit<Test, "testDate" | "createdAt"> & {
  testDate: PlainTS
  createdAt: PlainTS
}

interface Props {
  test: SerializedTest
  athleteName: string
  gender?: "M" | "K" | ""
  coachId?: string
}

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

async function generatePDF(
  test: SerializedTest,
  athleteName: string,
  gender: "M" | "K" | "",
  coachId?: string
): Promise<Blob> {
  const coachProfile = coachId
    ? await getCoachProfileClient(coachId).catch(() => null)
    : null
  const coachName = coachProfile?.displayName

  // Fetch avatar as base64 so react-pdf can embed it without CORS issues
  const coachAvatarBase64 = coachProfile?.avatarUrl
    ? await fetchAsBase64(`/api/proxy-image?url=${encodeURIComponent(coachProfile.avatarUrl)}`)
    : undefined

  const [{ pdf }, { AktivitusReport }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./report-pdf"),
  ])

  const element = React.createElement(AktivitusReport, {
    test,
    athleteName,
    gender,
    coachName,
    coachAvatarUrl: coachAvatarBase64,
  })

  // pdf() expects DocumentProps but AktivitusReport renders a <Document> — cast is safe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pdf(element as any).toBlob()
}

export function ReportDownloadButton({ test, athleteName, gender = "", coachId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const blob = await generatePDF(test, athleteName, gender, coachId)
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
