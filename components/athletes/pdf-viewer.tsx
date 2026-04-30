"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

export interface PdfViewerProps {
  url: string
  pageWidth: number  // controlled by parent; parent modal grows to match
}

export function PdfViewer({ url, pageWidth }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState("")

  if (loadedUrl !== url) {
    setLoadedUrl(url)
    setNumPages(0)
    setError(null)
  }

  // data: URLs are self-contained strings the worker reads inline — no proxy needed
  // blob: and data: URLs are self-contained — no proxy needed
  const fileSource = url.startsWith("data:") || url.startsWith("blob:")
    ? url
    : `/api/proxy-image?url=${encodeURIComponent(url)}`

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F5F5F7]">
      {error && (
        <div className="flex items-center justify-center p-8 text-sm text-[#86868B]">{error}</div>
      )}
      {!error && (
        // minWidth: pageWidth forces the inner div wider than the scroll
        // container when zoomed, triggering overflow-auto horizontal scroll.
        // items-center keeps pages centred when scale < 1.
        <div
          className="flex flex-col items-center py-4 gap-4"
          style={{ minWidth: pageWidth }}
        >
          <Document
            file={fileSource}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError("Kunde inte läsa PDF")}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 rounded-full border-2 border-[#0071BA] border-t-transparent animate-spin" />
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
