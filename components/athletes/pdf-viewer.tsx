"use client"

import { useState, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// CDN worker — undviker Turbopack-bundlingsproblem med new URL()
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export interface PdfViewerProps {
  url: string
  pageWidth: number  // controlled by parent; parent modal grows to match
}

export function PdfViewer({ url, pageWidth }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string
    setBlobUrl(null)
    setError(null)
    setNumPages(0)
    fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.blob() })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setBlobUrl(objectUrl) })
      .catch(() => setError("Kunde inte ladda PDF"))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [url])

  return (
    // flex-1 min-h-0: fills the content wrapper height.
    // overflow-auto: owns both X and Y scrolling so the scrollbar
    // sits at the visible viewport edge, not buried under all pages.
    <div className="flex-1 min-h-0 overflow-auto bg-[#F5F5F7]">
      {error && (
        <div className="flex items-center justify-center p-8 text-sm text-[#86868B]">{error}</div>
      )}
      {!blobUrl && !error && (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
        </div>
      )}
      {blobUrl && (
        // minWidth: pageWidth forces the inner div wider than the scroll
        // container when zoomed, triggering overflow-auto horizontal scroll.
        // items-center keeps pages centred when scale < 1.
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
      )}
    </div>
  )
}
