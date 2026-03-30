"use client"

import { useState } from "react"
import { deleteAthleteAction } from "@/app/actions/athletes"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteAthleteButton({ athleteId }: { athleteId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await deleteAthleteAction(athleteId)
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
          {loading ? "Raderar…" : "Bekräfta radering"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Avbryt
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      <Trash2 className="h-4 w-4" />
      Radera
    </Button>
  )
}
