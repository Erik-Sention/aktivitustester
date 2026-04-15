"use client"

import { useState, useEffect, useRef } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// CDN worker — undviker Turbopack-bundlingsproblem med new URL()
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    let objectUrl: string
    setBlobUrl(null)
    setError(null)
    fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.blob() })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setBlobUrl(objectUrl) })
      .catch(() => setError("Kunde inte ladda PDF"))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [url])

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

  return (
    <div ref={containerRef} className="w-full bg-[#F5F5F7]">
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
          <Page
            key={i + 1}
            pageNumber={i + 1}
            width={containerWidth}
            className={i < numPages - 1 ? "border-b border-[#E5E5EA]" : undefined}
          />
        ))}
      </Document>
    </div>
  )
}
