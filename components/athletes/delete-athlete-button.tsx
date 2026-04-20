"use client"

import { useState } from "react"
import { deleteAthleteAction } from "@/app/actions/athletes"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteAthleteButton({ athleteId }: { athleteId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await deleteAthleteAction(athleteId, reason)
  }

  function handleCancel() {
    setConfirming(false)
    setReason("")
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 50))}
            placeholder="Orsak till arkivering…"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-10"
            autoFocus
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {reason.length}/50
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || reason.trim().length === 0}
          >
            {loading ? "Arkiverar…" : "Bekräfta arkivering"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Avbryt
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      <Trash2 className="h-4 w-4" />
      Arkivera
    </Button>
  )
}
