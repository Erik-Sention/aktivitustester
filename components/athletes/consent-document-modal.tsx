"use client"

import { useState } from "react"
import { FileDown, X } from "lucide-react"
import React from "react"

async function downloadConsentDocument() {
  const [{ pdf }, { ConsentDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./consent-document-pdf"),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(React.createElement(ConsentDocument) as any).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `aktivitus-samtyckesavtal.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  onClose: () => void
}

export function ConsentDocumentModal({ onClose }: Props) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadConsentDocument()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <h3 className="text-base font-semibold text-primary">
            Samtycke till behandling av hälsouppgifter
          </h3>
          <button
            onClick={onClose}
            className="text-[#86868B] hover:text-primary transition-colors"
            aria-label="Stäng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 text-sm text-[#1D1D1F] max-h-[60vh] overflow-y-auto">
          <p className="text-[#515154] leading-relaxed">
            Genom att lämna ditt samtycke godkänner du att{" "}
            <span className="font-medium text-primary">Aktivitus AB</span> behandlar dina personuppgifter, inklusive hälsodata (testresultat, puls, laktatvärden m.m.), i syfte att:
          </p>

          <ul className="space-y-2">
            {[
              "Genomföra och dokumentera fysiologiska tester",
              "Optimera din träning och följa din utveckling över tid",
              "Skapa personliga träningsprogram och rapporter",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[#515154]">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0071BA] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <div className="space-y-1">
            <p className="font-semibold text-primary">Lagring av uppgifter</p>
            <p className="text-[#515154] leading-relaxed">
              Dina uppgifter lagras säkert i vårt system så länge du är kund hos oss eller tills du återkallar ditt samtycke. Vi förbehåller oss rätten att lagra testdata anonymiserat på obestämd tid efter avslutat kundförhållande.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-primary">Dina rättigheter</p>
            <p className="text-[#515154] leading-relaxed">
              Du har rätt att när som helst begära utdrag av din data, få uppgifter rättade eller begära radering ("rätten att bli glömd").
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-primary">Återkallelse</p>
            <p className="text-[#515154] leading-relaxed">
              Du kan när som helst dra tillbaka ditt samtycke genom att kontakta din coach. Ett återkallande påverkar inte lagligheten av behandling som skett innan återkallelsen.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--border))] bg-[#F5F5F7] gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 text-sm text-[#515154] hover:text-primary transition-colors disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {downloading ? "Genererar PDF…" : "Ladda ner PDF"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}
