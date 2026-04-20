"use client"

import { useState } from "react"
import { FileDown } from "lucide-react"
import React from "react"
import type { ConsentEvent } from "@/lib/consent-events"

interface Props {
  athleteName: string
  event: ConsentEvent
}

export function ConsentReceiptDownloadButton({ athleteName, event }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const [{ pdf }, { ConsentReceiptDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./consent-receipt-pdf"),
      ])

      const ts = new Date(event.timestamp.seconds * 1000)
      const eventDate = ts.toLocaleDateString("sv-SE")
      const systemTimestamp = ts.toISOString()

      const props = {
        athleteId: event.athleteId,
        athleteName,
        athleteEmail: event.email,
        personnummer: event.personnummer,
        eventType: event.eventType,
        eventDate,
        systemTimestamp,
        coachDisplayName: event.coachDisplayName,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React.createElement(ConsentReceiptDocument, props) as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const slug = athleteName.replace(/\s+/g, "-").toLowerCase()
      const dateStr = new Date(event.timestamp.seconds * 1000).toLocaleDateString("sv-SE")
      a.href = url
      a.download = `${slug}-samtycke-${event.eventType}-${dateStr}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Consent receipt PDF generation failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-xs font-semibold text-[#86868B] shadow-sm transition-all hover:bg-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
    >
      <FileDown className="h-3 w-3" />
      {loading ? "Genererar…" : "Export PDF"}
    </button>
  )
}
