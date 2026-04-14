"use client"

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

const A4_W_MM = 210
const A4_H_MM = 297
const SCREEN_W_PX = 794   // component width = A4 at 96 dpi
const CANVAS_SCALE = 2    // html2canvas scale

// ─── Smart page cut points ────────────────────────────────────────────────────
// Returns cut Y positions in *screen px* (before canvas scale).
// Tries to place each cut in the gap between block elements, searching up to
// half a page away from the ideal cut to avoid splitting tables / charts.
function findCutPoints(
  container: HTMLElement,
  pageHeightScreenPx: number,
  totalScreenHeight: number
): number[] {
  const containerRect = container.getBoundingClientRect()

  // Collect vertical gaps between adjacent block-level children of the print root
  const root = container.querySelector("[data-print-root]") as HTMLElement ?? container
  const children = Array.from(root.children) as HTMLElement[]
  const gaps: { y: number }[] = []
  for (let i = 0; i < children.length - 1; i++) {
    const a = children[i].getBoundingClientRect()
    const b = children[i + 1].getBoundingClientRect()
    const gapY = ((a.bottom + b.top) / 2) - containerRect.top
    gaps.push({ y: gapY })
  }
  // Also add gaps between table rows
  const rows = Array.from(container.querySelectorAll("tbody tr")) as HTMLElement[]
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i].getBoundingClientRect()
    const b = rows[i + 1].getBoundingClientRect()
    const gapY = ((a.bottom + b.top) / 2) - containerRect.top
    gaps.push({ y: gapY })
  }
  gaps.sort((a, b) => a.y - b.y)

  const cuts: number[] = []
  let searchFrom = 0

  while (true) {
    const idealCut = (cuts.length + 1) * pageHeightScreenPx
    if (idealCut >= totalScreenHeight) break

    // Search for a gap within ±50% of page height from idealCut
    const searchRange = pageHeightScreenPx * 0.5
    let bestGap = idealCut  // fallback: hard cut at ideal
    let bestDist = Infinity

    for (const gap of gaps) {
      if (gap.y <= searchFrom + 10) continue  // skip gaps before previous cut
      const dist = Math.abs(gap.y - idealCut)
      if (dist < searchRange && dist < bestDist) {
        bestDist = dist
        bestGap = gap.y
      }
    }

    cuts.push(Math.round(bestGap))
    searchFrom = Math.round(bestGap)
  }

  return cuts
}

// ─── Main PDF generation ─────────────────────────────────────────────────────
async function generatePDF(
  test: SerializedTest,
  athleteName: string,
  gender: "M" | "K" | "",
  coachId?: string
): Promise<Blob> {
  const coachProfile = coachId ? await getCoachProfileClient(coachId).catch(() => null) : null
  const coachName = coachProfile?.displayName
  // Proxy the avatar through our API route to avoid CORS issues in html2canvas
  const coachAvatarUrl = coachProfile?.avatarUrl
    ? `/api/proxy-image?url=${encodeURIComponent(coachProfile.avatarUrl)}`
    : undefined
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  // 1. Mount hidden container
  const container = document.createElement("div")
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;width:794px;pointer-events:none;z-index:-1;background:#F5F5F7;"
  document.body.appendChild(container)

  // 2. Render print layout
  const { createRoot } = await import("react-dom/client")
  const { TestPrintLayout } = await import("./test-print-layout")
  const root = createRoot(container)
  root.render(
    // @ts-ignore — JSX in async function
    <TestPrintLayout test={test} athleteName={athleteName} gender={gender} coachName={coachName} coachAvatarUrl={coachAvatarUrl} />
  )

  // 3. Wait for fonts + Recharts to finish rendering
  await document.fonts.ready
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  await new Promise<void>((r) => setTimeout(r, 1200))

  // 4. Measure DOM before capture (for text overlay coordinates)
  const containerScreenHeight = container.scrollHeight

  // 5. Compute ideal page height in screen px
  const pageHeightScreenPx = Math.round(SCREEN_W_PX * (A4_H_MM / A4_W_MM))   // ≈ 1123 px

  // 6. Find smart cut points (screen px) avoiding mid-element breaks
  const cutsScreenPx = findCutPoints(container, pageHeightScreenPx, containerScreenHeight)
  const totalPages = cutsScreenPx.length + 1

  // 7. Capture canvas at 2× scale
  // windowWidth >= 1024 ensures Tailwind lg: breakpoints fire (chart uses hidden lg:block)
  const canvas = await html2canvas(container, {
    scale: CANVAS_SCALE,
    useCORS: true,
    allowTaint: true,
    logging: false,
    windowWidth: 1280,
    backgroundColor: "#F5F5F7",
  })

  // 8. Convert cut points from screen px → canvas px
  const cutsCanvasPx = cutsScreenPx.map((y) => Math.round(y * CANVAS_SCALE))
  // Full boundary list in canvas px
  const canvasBoundaries = [0, ...cutsCanvasPx, canvas.height]

  // 9. Build PDF — one page per slice
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true })

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage()

    const srcY = canvasBoundaries[p]
    const srcH = canvasBoundaries[p + 1] - canvasBoundaries[p]

    const slice = document.createElement("canvas")
    slice.width = canvas.width
    slice.height = srcH
    const ctx = slice.getContext("2d")!
    ctx.fillStyle = "#F5F5F7"
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

    doc.addImage(slice.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, A4_W_MM, A4_H_MM)
  }

  // 10. Clean up
  root.unmount()
  container.remove()

  return doc.output("blob")
}

// ─── Button ───────────────────────────────────────────────────────────────────
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
