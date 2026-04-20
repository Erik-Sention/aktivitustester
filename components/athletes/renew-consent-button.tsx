"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { renewConsentAction } from "@/app/actions/athletes"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"

const ConsentDocumentModal = dynamic(
  () => import("@/components/athletes/consent-document-modal").then((m) => m.ConsentDocumentModal),
  { ssr: false }
)

export function RenewConsentButton({
  athleteId,
  onRenewed,
}: {
  athleteId: string
  onRenewed?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConsentDoc, setShowConsentDoc] = useState(false)

  async function handleRenew() {
    setLoading(true)
    setError(null)
    try {
      await renewConsentAction(athleteId)
      onRenewed?.()
    } catch {
      setError("Något gick fel. Försök igen.")
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <>
        {showConsentDoc && <ConsentDocumentModal onClose={() => setShowConsentDoc(false)} />}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowConsentDoc(true)}
            className="text-xs text-[#007AFF] hover:underline"
          >
            Läs samtyckesavtalet här
          </button>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleRenew} disabled={loading}>
              {loading ? "Sparar…" : "Bekräfta"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
              Avbryt
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      <ShieldCheck className="h-4 w-4" />
      Förnya samtycke
    </Button>
  )
}
