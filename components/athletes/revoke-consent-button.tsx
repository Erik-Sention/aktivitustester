"use client"

import { useState } from "react"
import { revokeConsentAction } from "@/app/actions/athletes"
import { Button } from "@/components/ui/button"
import { ShieldOff } from "lucide-react"

export function RevokeConsentButton({
  athleteId,
  onRevoked,
}: {
  athleteId: string
  onRevoked?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRevoke() {
    setLoading(true)
    setError(null)
    try {
      await revokeConsentAction(athleteId)
      onRevoked?.()
    } catch {
      setError("Något gick fel. Försök igen.")
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <div className="space-y-1">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="destructive" onClick={handleRevoke} disabled={loading}>
            {loading ? "Drar in…" : "Bekräfta"}
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
      <ShieldOff className="h-4 w-4" />
      Dra in samtycke
    </Button>
  )
}
