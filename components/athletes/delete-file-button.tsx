"use client"

import { useState } from "react"
import { archiveAthleteFilesAction } from "@/app/actions/athlete-files"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteFileButtonProps {
  fileIds: string[]
  athleteId: string
  onArchived: (fileIds: string[]) => void
}

export function DeleteFileButton({ fileIds, athleteId, onArchived }: DeleteFileButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    await archiveAthleteFilesAction(fileIds, athleteId, reason)
    onArchived(fileIds)
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(false)
    setReason("")
  }

  if (confirming) {
    return (
      <div
        className="flex flex-col gap-1.5 p-2 rounded-xl border border-border bg-white shadow-sm z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 50))}
            placeholder="Orsak till arkivering…"
            className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-10"
            autoFocus
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {reason.length}/50
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleArchive}
            disabled={loading || reason.trim().length === 0}
          >
            {loading ? "Arkiverar…" : "Bekräfta"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Avbryt
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      aria-label="Arkivera"
      onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
