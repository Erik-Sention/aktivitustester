"use client"

import { useState, useEffect, useRef } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { ZoomIn, ZoomOut } from "lucide-react"

// CDN worker — undviker Turbopack-bundlingsproblem med new URL()
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    let objectUrl: string
    setBlobUrl(null)
    setError(null)
    setNumPages(0)
    setScale(1)
    fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.blob() })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setBlobUrl(objectUrl) })
      .catch(() => setError("Kunde inte ladda PDF"))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [url])

  // containerRef is on the overflow-x-auto div — contentRect.width stays stable
  // even when content overflows horizontally
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-[#86868B]">{error}</div>
    )
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
      </div>
    )
  }

  const pageWidth = Math.round(containerWidth * scale)

  return (
    <div className="w-full flex flex-col">
      {/* Zoom toolbar — sticky so it stays visible while scrolling through pages */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-1 bg-white/95 backdrop-blur-sm border-b border-[#E5E5EA] px-3 py-2 flex-shrink-0">
        <button
          onClick={() => setScale(s => Math.max(ZOOM_MIN, +(s - ZOOM_STEP).toFixed(2)))}
          disabled={scale <= ZOOM_MIN}
          className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
          title="Zooma ut"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale(1)}
          className="px-2 py-1 text-xs font-medium text-[#515154] hover:bg-[#F5F5F7] rounded-lg transition-colors min-w-[3.5rem] text-center"
          title="Återställ zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale(s => Math.min(ZOOM_MAX, +(s + ZOOM_STEP).toFixed(2)))}
          disabled={scale >= ZOOM_MAX}
          className="p-1.5 rounded-lg text-[#515154] hover:bg-[#F5F5F7] disabled:opacity-30 transition-colors"
          title="Zooma in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* containerRef measures the stable viewport width.
          Inner div uses minWidth: pageWidth so it grows when zoomed,
          enabling overflow-x-auto to scroll. items-center keeps pages
          centered when zoomed out (scale < 1). */}
      <div ref={containerRef} className="overflow-x-auto bg-[#F5F5F7]">
        <div
          className="flex flex-col items-center py-4 gap-4"
          style={{ minWidth: pageWidth }}
        >
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError("Kunde inte läsa PDF")}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i + 1} className="shadow-md overflow-hidden">
                <Page pageNumber={i + 1} width={pageWidth} />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  )
}
