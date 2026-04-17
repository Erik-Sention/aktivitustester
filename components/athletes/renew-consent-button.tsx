"use client"

import { useState } from "react"
import { renewConsentAction } from "@/app/actions/athletes"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"

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
      <div className="space-y-1">
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
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      <ShieldCheck className="h-4 w-4" />
      Förnya samtycke
    </Button>
  )
}
